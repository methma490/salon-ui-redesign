import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 1. Check for Prisma / PostgreSQL duplicate email unique constraint violations
    const exceptionAny = exception as any;
    const isPrismaP2002 = exceptionAny?.code === 'P2002';
    const isPg23505 = exceptionAny?.code === '23505';

    if (isPrismaP2002 || isPg23505) {
      const errorContext = `${JSON.stringify(exceptionAny?.meta || '')} ${exceptionAny?.message || ''} ${exceptionAny?.detail || ''}`.toLowerCase();
      if (errorContext.includes('email')) {
        this.logger.warn(
          `[${request.method}] ${request.url} - Duplicate email collision intercepted. Returning normalized 409.`,
        );
        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          code: 'EMAIL_ALREADY_IN_USE',
          message: 'This email is already in use.',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message =
      exception instanceof HttpException
        ? typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as any).message || exception.message
          : exceptionResponse
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    let code =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? (exceptionResponse as any).code
        : undefined;

    // 2. Normalize duplicate email ConflictExceptions to standard format
    const isEmailConflict =
      code === 'EMAIL_ALREADY_IN_USE' ||
      (status === HttpStatus.CONFLICT &&
        typeof message === 'string' &&
        (message.toLowerCase().includes('email') &&
          (message.toLowerCase().includes('already') || message.toLowerCase().includes('exists'))));

    if (isEmailConflict) {
      status = HttpStatus.CONFLICT;
      code = 'EMAIL_ALREADY_IN_USE';
      message = 'This email is already in use.';
    }

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - Status ${status} - Error: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      // In production, prevent leaking internal database / server error messages
      if (process.env.NODE_ENV === 'production') {
        message = 'Internal server error';
      }
    } else if (status === HttpStatus.UNAUTHORIZED && request.url.includes('/auth/refresh')) {
      this.logger.debug?.(`[${request.method}] ${request.url} - Status 401 (guest visitor / session unauthenticated)`);
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - Status ${status} - ${Array.isArray(message) ? message.join(', ') : message}`,
      );
    }

    const jsonResponse: Record<string, any> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };

    if (code) {
      jsonResponse.code = code;
    }

    response.status(status).json(jsonResponse);
  }
}
