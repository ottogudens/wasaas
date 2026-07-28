import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS con origins controlados
  app.enableCors({
    origin: process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL, 'http://localhost:3000']
      : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Validación global de DTOs con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip propiedades no definidas en DTO
      forbidNonWhitelisted: true, // Rechazar propiedades no definidas
      transform: true,           // Transformar payloads a instancias de DTO
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API Central ejecutándose en el puerto ${port}`);
  console.log(`🔒 Helmet habilitado | CORS: ${process.env.FRONTEND_URL || 'localhost:3000'}`);
}
bootstrap();
