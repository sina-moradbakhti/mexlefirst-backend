import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import rateLimit from 'express-rate-limit';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const environment = configService.get<string>('NODE_ENV') || 'development';

  console.log(`Application running in ${environment} mode`);

  // Global pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Serve static files
  const uploadDir = configService.get<string>('UPLOAD_DIR') || 'uploads';
  const staticPath = environment === 'production'
    ? join(__dirname, '../../../', uploadDir)
    : join(__dirname, '..', uploadDir);

  app.useStaticAssets(staticPath, {
    prefix: '/uploads/',
    setHeaders: (res, path, stat) => {
      // Set proper headers for static files
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    }
  });

  /* Enable CSRF */
  // app.use(cookieParser());
  // app.use(csurf({ cookie: { sameSite: true } }));
  /* Security Headers */
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' https://app.mexle.org; " +
      "img-src 'self' data: blob: https: *; " +  // More permissive for images
      "style-src 'self' 'unsafe-inline'; " +
      "connect-src 'self' https://app.mexle.org https://admin-panel.mexle.org;"
    );
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
  });


  /* Enable rate limiting */
  app.use(rateLimit({
    windowMs: 5 * 60000, // 5 minutes
    standardHeaders: true,
    max: environment === 'production' ? 100 : 1000, // Stricter limits in production
  }));

  /* Enable CORS */
  const corsOrigins = environment === 'production'
    ? [
      'https://app.mexle.org',
      'https://admin-panel.mexle.org',
      'https://app.mexle.org/#/experiments-details',
    ]
    : '*';

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'Origin',
      'X-Requested-With',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Headers',
    ],
    exposedHeaders: ['Content-Disposition', 'Content-Length'],
    credentials: true,
    maxAge: 3600,
    preflightContinue: false,
    optionsSuccessStatus: 204
  });

  // Swagger setup (only in development and staging)
  if (environment !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('API Documentation')
      .setDescription('The API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // Start server
  const port = configService.get<number>('PORT') || 3000;

  // Body parser configuration
  const maxFileSize = configService.get<string>('MAX_FILE_SIZE') || '10mb';
  app.use(bodyParser.json({ limit: maxFileSize }));
  app.use(bodyParser.urlencoded({ limit: maxFileSize, extended: true }));

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
