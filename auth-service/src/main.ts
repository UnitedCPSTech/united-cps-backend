import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = app.get(ConfigService);

  const allowedOrigins = (
    config.get<string>('CORS_ORIGIN') || 'http://localhost:5173'
  )
    .split(',')
    .map((x) => x.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });

  const port = config.get<number>('PORT') || 3000;

  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Auth service running on port ${port}`);
}
bootstrap();