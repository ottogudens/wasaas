import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { RagService } from './rag.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { IsString, IsOptional, MaxLength, MinLength, IsUrl } from 'class-validator';

class ProcessTextDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title: string;

  @IsString()
  @MinLength(10)
  content: string;

  @IsOptional()
  @IsString()
  botId?: string;
}

class ProcessUrlDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  botId?: string;
}

class SearchDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  query: string;

  @IsOptional()
  topK?: number;
}

/**
 * Controlador interno para endpoints usados por bot-engine (API key, sin JWT)
 */
@Controller('rag')
@SkipThrottle()
export class InternalRagController {
  constructor(private readonly ragService: RagService) {}

  private validateApiKey(apiKey: string) {
    const expectedKey = process.env.INTERNAL_API_KEY;
    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API Key');
    }
  }

  /**
   * Endpoint interno para procesar documentos de WhatsApp (usado por bot-engine)
   */
  @Post('process-whatsapp-file')
  async processWhatsAppFile(
    @Headers('x-api-key') apiKey: string,
    @Body() body: { tenantId: string; title: string; content?: string; contentBase64?: string; botId?: string },
  ) {
    this.validateApiKey(apiKey);

    if (!body.tenantId || !body.title || (!body.content && !body.contentBase64)) {
      throw new BadRequestException('tenantId, title y content/contentBase64 son obligatorios.');
    }

    const bot = await this.ragService['prisma'].botInstance.findUnique({
      where: { tenantId: body.tenantId },
    });

    if (!bot) {
      throw new BadRequestException('Bot no encontrado.');
    }

    let finalContent = body.content || '';

    if (body.contentBase64) {
      const buffer = Buffer.from(body.contentBase64, 'base64');
      const ext = body.title.split('.').pop()?.toLowerCase() || '';
      let mimetype = 'text/plain';

      if (ext === 'pdf') mimetype = 'application/pdf';
      else if (ext === 'docx') mimetype = 'docx';
      else if (ext === 'xlsx' || ext === 'xls') mimetype = 'xlsx';

      finalContent = await this.ragService.extractTextFromBuffer(buffer, mimetype);
    }

    const result = await this.ragService.processAndStoreDocument(
      bot.organizationId,
      body.title,
      finalContent,
      'FILE',
      undefined,
      body.botId || bot.id // Por defecto lo asociamos a este bot si viene por WA
    );

    return {
      status: 'success',
      documentId: result.documentId,
      chunksProcessed: result.chunksProcessed,
    };
  }
}

/**
 * Controlador principal de RAG protegido por JWT (usado desde el dashboard web)
 */
@Controller('rag')
@UseGuards(JwtAuthGuard)
export class RagController {
  constructor(private readonly ragService: RagService) {}

  /**
   * Procesar documento de texto manual
   */
  @Post('process-text')
  async processTextDocument(@Req() req: any, @Body() body: ProcessTextDto) {
    const result = await this.ragService.processAndStoreDocument(
      req.user.organizationId,
      body.title,
      body.content,
      'TEXT',
      undefined,
      body.botId,
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
   * Procesar e indexar un sitio web / URL en la base de conocimientos
   */
  @Post('process-url')
  async processUrlDocument(@Req() req: any, @Body() body: ProcessUrlDto) {
    if (!body.url) {
      throw new BadRequestException('La URL del sitio web es requerida.');
    }

    try {
      const result = await this.ragService.processAndStoreUrl(
        req.user.organizationId,
        body.url,
        body.title,
        body.botId,
      );

      return {
        status: 'success',
        organizationId: req.user.organizationId,
        documentId: result.documentId,
        documentTitle: result.title,
        sourceUrl: result.sourceUrl,
        totalChunksProcessed: result.chunksProcessed,
      };
    } catch (err: any) {
      throw new BadRequestException(err.message || 'No se pudo procesar la URL');
    }
  }

  /**
   * Re-sincronizar y actualizar la información de una página web
   */
  @Post('resync-url/:id')
  async resyncUrlDocument(@Param('id') id: string, @Req() req: any) {
    try {
      const result = await this.ragService.resyncUrlDocument(id, req.user.organizationId);
      return {
        status: 'success',
        ...result,
      };
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Error al re-sincronizar la URL');
    }
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
