import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI();

async function main() {
  const query = "hola";
  const organizationId = "some-org-id"; // we'll just fetch a random org id that has docs
  const doc = await prisma.knowledgeDocument.findFirst();
  if (!doc) {
    console.log("No documents found in DB");
    return;
  }
  console.log("Found doc org ID:", doc.organizationId);

  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
    encoding_format: 'float',
  });
  const queryEmbedding = res.data[0].embedding;

  try {
    const results = await prisma.$queryRaw`
      SELECT
        dvc.id,
        dvc.content,
        1 - (dvc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
      FROM "DocumentVectorChunk" dvc
      INNER JOIN "KnowledgeDocument" kd ON kd.id = dvc."documentId"
      WHERE kd."organizationId" = ${doc.organizationId}
        AND dvc.embedding IS NOT NULL
      ORDER BY dvc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT 2
    `;
    console.log("Search results:", results);
  } catch (err) {
    console.error("Vector search failed:", err);
  }
}

main().finally(() => prisma.$disconnect());
