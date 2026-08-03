import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey: apiKey || '' });
  }

  /**
   * Transcribir un buffer de audio (ogg, mp3, wav) a texto mediante OpenAI Whisper
   */
  async transcribeAudioBuffer(audioBuffer: Buffer, filename: string = 'audio.ogg'): Promise<string> {
    try {
      this.logger.log(`🎙️ Procesando transcripción Whisper de audio (${audioBuffer.length} bytes)...`);
      
      const file = await toFile(audioBuffer, filename);
      
      const response = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'es',
      });

      this.logger.log(`🎙️ Transcripción exitosa: "${response.text}"`);
      return response.text;
    } catch (error) {
      this.logger.error('Error al transcribir audio con Whisper:', error);
      return '';
    }
  }
}
