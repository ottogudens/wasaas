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
    sourceType: string = 'TEXT',
    sourceUrl?: string,
    botId?: string,
  ): Promise<{ documentId: string; chunksProcessed: number }> {
    // 1. Crear el registro del documento
    const document = await this.prisma.knowledgeDocument.create({
      data: {
        organizationId,
        botId,
        title,
        sourceType,
        sourceUrl,
        lastSyncedAt: sourceType === 'URL' ? new Date() : undefined,
      },
    });

    // 2. Dividir en chunks usando tiktoken
    const chunks = this.chunkText(content);

    // 3. Para cada chunk, generar embedding y persistir
    let chunksProcessed = 0;
    for (const chunkText of chunks) {
      try {
        const embedding = await this.generateEmbedding(chunkText);

        // Insertar con embedding vectorial via raw SQL
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
    await this.invalidateSemanticCache(organizationId, botId);

    return {
      documentId: document.id,
      chunksProcessed,
    };
  }

  /**
   * Scraper y extractor de contenido limpio de sitios web
   */
  async scrapeWebsite(url: string): Promise<{ title: string; content: string }> {
    try {
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      this.logger.log(`🌐 Extrayendo contenido web de: ${formattedUrl}`);

      const response = await fetch(formattedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (!response.ok) {
        throw new Error(`No se pudo acceder a la página web (HTTP ${response.status})`);
      }

      const html = await response.text();

      // 1. Extraer título de la página
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const pageTitle = (titleMatch?.[1] || h1Match?.[1] || new URL(formattedUrl).hostname).trim();

      // 2. Limpieza de elementos irrelevantes (scripts, estilos, navegación, footer, etc.)
      let cleanHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
        .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ');

      // 3. Reemplazar saltos de bloque por nuevas líneas
      cleanHtml = cleanHtml
        .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|section|article)>/gi, '\n')
        .replace(/<br\s*[\/]?>/gi, '\n');

      // 4. Eliminar todas las etiquetas HTML restantes
      let plainText = cleanHtml.replace(/<[^>]+>/g, ' ');

      // 5. Decodificar entidades HTML comunes
      plainText = plainText
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&aacute;/g, 'á')
        .replace(/&eacute;/g, 'é')
        .replace(/&iacute;/g, 'í')
        .replace(/&oacute;/g, 'ó')
        .replace(/&uacute;/g, 'ú')
        .replace(/&ntilde;/g, 'ñ')
        .replace(/&Aacute;/g, 'Á')
        .replace(/&Eacute;/g, 'É')
        .replace(/&Iacute;/g, 'Í')
        .replace(/&Oacute;/g, 'Ó')
        .replace(/&Uacute;/g, 'Ú')
        .replace(/&Ntilde;/g, 'Ñ');

      // 6. Normalizar espacios en blanco y líneas
      const normalizedContent = plainText
        .split('\n')
        .map((line) => line.trim().replace(/\s+/g, ' '))
        .filter((line) => line.length > 0)
        .join('\n');

      if (normalizedContent.length < 20) {
        throw new Error('La página web no contiene suficiente texto legible o requiere inicio de sesión/JavaScript.');
      }

      this.logger.log(`✅ Contenido web extraído (${normalizedContent.length} caracteres, Título: "${pageTitle}")`);

      return {
        title: pageTitle,
        content: normalizedContent,
      };
    } catch (err: any) {
      this.logger.error(`Error al extraer contenido web de ${url}:`, err);
      throw new Error(`Error al escanear la URL: ${err.message}`);
    }
  }

  /**
   * Procesar y almacenar una URL de un sitio web en la base de conocimientos RAG
   */
  async processAndStoreUrl(
    organizationId: string,
    url: string,
    customTitle?: string,
    botId?: string,
  ): Promise<{ documentId: string; title: string; chunksProcessed: number; sourceUrl: string }> {
    const { title: scrapedTitle, content } = await this.scrapeWebsite(url);
    const finalTitle = customTitle?.trim() || scrapedTitle || url;

    const result = await this.processAndStoreDocument(
      organizationId,
      finalTitle,
      content,
      'URL',
      url,
      botId,
    );

    return {
      documentId: result.documentId,
      title: finalTitle,
      chunksProcessed: result.chunksProcessed,
      sourceUrl: url,
    };
  }

  /**
   * Re-sincronizar y actualizar la información de una página web existente
   */
  async resyncUrlDocument(
    documentId: string,
    organizationId: string,
  ): Promise<{ success: boolean; documentId: string; title: string; chunksProcessed: number; lastSyncedAt: Date }> {
    const doc = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, organizationId },
    });

    if (!doc) {
      throw new Error('Documento no encontrado o no pertenece a tu organización.');
    }

    if (!doc.sourceUrl) {
      throw new Error('Este documento no tiene una URL asociada para re-sincronizar.');
    }

    this.logger.log(`🔄 Re-sincronizando URL "${doc.sourceUrl}" para el documento ${doc.id}...`);

    // 1. Volver a extraer el contenido en vivo de la página web
    const { title: scrapedTitle, content } = await this.scrapeWebsite(doc.sourceUrl);

    // 2. Eliminar chunks anteriores en pgvector
    await this.prisma.$executeRaw`
      DELETE FROM "DocumentVectorChunk" WHERE "documentId" = ${doc.id}
    `;

    // 3. Generar nuevos chunks y embeddings vectoriales
    const chunks = this.chunkText(content);
    let chunksProcessed = 0;
    for (const chunkText of chunks) {
      try {
        const embedding = await this.generateEmbedding(chunkText);

        await this.prisma.$executeRaw`
          INSERT INTO "DocumentVectorChunk" (id, "documentId", content, embedding, "createdAt")
          VALUES (
            gen_random_uuid(),
            ${doc.id},
            ${chunkText},
            ${JSON.stringify(embedding)}::vector,
            NOW()
          )
        `;

        chunksProcessed++;
      } catch (err) {
        this.logger.error(`Error procesando chunk actualizado para doc ${doc.id}:`, err);
      }
    }

    // 4. Actualizar metadata del documento
    const now = new Date();
    const updated = await this.prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: {
        title: doc.title || scrapedTitle,
        lastSyncedAt: now,
        updatedAt: now,
      },
    });

    // 5. Invalidar caché semántica
    await this.invalidateSemanticCache(organizationId);

    this.logger.log(`✅ URL re-sincronizada exitosamente (${chunksProcessed} chunks actualizados) para doc ${doc.id}`);

    return {
      success: true,
      documentId: updated.id,
      title: updated.title,
      chunksProcessed,
      lastSyncedAt: now,
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
    botId?: string,
  ): Promise<Array<{ id: string; content: string; similarity: number }>> {
    try {
      // Limitar a máximo 8000 caracteres para evitar Error 400 (8192 tokens máximo en OpenAI Embeddings)
      const safeQuery = query.length > 8000 ? query.substring(0, 8000) : query;
      const queryEmbedding = await this.generateEmbedding(safeQuery);

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
          ${botId ? Prisma.sql`AND (kd."botId" = ${botId} OR kd."botId" IS NULL)` : Prisma.sql`AND kd."botId" IS NULL`}
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
        bot: { select: { id: true, name: true } },
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
    queryText: string,
    organizationId: string,
    botId?: string,
    minSimilarity: number = 0.85,
  ): Promise<{ replyText: string; similarity: number } | null> {
    try {
      const queryEmbedding = await this.generateEmbedding(queryText);

      const results = await this.prisma.$queryRaw<
        Array<{ id: string; replyText: string; similarity: number }>
      >`
        SELECT
          id,
          "replyText",
          1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
        FROM "SemanticMemoryCache"
        WHERE "organizationId" = ${organizationId}
          ${botId ? Prisma.sql`AND ("botId" = ${botId} OR "botId" IS NULL)` : Prisma.sql`AND "botId" IS NULL`}
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${minSimilarity}
          AND "updatedAt" >= NOW() - INTERVAL '7 days'
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT 1
      `;

      if (results && results.length > 0) {
        const match = results[0];
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
    botId?: string,
  ): Promise<void> {
    try {
      if (!queryText || !replyText || queryText.length < 5 || replyText.length < 5) return;
      const embedding = await this.generateEmbedding(queryText);

      await this.prisma.$executeRaw`
        INSERT INTO "SemanticMemoryCache" (id, "organizationId", "botId", "queryText", "replyText", embedding, "hitCount", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(),
          ${organizationId},
          ${botId || null},
          ${queryText},
          ${replyText},
          ${JSON.stringify(embedding)}::vector,
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
  async invalidateSemanticCache(organizationId: string, botId?: string): Promise<void> {
    try {
      if (botId) {
        await this.prisma.semanticMemoryCache.deleteMany({
          where: { organizationId, botId },
        });
      } else {
        await this.prisma.semanticMemoryCache.deleteMany({
          where: { organizationId },
        });
      }
      this.logger.log(`🧹 Caché semántica invalidada para organización ${organizationId}${botId ? ` y bot ${botId}` : ''}`);
    } catch (err) {
      this.logger.error('Error al invalidar caché semántica:', err);
    }
  }

  /**
   * Obtener el texto completo agrupado de múltiples documentos
   */
  async getDocumentsFullText(documentIds: string[], organizationId: string): Promise<string> {
    const documents = await this.prisma.knowledgeDocument.findMany({
      where: {
        id: { in: documentIds },
        organizationId
      },
      include: { chunks: true }
    });
    
    return documents.map(doc => {
      const allText = doc.chunks.map(chunk => chunk.content).join('\n');
      return `--- DOCUMENTO: ${doc.title} ---\n${allText}\n--- FIN DOCUMENTO ---`;
    }).join('\n\n');
  }
}
