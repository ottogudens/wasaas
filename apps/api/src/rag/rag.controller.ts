import { Controller, Post, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('process-text')
  async processTextDocument(
    @Body() body: { organizationId: string; title: string; content: string },
  ) {
    if (!body.organizationId || !body.content) {
      throw new BadRequestException('organizationId y content son requeridos.');
    }

    const chunks = this.ragService.chunkText(body.content);
    const results = [];

    for (const chunk of chunks) {
      const embedding = await this.ragService.generateEmbedding(chunk);
      results.push({ chunk, embeddingLength: embedding.length });
    }

    return {
      status: 'success',
      organizationId: body.organizationId,
      documentTitle: body.title,
      totalChunksProcessed: results.length,
    };
  }
}
