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

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      exception instanceof HttpException
        ? typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as any).message || exception.message
          : exceptionResponse
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - Status ${status} - Error: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status === HttpStatus.UNAUTHORIZED && request.url.includes('/auth/refresh')) {
      // Guest visitor session check — quiet notice
      this.logger.debug?.(`[${request.method}] ${request.url} - Status 401 (guest visitor / session unauthenticated)`);
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - Status ${status} - ${message}`,
      );
    }

    const isDev = process.env.NODE_ENV !== 'production';

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(isDev && exception instanceof Error ? { stack: exception.stack } : {}),
    });
  }
}
