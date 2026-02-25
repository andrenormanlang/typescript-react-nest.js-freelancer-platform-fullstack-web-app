import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { buildApiLandingHtml } from './common/api-landing';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  // Set a global prefix for all routes
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe());

  // Body parser configuration
  app.use(bodyParser.json({ limit: '150mb' }));
  app.use(bodyParser.urlencoded({ limit: '150mb', extended: true }));

  // Enable CORS with updated configuration
  app.enableCors({
    origin: [
      'https://mindsmesh.vercel.app',
      'https://mindsmesh-docker-api.onrender.com',
      'https://mindsmesh.netlify.app',
      'https://mindsmesh.netlify.app/',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('Your API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const PORT = process.env.PORT || 3000;

  const landingHtml = buildApiLandingHtml(document, {
    title: 'MindsMesh API',
    subtitle: 'Interactive API map',
  });

  const httpAdapter = app.getHttpAdapter().getInstance();
  httpAdapter.get('/', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(landingHtml);
  });
  httpAdapter.get('/api', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(landingHtml);
  });

  // Start listening on the specified PORT and bind to all network interfaces
  await app.listen(PORT, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${PORT}`);
}
bootstrap();
