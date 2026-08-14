import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { encoding_for_model } from 'tiktoken';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import { Prisma } from '@prisma/client';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey: apiKey || '' });
  }

  /**
   * Procesar un documento de texto: chunk → embed → persist en pgvector
   */
  async processAndStoreDocument(
    organizationId: string,
    title: string,
    content: string,
  ): Promise<{ documentId: string; chunksProcessed: number }> {
    // 1. Crear el registro del documento
    const document = await this.prisma.knowledgeDocument.create({
      data: {
        organizationId,
        title,
      },
    });

    // 2. Dividir en chunks usando tiktoken
    const chunks = this.chunkText(content);

    // 3. Para cada chunk, generar embedding y persistir
    let chunksProcessed = 0;
    for (const chunkText of chunks) {
      try {
        const embedding = await this.generateEmbedding(chunkText);

        // Insertar con embedding vectorial via raw SQL (Prisma no soporta Unsupported nativamente)
        await this.prisma.$executeRaw`
          INSERT INTO "DocumentVectorChunk" (id, "documentId", content, embedding, "createdAt")
          VALUES (
            gen_random_uuid(),
            ${document.id},
            ${chunkText},
            ${JSON.stringify(embedding)}::vector,
            NOW()
          )
        `;

        chunksProcessed++;
      } catch (err) {
        this.logger.error(`Error procesando chunk para doc ${document.id}:`, err);
      }
    }

    this.logger.log(`📚 Documento "${title}" procesado: ${chunksProcessed}/${chunks.length} chunks almacenados.`);

    // Invalida la caché semántica de la organización porque hay un nuevo documento
    await this.invalidateSemanticCache(organizationId);

    return {
      documentId: document.id,
      chunksProcessed,
    };
  }

  /**
   * Buscar chunks similares por cosine similarity en pgvector con filtro de similitud mínima
   */
  async searchSimilarChunks(
    query: string,
    organizationId: string,
    topK: number = 5,
    minSimilarity: number = 0.30,
  ): Promise<Array<{ id: string; content: string; similarity: number }>> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);

      const results = await this.prisma.$queryRaw<
        Array<{ id: string; content: string; similarity: number }>
      >`
        SELECT
          dvc.id,
          dvc.content,
          1 - (dvc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
        FROM "DocumentVectorChunk" dvc
        INNER JOIN "KnowledgeDocument" kd ON kd.id = dvc."documentId"
        WHERE kd."organizationId" = ${organizationId}
          AND dvc.embedding IS NOT NULL
          AND 1 - (dvc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${minSimilarity}
        ORDER BY dvc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${topK}
      `;

      return results || [];
    } catch (error) {
      this.logger.error('Error buscando chunks similares:', error);
      return [];
    }
  }

  /**
   * Listar documentos de una organización
   */
  async listDocuments(organizationId: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { chunks: true } },
      },
    });
  }

  /**
   * Eliminar un documento y todos sus chunks
   */
  async deleteDocument(documentId: string, organizationId: string) {
    const doc = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, organizationId },
    });

    if (!doc) return null;

    await this.prisma.knowledgeDocument.delete({
      where: { id: documentId },
    });

    // Invalida la caché semántica de la organización porque un doc fue borrado
    await this.invalidateSemanticCache(organizationId);

    this.logger.log(`🗑️ Documento "${doc.title}" eliminado con sus chunks. Caché semántica invalidada.`);
    return doc;
  }

  /**
   * Buscar en la memoria semántica aprendida (Semantic Caching)
   */
  async findCachedMemory(
    query: string,
    organizationId: string,
    minSimilarity: number = 0.85,
  ): Promise<{ replyText: string; similarity: number } | null> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);

      // Solo retornar entradas más recientes que N días (TTL: ej. 7 días)
      const ttlDays = 7;
      
      const results = await this.prisma.$queryRaw<
        Array<{ id: string; replyText: string; similarity: number }>
      >`
        SELECT
          smc.id,
          smc."replyText",
          1 - (smc."queryEmbedding" <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
        FROM "SemanticMemoryCache" smc
        WHERE smc."organizationId" = ${organizationId}
          AND smc."queryEmbedding" IS NOT NULL
          AND smc."createdAt" >= NOW() - INTERVAL '${Prisma.sql`${ttlDays} days`}'
          AND 1 - (smc."queryEmbedding" <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${minSimilarity}
        ORDER BY smc."queryEmbedding" <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT 1
      `;

      if (results && results.length > 0) {
        const match = results[0];
        // Incrementar contador de hits
        await this.prisma.$executeRaw`
          UPDATE "SemanticMemoryCache"
          SET "hitCount" = "hitCount" + 1, "updatedAt" = NOW()
          WHERE id = ${match.id}
        `;
        this.logger.log(`⚡ [SemanticCache HIT] Respuesta recuperada de la memoria aprendida (Similitud: ${match.similarity.toFixed(3)})`);
        return { replyText: match.replyText, similarity: match.similarity };
      }
      return null;
    } catch (error) {
      this.logger.error('Error al buscar en caché semántico:', error);
      return null;
    }
  }

  /**
   * Guardar nuevo par de conocimiento aprendido en la memoria semántica (Semantic Memory)
   */
  async storeMemory(
    organizationId: string,
    queryText: string,
    replyText: string,
  ): Promise<void> {
    try {
      if (!queryText || !replyText || queryText.length < 5 || replyText.length < 5) return;
      const embedding = await this.generateEmbedding(queryText);

      await this.prisma.$executeRaw`
        INSERT INTO "SemanticMemoryCache" (id, "organizationId", "queryText", "queryEmbedding", "replyText", "hitCount", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(),
          ${organizationId},
          ${queryText},
          ${JSON.stringify(embedding)}::vector,
          ${replyText},
          1,
          NOW(),
          NOW()
        )
      `;
      this.logger.log(`🧠 [SemanticMemory Saved] Nuevo conocimiento aprendido y almacenado para la organización.`);
    } catch (error) {
      this.logger.error('Error al guardar en memoria semántica:', error);
    }
  }

  /**
   * Generar vector embedding para un texto usando OpenAI text-embedding-3-small
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.replace(/\n/g, ' '),
      encoding_format: 'float',
    });
    return response.data[0].embedding;
  }

  /**
   * Extraer texto de un archivo en memoria (Buffer)
   */
  async extractTextFromBuffer(buffer: Buffer, mimetype: string): Promise<string> {
    try {
      if (mimetype === 'application/pdf' || mimetype === 'pdf') {
        const data = await pdfParse(buffer);
        return data.text;
      } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimetype === 'docx') {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimetype === 'application/vnd.ms-excel' ||
        mimetype === 'xlsx' || mimetype === 'xls'
      ) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        let text = '';
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          text += `Sheet: ${sheetName}\n`;
          text += xlsx.utils.sheet_to_txt(sheet) + '\n\n';
        });
        return text;
      } else if (mimetype === 'text/plain' || mimetype === 'txt' || mimetype === 'csv') {
        return buffer.toString('utf8');
      } else {
        throw new Error(`Mimetype no soportado para extracción de texto: ${mimetype}`);
      }
    } catch (err) {
      this.logger.error('Error extrayendo texto del archivo:', err);
      throw err;
    }
  }

  /**
   * Dividir un texto largo en fragmentos (chunks) basándose en tokens
   */
  chunkText(text: string, maxTokens: number = 500, overlapTokens: number = 50): string[] {
    const enc = encoding_for_model('text-embedding-3-small');
    const tokens = enc.encode(text);
    const chunks: string[] = [];

    for (let i = 0; i < tokens.length; i += (maxTokens - overlapTokens)) {
      const chunkTokens = tokens.slice(i, i + maxTokens);
      const chunkTextRaw = enc.decode(chunkTokens);
      const chunkText = new TextDecoder().decode(chunkTextRaw);
      if (chunkText.trim().length > 0) {
        chunks.push(chunkText);
      }
    }

    enc.free();
    return chunks;
  }

  /**
   * Invalidar caché semántica de una organización (borrar todas sus entradas)
   */
  async invalidateSemanticCache(organizationId: string) {
    try {
      const { count } = await this.prisma.semanticMemoryCache.deleteMany({
        where: { organizationId },
      });
      if (count > 0) {
        this.logger.log(`🧹 Caché semántica invalidada para org ${organizationId}: ${count} entradas borradas.`);
      }
    } catch (err) {
      this.logger.error('Error al invalidar caché semántica:', err);
    }
  }
}
