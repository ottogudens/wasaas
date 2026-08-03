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

  /**
   * Endpoint interno para transcribir y procesar notas de voz desde WhatsApp (usado por bot-engine)
   */
  @Post('transcribe-voice')
  async transcribeVoice(@Body() body: { tenantId: string; customerPhone: string; audioBase64: string; mimeType?: string }) {
    if (!body.tenantId || !body.customerPhone || !body.audioBase64) {
      return { status: 'error', message: 'Faltan parámetros requeridos.' };
    }

    const audioBuffer = Buffer.from(body.audioBase64, 'base64');
    const transcribedText = await this.aiService.transcriptionService.transcribeAudioBuffer(audioBuffer, 'voice.ogg');

    if (!transcribedText || transcribedText.trim().length === 0) {
      return {
        status: 'success',
        transcribedText: '',
        reply: 'No se pudo comprender el mensaje de audio. Por favor intenta enviar una nota de voz más clara o un texto.',
      };
    }

    const result = await this.aiService.chatWithContext(
      body.tenantId,
      body.customerPhone,
      transcribedText,
    );

    return {
      status: 'success',
      transcribedText,
      reply: result.reply,
      conversationId: result.conversationId,
      isHumanMode: (result as any).isHumanMode || false,
    };
  }
}
