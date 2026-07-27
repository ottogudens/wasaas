import { Module } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago/mercadopago.service';
import { MercadoPagoController } from './mercadopago/mercadopago.controller';
import { RagController } from './rag/rag.controller';
import { RagService } from './rag/rag.service';
import { AiController } from './ai/ai.controller';
import { AiService } from './ai/ai.service';
import { McpController } from './mcp/mcp.controller';
import { McpService } from './mcp/mcp.service';

@Module({
  imports: [],
  controllers: [RagController, MercadoPagoController, AiController, McpController],
  providers: [MercadoPagoService, RagService, AiService, McpService],
})
export class AppModule {}
