import { Controller, Post, Get, Body, Headers, UseGuards, UnauthorizedException, Param, Req } from '@nestjs/common';
import { AiService } from './ai.service';
import { RagService } from '../rag/rag.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { AiChatDto, AiChatWithContextDto } from './ai-chat.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly ragService: RagService
  ) {}

  private validateApiKey(apiKey: string) {
    // INTERNAL_API_KEY es obligatoria — check-env.ts ya validó que existe al arrancar.
    const expectedKey = process.env.INTERNAL_API_KEY;
    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API Key');
    }
  }

  @Get('config')
  @UseGuards(JwtAuthGuard)
  async getAiConfig() {
    return this.aiService.getPublicAiConfig();
  }

  /**
   * Simular interacción con el bot dentro de la app (Playground / Chat de Prueba)
   */
  @Post('simulate/:botId')
  @UseGuards(JwtAuthGuard)
  async simulateBot(
    @Param('botId') botId: string,
    @Req() req: any,
    @Body() body: {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      provider?: string;
      model?: string;
    }
  ) {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    return this.aiService.simulateBotResponse(
      botId,
      req.user.organizationId,
      body.message,
      body.history || [],
      isSuperAdmin,
      body.provider,
      body.model,
    );
  }

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
  @SkipThrottle()
  async chatWithContext(
    @Headers('x-api-key') apiKey: string,
    @Body() body: AiChatWithContextDto,
  ) {
    this.validateApiKey(apiKey);

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
   * Protegido por API key interna
   */
  @Post('transcribe-voice')
  @SkipThrottle()
  async transcribeVoice(
    @Headers('x-api-key') apiKey: string,
    @Body() body: { tenantId: string; customerPhone: string; audioBase64: string; mimeType?: string },
  ) {
    this.validateApiKey(apiKey);

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

  /**
   * Endpoint de transcripción directa de notas de voz desde el agente web/móvil
   */
  @Post('transcribe-direct')
  @UseGuards(JwtAuthGuard)
  async transcribeDirect(
    @Body() body: { audioBase64: string; mimeType?: string }
  ) {
    if (!body.audioBase64) {
      return { status: 'error', message: 'Falta el audio en formato Base64.' };
    }
    const audioBuffer = Buffer.from(body.audioBase64, 'base64');
    const ext = body.mimeType?.includes('webm') ? 'voice.webm' : body.mimeType?.includes('mp3') ? 'voice.mp3' : 'voice.ogg';
    const transcribedText = await this.aiService.transcriptionService.transcribeAudioBuffer(audioBuffer, ext);
    return {
      status: 'success',
      transcribedText,
    };
  }

  /**
   * Chat en Vivo Directo con el Agente (Procesa texto, documentos adjuntos y RAG)
   */
  @Post('direct-agent/:botId')
  @UseGuards(JwtAuthGuard)
  async directAgent(
    @Param('botId') botId: string,
    @Req() req: any,
    @Body() body: {
      message: string;
      documentName?: string;
      documentContent?: string;
      mentionedDocumentIds?: string[];
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      provider?: string;
      model?: string;
    }
  ) {
    try {
      const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
      let fullQuery = body.message || '';
      
      // Inject mentioned documents immediately bypassing RAG semantic search limit
      if (body.mentionedDocumentIds && body.mentionedDocumentIds.length > 0) {
        try {
          const mentionedKnowledge = await this.ragService.getDocumentsFullText(body.mentionedDocumentIds, req.user.organizationId);
          if (mentionedKnowledge) {
             fullQuery = `[DOCUMENTOS MENCIONADOS POR EL USUARIO]\nEl usuario ha referenciado explícitamente la siguiente información de la base de datos. Priorízala obligatoriamente:\n\n${mentionedKnowledge}\n\nConsulta del usuario:\n${fullQuery}`;
          }
        } catch(e) {
           console.error("Error al inyectar documentos mencionados:", e);
        }
      }

      if (body.documentName && body.documentContent) {
        fullQuery = `[DOCUMENTO ADJUNTO: ${body.documentName}]\nContenido del documento:\n${body.documentContent}\n\nConsulta del usuario sobre el documento:\n${fullQuery || 'Analiza el documento adjunto y resume los puntos clave.'}`;
        
        // Guardar el documento en la base de conocimientos RAG permanentemente
        try {
           this.ragService.processAndStoreDocument(
            req.user.organizationId,
            body.documentName,
            body.documentContent,
            'TEXT', // source type
            undefined, // url
            botId // asociado al bot actual
          ).catch(e => console.error('Error guardando doc asícrono en RAG:', e));
        } catch(e) {
          console.error("Error al disparar guardado RAG en directAgent", e)
        }
      }

      return await this.aiService.simulateBotResponse(
        botId,
        req.user.organizationId,
        fullQuery,
        body.history || [],
        isSuperAdmin,
        body.provider,
        body.model,
      );
    } catch (error: any) {
      return {
        reply: `Ocurrió un inconveniente temporal de comunicación con el servicio de IA (${error.message || 'Error de conexión'}). Por favor intenta nuevamente.`,
        sources: [],
        model: body.model || 'desconocido',
        provider: body.provider || 'desconocido',
      };
    }
  }
}
