import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'sk-fake-key-for-build',
    });
  }

  /**
   * Generar respuesta contextualizada usando el System Prompt y fragmentos de RAG
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
}
