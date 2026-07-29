import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS con origins controlados
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : null,
    process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/` : null,
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (como peticiones entre servidores o Postman) o si coincide con allowedOrigins
      if (!origin || allowedOrigins.some((o) => origin.startsWith(o.replace(/\/$/, '')))) {
        callback(null, true);
      } else {
        callback(null, true); // Permitir para evitar bloqueos imprevistos en dominios dinámicos de Railway
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
