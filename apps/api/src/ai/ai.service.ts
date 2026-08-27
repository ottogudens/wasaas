import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { TranscriptionService } from './transcription.service';

const HISTORY_WINDOW = 20;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ragService: RagService,
    public readonly transcriptionService: TranscriptionService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('⚠️ OPENAI_API_KEY no configurada. Las funciones de IA no estarán disponibles.');
    }
    this.openai = new OpenAI({ apiKey: apiKey || '' });
  }

  private async getOpenAiClient(): Promise<OpenAI> {
    const dbKey = await this.prisma.platformSetting.findUnique({
      where: { key: 'OPENAI_API_KEY' },
    });
    const apiKey = dbKey?.value || this.configService.get<string>('OPENAI_API_KEY') || '';
    return new OpenAI({ apiKey });
  }

  async getPublicAiConfig(): Promise<{ defaultProvider: string; defaultModel: string }> {
    const dbSettings = await this.prisma.platformSetting.findMany({
      where: {
        key: {
          in: ['DEFAULT_AI_PROVIDER', 'DEFAULT_AI_MODEL'],
        },
      },
    });

    const settingsMap = new Map(dbSettings.map((s) => [s.key, s.value]));
    return {
      defaultProvider: settingsMap.get('DEFAULT_AI_PROVIDER') || 'openai',
      defaultModel: settingsMap.get('DEFAULT_AI_MODEL') || 'gpt-4o-mini',
    };
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

      const client = await this.getOpenAiClient();
      const response = await client.chat.completions.create({
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
   * Ejecutar la solicitud completando la respuesta con el proveedor seleccionado:
   * 'openai' | 'gemini' | 'anthropic' | 'deepseek'
   */
  private async generateCompletionWithProvider(params: {
    provider?: string;
    model?: string;
    systemPrompt: string;
    userMessage: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<{ reply: string; usedProvider: string; usedModel: string }> {
    // 1. Obtener la clave por defecto o de base de datos
    const dbSettings = await this.prisma.platformSetting.findMany({
      where: {
        key: {
          in: ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY', 'DEFAULT_AI_PROVIDER', 'DEFAULT_AI_MODEL'],
        },
      },
    });

    const settingsMap = new Map(dbSettings.map((s) => [s.key, s.value]));

    const openAiKey = settingsMap.get('OPENAI_API_KEY') || this.configService.get<string>('OPENAI_API_KEY') || '';
    const geminiKey = settingsMap.get('GEMINI_API_KEY') || this.configService.get<string>('GEMINI_API_KEY') || '';
    const anthropicKey = settingsMap.get('ANTHROPIC_API_KEY') || this.configService.get<string>('ANTHROPIC_API_KEY') || '';
    const deepseekKey = settingsMap.get('DEEPSEEK_API_KEY') || this.configService.get<string>('DEEPSEEK_API_KEY') || '';

    const defaultProvider = settingsMap.get('DEFAULT_AI_PROVIDER') || 'openai';
    const defaultModel = settingsMap.get('DEFAULT_AI_MODEL') || 'gpt-4o-mini';

    const provider = (params.provider || defaultProvider).toLowerCase();

    // ── GOOGLE GEMINI ──────────────────────────────────────────────
    if (provider === 'gemini') {
      if (!geminiKey) {
        throw new Error('Google Gemini API Key no está configurada en la plataforma.');
      }

      const requestedModel = params.model || 'gemini-1.5-flash';
      // Lista de nombres de modelos a intentar en orden
      const modelsToTry = Array.from(new Set([
        requestedModel,
        'gemini-1.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
      ]));

      const apiVersions = ['v1beta', 'v1'];

      const contents: any[] = [];
      for (const h of params.history) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }
      contents.push({ role: 'user', parts: [{ text: params.userMessage }] });

      let lastError = '';

      for (const modelName of modelsToTry) {
        for (const apiVer of apiVersions) {
          try {
            const res = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models/${modelName}:generateContent?key=${geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: params.systemPrompt }] },
                contents,
                generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
              }),
            });

            const data = await res.json();
            if (res.ok) {
              const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se recibió respuesta de Gemini.';
              return { reply, usedProvider: 'Gemini', usedModel: modelName };
            }

            lastError = data.error?.message || `HTTP ${res.status}`;
            if (lastError.toLowerCase().includes('quota exceeded') || lastError.toLowerCase().includes('exceeded your current quota')) {
              throw new Error(`Excedida la cuota de la API Key de Gemini (${modelName}). Cambia a Gemini 1.5/2.0 Flash o verifica tu plan en Google AI Studio.`);
            }

            // Si no es un error 404 (not found), detener iteraciones secundarias
            if (!lastError.includes('not found') && !lastError.includes('not supported')) {
              break;
            }
          } catch (err: any) {
            lastError = err.message;
            if (lastError.includes('Excedida la cuota')) {
              throw err;
            }
          }
        }
      }

      throw new Error(`Google Gemini error: ${lastError}. Por favor verifica tu clave de API de Gemini en la Configuración del Super Admin.`);
    }

    // ── ANTHROPIC CLAUDE ───────────────────────────────────────────
    if (provider === 'anthropic') {
      if (!anthropicKey) {
        throw new Error('Anthropic Claude API Key no está configurada en la plataforma.');
      }
      const modelName = params.model || 'claude-3-5-sonnet-20240620';
      const anthropicMessages = params.history.map((h) => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      }));
      anthropicMessages.push({ role: 'user', content: params.userMessage });

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          system: params.systemPrompt,
          messages: anthropicMessages,
          max_tokens: 800,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `Error HTTP ${res.status} desde Anthropic.`);
      }
      const reply = data.content?.[0]?.text || 'No se recibió respuesta de Claude.';
      return { reply, usedProvider: 'Claude', usedModel: modelName };
    }

    // ── DEEPSEEK AI ────────────────────────────────────────────────
    if (provider === 'deepseek') {
      if (!deepseekKey) {
        throw new Error('DeepSeek API Key no está configurada en la plataforma.');
      }
      const modelName = params.model || 'deepseek-chat';
      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: params.systemPrompt },
            ...params.history,
            { role: 'user', content: params.userMessage },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `Error HTTP ${res.status} desde DeepSeek.`);
      }
      const reply = data.choices?.[0]?.message?.content || 'No se recibió respuesta de DeepSeek.';
      return { reply, usedProvider: 'DeepSeek', usedModel: modelName };
    }

    // ── OPENAI (FALLBACK DEFAULT) ──────────────────────────────────
    if (!openAiKey) {
      throw new Error('OpenAI API Key no está configurada en la plataforma.');
    }
    const modelName = params.model || defaultModel || 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: params.systemPrompt },
          ...params.history,
          { role: 'user', content: params.userMessage },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `Error HTTP ${res.status} desde OpenAI.`);
    }
    const reply = data.choices?.[0]?.message?.content || 'No se recibió respuesta de OpenAI.';
    return { reply, usedProvider: 'OpenAI', usedModel: modelName };
  }

  /**
   * Simular interacción con el bot dentro de la app (Playground / Simulador de Pruebas / Agente Directo)
   */
  async simulateBotResponse(
    botId: string,
    organizationId: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    isSuperAdmin: boolean = false,
    provider?: string,
    overrideModel?: string,
  ): Promise<{ reply: string; sources: string[]; model: string; provider?: string }> {
    const where = isSuperAdmin ? { id: botId } : { id: botId, organizationId };
    const bot = await this.prisma.botInstance.findFirst({ where });
    if (!bot) {
      throw new Error('Bot no encontrado o no pertenece a tu organización.');
    }

    // 1. Buscar contexto relevante en la base de conocimiento RAG
    const ragChunks = await this.ragService.searchSimilarChunks(
      userMessage,
      bot.organizationId,
      4,
      0.25,
    );

    const contextText = ragChunks.length > 0
      ? `\n\n[INFORMACIÓN DE CONTEXTO RAG - DOCUMENTOS DE LA EMPRESA]:\n${ragChunks.map(c => c.content).join('\n---\n')}\n\nInstrucción RAG: Utiliza la información de contexto anterior cuando sea relevante para responder con precisión comercial.`
      : '';

    const systemPrompt = `${bot.systemPrompt || 'Eres un asistente virtual profesional y amable para atención al cliente.'}${contextText}`;

    const formattedHistory = (history || []).slice(-10).map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }));

    const targetModel = overrideModel || bot.aiModel;

    try {
      const completionResult = await this.generateCompletionWithProvider({
        provider,
        model: targetModel,
        systemPrompt,
        userMessage,
        history: formattedHistory,
      });

      return {
        reply: completionResult.reply,
        sources: ragChunks.map((c) => c.content.slice(0, 80) + '...'),
        model: completionResult.usedModel,
        provider: completionResult.usedProvider,
      };
    } catch (error: any) {
      this.logger.error('Error simulando respuesta del bot con IA:', error);
      return {
        reply: `Lo siento, ocurrió un error procesando tu consulta con el proveedor de IA (${error.message || 'Error de conexión'}). Revisa la configuración de API Keys en la plataforma.`,
        sources: [],
        model: targetModel || 'desconocido',
        provider: provider || 'desconocido',
      };
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
  ): Promise<{ reply: string; conversationId: string; isHumanMode?: boolean }> {
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

    // 3.5. Chequeo de intención de traspaso a operador humano (Human Handover Detector)
    const lowerMessage = userMessage.toLowerCase().trim();
    const humanKeywords = ['hablar con persona', 'agente humano', 'hablar con alguien', 'operador', 'asesor humano', 'hablar con humano'];
    const requestsHuman = humanKeywords.some(kw => lowerMessage.includes(kw));

    if (conversation.isHumanMode || requestsHuman) {
      if (requestsHuman && !conversation.isHumanMode) {
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { isHumanMode: true, updatedAt: new Date() },
        });
        this.logger.log(`✋ Solicitud de humano detectada en conv ${conversation.id}. Traspasando a modo humano.`);
        
        const handoverReply = 'He derivado tu solicitud con un asesor humano. En breve un miembro de nuestro equipo se pondrá en contacto contigo.';
        await this.prisma.message.create({
          data: { conversationId: conversation.id, sender: 'BOT', content: handoverReply },
        });
        return { reply: handoverReply, conversationId: conversation.id, isHumanMode: true };
      }

      this.logger.log(`✋ Modo humano activo en conv ${conversation.id}. Ignorando IA.`);
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
      return { reply: '', conversationId: conversation.id, isHumanMode: true };
    }

    // 4. Cargar historial de conversación (últimos 20 mensajes)
    const history = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_WINDOW,
    });

    // Revertir para orden cronológico
    const orderedHistory = history.reverse();

    // 4.5. Buscar en la memoria semántica aprendida (Semantic Caching)
    const cachedMemory = await this.ragService.findCachedMemory(userMessage, bot.organizationId, bot.id);
    if (cachedMemory) {
      const reply = cachedMemory.replyText;

      // Guardar respuesta del bot en BD
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: 'BOT',
          content: reply,
        },
      });

      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      return { reply, conversationId: conversation.id };
    }

    // 5. Buscar chunks RAG relevantes con filtro permisivo de similitud
    let ragContext = '';
    let foundRelevantChunks = false;
    try {
      const similarChunks = await this.ragService.searchSimilarChunks(
        userMessage,
        bot.organizationId,
        3,
        0.25,
        bot.id,
      );
      if (similarChunks.length > 0) {
        foundRelevantChunks = true;
        ragContext = `\n\n[BASE DE CONOCIMIENTO DE LA EMPRESA]:\n${similarChunks.map(c => c.content).join('\n---\n')}`;
      }
    } catch (err) {
      this.logger.warn('⚠️ Error al buscar contexto RAG, continuando sin contexto:', err);
    }

    // 6. Construir system prompt dinámico
    const customPrompt = bot.systemPrompt || 'Eres un asistente virtual profesional especializado en atención al cliente.';
    const systemInstruction = `
${customPrompt}

[INSTRUCCIONES DE ATENCIÓN]:
1. Si el usuario te saluda o hace preguntas generales de cortesía (ej. "hola", "buenos días", "¿cómo estás?"), responde de manera amable y profesional ofreciendo tu ayuda.
2. Si el usuario pregunta sobre servicios, productos, precios o información específica del negocio, prioriza la información de la [BASE DE CONOCIMIENTO DE LA EMPRESA].
3. Si la consulta se refiere a información de la empresa que NO está registrada en la Base de Conocimiento, informa cortésmente que no dispones de esa información en este momento y ofrece derivar la consulta con un asesor humano.
${ragContext}`;

    const fullSystemPrompt = systemInstruction;

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

      const assistantReply = response.choices[0]?.message?.content || 'No se pudo generar una respuesta.';
      reply = assistantReply;

      // 8.5. Memorizar en caché semántico si se encontró información relevante y no fue un error
      const isNegativeResponse = reply.toLowerCase().includes('no dispones de esa información') || reply.toLowerCase().includes('no dispongo de esa información') || reply.toLowerCase().includes('no tengo esa información') || reply.toLowerCase().includes('asesor humano');
      if (isNegativeResponse || !foundRelevantChunks) {
        this.logger.log('🛑 Respuesta negativa o sin contexto relevante. No se almacenará en la caché semántica.');
      } else {
        // Almacenar el contexto de la respuesta exitosa en memoria semántica
        await this.ragService.storeMemory(bot.organizationId, userMessage, assistantReply, bot.id);
      }
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
