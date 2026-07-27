import { Module } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago/mercadopago.service';
import { MercadoPagoController } from './mercadopago/mercadopago.controller';
import { RagController } from './rag/rag.controller';
import { RagService } from './rag/rag.service';
import { AiController } from './ai/ai.controller';
import { AiService } from './ai/ai.service';

@Module({
  imports: [],
  controllers: [RagController, MercadoPagoController, AiController],
  providers: [MercadoPagoService, RagService, AiService],
})
export class AppModule {}
