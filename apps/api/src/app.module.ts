import { Module } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago/mercadopago.service';
import { RagController } from './rag/rag.controller';
import { RagService } from './rag/rag.service';

@Module({
  imports: [],
  controllers: [RagController],
  providers: [MercadoPagoService, RagService],
})
export class AppModule {}
