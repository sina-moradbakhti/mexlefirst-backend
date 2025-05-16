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
  app.useStaticAssets(join(__dirname, '..', uploadDir), {
    prefix: '/uploads/',
  });

  /* Enable CSRF */
  // app.use(cookieParser());
  // app.use(csurf({ cookie: { sameSite: true } }));
  app.use((req: any, res: any, next: any) => {
    // const token = req.csrfToken();
    // res.cookie('XSRF-TOKEN', token);
    // res.locals.csrfToken = token;
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
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
    ? ['https://app.mexle.org', 'https://admin-panel.mexle.org']
    : '*';

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
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
