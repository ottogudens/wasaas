import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Infrastructure
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

// Feature modules
import { BotsModule } from './bots/bots.module';
import { AiController } from './ai/ai.controller';
import { AiService } from './ai/ai.service';
import { RagController } from './rag/rag.controller';
import { RagService } from './rag/rag.service';
import { MercadoPagoController } from './mercadopago/mercadopago.controller';
import { MercadoPagoService } from './mercadopago/mercadopago.service';
// import { McpController } from './mcp/mcp.controller';
// import { McpService } from './mcp/mcp.service';

@Module({
  imports: [
    // Configuración global de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting global: 60 requests por minuto por IP
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),

    // Infraestructura
    PrismaModule,
    AuthModule,

    // Feature modules
    BotsModule,
  ],
  controllers: [
    AiController,
    RagController,
    MercadoPagoController,
    // McpController,
  ],
  providers: [
    AiService,
    RagService,
    MercadoPagoService,
    // McpService,
    // Aplicar rate limiting globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
