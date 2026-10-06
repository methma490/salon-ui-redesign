import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { bootstrapDatabase } from './database/bootstrap-database';

config({ override: true });

async function bootstrap() {
  await bootstrapDatabase();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  // 1. HTTP Security Headers (Helmet)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'", 'https:', 'wss:'],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use(cookieParser());

  // Ensure upload directory structure exists
  const uploadsRoot = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }

  const port = configService.get<number>('PORT', 3000);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // 2. Hardened CORS Configuration
  const configuredFrontendUrl = configService.get<string>('FRONTEND_URL', '');
  const configuredAllowedOrigins = configService.get<string>('ALLOWED_ORIGINS', '');

  const trustedOrigins = [
    ...configuredFrontendUrl.split(','),
    ...configuredAllowedOrigins.split(','),
  ]
    .map((s) => s.trim().toLowerCase().replace(/\/+$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile apps, server-to-server, PayHere IPN webhooks)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().toLowerCase().replace(/\/+$/, '');

      // Check against explicit whitelist
      if (trustedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Check trusted domain patterns
      try {
        const url = new URL(origin);
        const hostname = url.hostname.toLowerCase();

        if (
          hostname === 'dartcodes.com' ||
          hostname.endsWith('.dartcodes.com')
        ) {
          return callback(null, true);
        }

        // Local development origins allowed only in non-production
        if (!isProduction) {
          if (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.endsWith('.localhost')
          ) {
            return callback(null, true);
          }
        }
      } catch {
        // Fall through to rejection
      }

      // Reject unknown origins in production (no origin reflection)
      if (isProduction) {
        return callback(new Error('Origin not allowed by CORS policy'), false);
      }

      // In development, log and allow only if no whitelist is configured
      if (trustedOrigins.length === 0) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS policy'), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
      'X-Tenant-Id',
      'Origin',
    ],
    exposedHeaders: ['Content-Disposition'],
  });

  await app.listen(port);
}

bootstrap();
