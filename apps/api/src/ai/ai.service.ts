import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';

const HISTORY_WINDOW = 20;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ragService: RagService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('⚠️ OPENAI_API_KEY no configurada. Las funciones de IA no estarán disponibles.');
    }
    this.openai = new OpenAI({ apiKey: apiKey || '' });
  }

  /**
   * Generar respuesta simple (endpoint protegido por JWT)
   */
  async generateAgentResponse(
    userMessage: string,
    systemPrompt: string,
    contextChunks: string[] = [],
  ): Promise<string> {
    try {
      const contextText = contextChunks.length > 0
        ? `\n\nInformación de contexto para la consulta:\n${contextChunks.join('\n---\n')}`
        : '';

      const fullSystemPrompt = `${systemPrompt}${contextText}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: fullSystemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content || 'No se pudo generar una respuesta.';
    } catch (error) {
      this.logger.error('Error generando respuesta con GPT-4o-mini:', error);
      return 'Lo siento, en este momento no puedo procesar tu solicitud. Por favor intenta más tarde.';
    }
  }

  /**
   * Chat con contexto completo: historial + RAG + system prompt de BD
   * Usado por el bot-engine para mensajes entrantes de WhatsApp
   */
  async chatWithContext(
    tenantId: string,
    customerPhone: string,
    userMessage: string,
  ): Promise<{ reply: string; conversationId: string }> {
    // 1. Obtener BotInstance desde BD
    const bot = await this.prisma.botInstance.findUnique({
      where: { tenantId },
    });

    if (!bot) {
      this.logger.warn(`⚠️ Bot no encontrado para tenantId: ${tenantId}`);
      return {
        reply: 'Lo siento, el asistente no está configurado correctamente. Contacta al administrador.',
        conversationId: '',
      };
    }

    // 2. Buscar o crear conversación
    let conversation = await this.prisma.conversation.findFirst({
      where: { botId: bot.id, customerPhone },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          botId: bot.id,
          customerPhone,
        },
      });
      this.logger.log(`📝 Nueva conversación creada para ${customerPhone} en bot ${bot.name}`);
    }

    // 3. Guardar mensaje del usuario
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'USER',
        content: userMessage,
      },
    });

    // 4. Cargar historial de conversación (últimos 20 mensajes)
    const history = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_WINDOW,
    });

    // Revertir para orden cronológico
    const orderedHistory = history.reverse();

    // 5. Buscar chunks RAG relevantes
    let ragContext = '';
    try {
      const similarChunks = await this.ragService.searchSimilarChunks(
        userMessage,
        bot.organizationId,
        3,
      );
      if (similarChunks.length > 0) {
        ragContext = `\n\nInformación relevante de la base de conocimiento:\n${similarChunks.map(c => c.content).join('\n---\n')}`;
      }
    } catch (err) {
      this.logger.warn('⚠️ Error al buscar contexto RAG, continuando sin contexto:', err);
    }

    // 6. Construir system prompt completo
    const systemPrompt = bot.systemPrompt || 'Eres un asistente virtual profesional especializado en atención al cliente.';
    const fullSystemPrompt = `${systemPrompt}${ragContext}`;

    // 7. Construir mensajes para OpenAI
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: fullSystemPrompt },
    ];

    for (const msg of orderedHistory) {
      // No duplicar el mensaje actual del usuario (ya está al final del historial)
      if (msg.id === history[history.length - 1]?.id) continue;

      messages.push({
        role: msg.sender === 'USER' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Agregar el mensaje actual del usuario al final
    messages.push({ role: 'user', content: userMessage });

    // 8. Llamar a OpenAI
    let reply: string;
    try {
      const response = await this.openai.chat.completions.create({
        model: bot.aiModel || 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 800,
      });

      reply = response.choices[0]?.message?.content || 'No se pudo generar una respuesta.';
    } catch (error) {
      this.logger.error('Error generando respuesta con IA:', error);
      reply = 'Lo siento, en este momento no puedo procesar tu solicitud. Por favor intenta más tarde.';
    }

    // 9. Guardar respuesta del bot en BD
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'BOT',
        content: reply,
      },
    });

    // 10. Actualizar timestamp de la conversación
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return { reply, conversationId: conversation.id };
  }
}
