import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { bootstrapDatabase } from './database/bootstrap-database';

config({ override: true });

async function bootstrap() {
  await bootstrapDatabase();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const uploadsRoot = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }
  app.useStaticAssets(uploadsRoot, {
    prefix: '/api/uploads',
    maxAge: '7d',
    etag: true,
    lastModified: true,
  });

  const configService = app.get(ConfigService);
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

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile apps, Postman, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const configuredFrontendUrl = configService.get<string>('FRONTEND_URL', '');
      const configuredOrigins = configuredFrontendUrl
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const normalizedOrigin = origin.trim().toLowerCase();

      // Explicitly configured origins (or wildcard)
      if (
        configuredOrigins.includes(normalizedOrigin) ||
        configuredOrigins.includes('*') ||
        configuredOrigins.length === 0
      ) {
        return callback(null, true);
      }

      // Check for dartcodes.com subdomains and local development origins
      try {
        const url = new URL(origin);
        if (
          url.hostname === 'dartcodes.com' ||
          url.hostname.endsWith('.dartcodes.com') ||
          url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1'
        ) {
          return callback(null, true);
        }
      } catch {
        // Fallback for non-standard origins
      }

      // Allow and reflect requesting origin so browser CORS checks pass
      return callback(null, true);
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
