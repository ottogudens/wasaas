import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

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

    // 2. Dividir en chunks
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
    topK: number = 3,
    minSimilarity: number = 0.65,
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

      return results;
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

    this.logger.log(`🗑️ Documento "${doc.title}" eliminado con sus chunks.`);
    return doc;
  }

  /**
   * Buscar en la memoria semántica aprendida (Semantic Caching)
   */
  async findCachedMemory(
    query: string,
    organizationId: string,
    minSimilarity: number = 0.88,
  ): Promise<{ replyText: string; similarity: number } | null> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);

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
          AND 1 - (smc."queryEmbedding" <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${minSimilarity}
        ORDER BY smc."queryEmbedding" <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT 1
      `;

      if (results.length > 0) {
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
