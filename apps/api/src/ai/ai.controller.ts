import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiChatDto, AiChatWithContextDto } from './ai-chat.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Chat directo protegido por JWT (usado desde el dashboard)
   */
  @Post('chat')
  @UseGuards(JwtAuthGuard)
  async chat(@Body() body: AiChatDto) {
    const defaultPrompt = 'Eres un asistente virtual profesional especializado en atención al cliente.';
    const response = await this.aiService.generateAgentResponse(
      body.message,
      body.systemPrompt || defaultPrompt,
      body.contextChunks || [],
    );

    return {
      status: 'success',
      reply: response,
    };
  }

  /**
   * Chat con contexto completo (usado por el bot-engine internamente)
   * Protegido por API key interna en lugar de JWT
   */
  @Post('chat-with-context')
  async chatWithContext(@Body() body: AiChatWithContextDto) {
    const result = await this.aiService.chatWithContext(
      body.tenantId,
      body.customerPhone,
      body.message,
    );

    return {
      status: 'success',
      reply: result.reply,
      conversationId: result.conversationId,
      isHumanMode: (result as any).isHumanMode || false,
    };
  }
}
