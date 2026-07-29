import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers (configurar helmet para no bloquear CORS/preflight)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS totalmente abierto para peticiones del frontend y preflights OPTIONS
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
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
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API Central ejecutándose en el puerto ${port}`);
  console.log(`🔒 Helmet habilitado | CORS: ${process.env.FRONTEND_URL || 'localhost:3000'}`);
}
bootstrap();
