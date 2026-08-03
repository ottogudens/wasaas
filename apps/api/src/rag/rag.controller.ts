import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { RagService } from './rag.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

class ProcessTextDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title: string;

  @IsString()
  @MinLength(10)
  content: string;
}

class SearchDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  query: string;

  @IsOptional()
  topK?: number;
}

@Controller('rag')
@UseGuards(JwtAuthGuard)
export class RagController {
  constructor(private readonly ragService: RagService) {}

  /**
   * Procesar documento de texto y almacenar embeddings en pgvector
   */
  @Post('process-text')
  async processTextDocument(@Req() req: any, @Body() body: ProcessTextDto) {
    const result = await this.ragService.processAndStoreDocument(
      req.user.organizationId,
      body.title,
      body.content,
    );

    return {
      status: 'success',
      organizationId: req.user.organizationId,
      documentId: result.documentId,
      documentTitle: body.title,
      totalChunksProcessed: result.chunksProcessed,
    };
  }

  /**
   * Buscar información relevante por similitud semántica
   */
  @Post('search')
  async searchKnowledge(@Req() req: any, @Body() body: SearchDto) {
    const results = await this.ragService.searchSimilarChunks(
      body.query,
      req.user.organizationId,
      body.topK || 5,
    );

    return {
      status: 'success',
      query: body.query,
      results,
    };
  }

  /**
   * Endpoint interno para procesar documentos de WhatsApp (usado por bot-engine)
   */
  @Post('process-whatsapp-file')
  async processWhatsAppFile(@Body() body: { tenantId: string; title: string; content: string }) {
    if (!body.tenantId || !body.title || !body.content) {
      throw new BadRequestException('tenantId, title y content son obligatorios.');
    }

    const bot = await this.ragService['prisma'].botInstance.findUnique({
      where: { tenantId: body.tenantId },
    });

    if (!bot) {
      throw new BadRequestException('Bot no encontrado.');
    }

    const result = await this.ragService.processAndStoreDocument(
      bot.organizationId,
      body.title,
      body.content,
    );

    return {
      status: 'success',
      documentId: result.documentId,
      chunksProcessed: result.chunksProcessed,
    };
  }

  /**
   * Listar documentos de la organización
   */
  @Get('documents')
  async listDocuments(@Req() req: any) {
    const documents = await this.ragService.listDocuments(req.user.organizationId);
    return { status: 'success', documents };
  }

  /**
   * Eliminar un documento y sus chunks
   */
  @Delete('documents/:id')
  async deleteDocument(@Param('id') id: string, @Req() req: any) {
    const deleted = await this.ragService.deleteDocument(id, req.user.organizationId);
    if (!deleted) {
      throw new BadRequestException('Documento no encontrado o no pertenece a tu organización.');
    }
    return { status: 'success', deleted };
  }
}
