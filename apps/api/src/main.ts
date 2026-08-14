import { checkEnv } from './check-env'; // Validar vars de entorno antes de arrancar NestJS
checkEnv();
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { json, urlencoded } from 'express';
import * as bcrypt from 'bcryptjs';

async function seedSuperAdmin(prisma: PrismaService) {
  try {
    const email = process.env.SUPER_ADMIN_EMAIL || 'mibot@skale.cl';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe!Admin2026#';
    const orgName = 'Skale Admin';
    const userName = 'Super Admin';
    const slug = 'skale-admin';

    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          role: 'SUPER_ADMIN',
          passwordHash,
          isActive: true,
        },
      });
      console.log(`✅ [SEED-AUTO] Super Admin verificado y actualizado: "${email}"`);
    } else {
      let organization = await prisma.organization.findUnique({ where: { slug } });
      if (!organization) {
        organization = await prisma.organization.create({
          data: { name: orgName, slug },
        });
      }

      await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: userName,
          role: 'SUPER_ADMIN',
          organizationId: organization.id,
        },
      });

      await prisma.subscription.create({
        data: {
          organizationId: organization.id,
          plan: 'ENTERPRISE',
          status: 'ACTIVE',
        },
      });
      console.log(`✅ [SEED-AUTO] Super Admin creado exitosamente: "${email}"`);
    }
  } catch (err: any) {
    console.error('⚠️ [SEED-AUTO] Advertencia al verificar Super Admin:', err.message);
  }
}

async function bootstrap() {
  console.log('[BOOTSTART] Iniciando ejecucion de bootstrap NestJS...');
  const app = await NestFactory.create(AppModule);

  // Instalar manejador de errores global de Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.setupNestErrorHandler(app as any);
  }

  const prisma = app.get(PrismaService);
  await seedSuperAdmin(prisma);

  // Aumentar el límite de tamaño de payload para procesamiento RAG, documentos y plantillas
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

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
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With,x-api-key,X-API-KEY',
  });

  // Validación global de DTOs con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip propiedades no definidas en DTO
      forbidNonWhitelisted: true, // Rechazar propiedades no definidas
      transform: true,           // Transformar payloads a instancias de DTO
    }),
  );

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  console.log(`[BOOT] Intentando escuchar en el puerto ${port}...`);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API Central ejecutándose en el puerto ${port}`);
  console.log(`🔒 Helmet habilitado | CORS: ${process.env.FRONTEND_URL || 'localhost:3000'}`);
}
bootstrap().catch((err) => {
  console.error('❌ Error fatal al arrancar NestJS:', err);
});
