import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'sk-fake-key-for-build',
    });
  }

  /**
   * Generar vector embedding para un texto usando OpenAI text-embedding-3-small
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.replace(/\n/g, ' '),
        encoding_format: 'float',
      });
      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Error generando vector embedding:', error);
      throw error;
    }
  }

  /**
   * Dividir un texto largo en fragmentos (chunks) con solapamiento
   */
  chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }
}
