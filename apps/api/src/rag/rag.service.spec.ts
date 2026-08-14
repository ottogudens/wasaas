import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService } from '../prisma/prisma.mock';

// Mocking OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [{ embedding: [0.1, 0.2, 0.3] }],
        }),
      },
    })),
  };
});

describe('RagService', () => {
  let service: RagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-api-key'),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chunkText', () => {
    it('should split text into chunks based on word count', () => {
      // Create a text with 100 words
      const text = Array(100).fill('word').join(' ');
      
      const chunks = service.chunkText(text, 60, 10);
      
      // Expected chunks:
      // Chunk 1: words 0-60 (size 60)
      // Chunk 2: words 50-100 (size 50)
      expect(chunks.length).toBe(2);
      expect(chunks[0].split(' ').length).toBe(60);
      expect(chunks[1].split(' ').length).toBe(50);
    });
  });

  describe('processAndStoreDocument', () => {
    it('should process document, generate chunks and embeddings', async () => {
      const doc = { id: 'doc_1', organizationId: 'org_1', title: 'Test Doc' };
      mockPrismaService.knowledgeDocument.create.mockResolvedValueOnce(doc as any);
      
      // Mock $executeRaw to return successfully
      mockPrismaService.$executeRaw.mockResolvedValueOnce(1 as any);
      
      const content = 'This is a short test document content.';
      
      const result = await service.processAndStoreDocument('org_1', 'Test Doc', content);
      
      expect(mockPrismaService.knowledgeDocument.create).toHaveBeenCalledWith({
        data: { organizationId: 'org_1', title: 'Test Doc' },
      });
      expect(result.documentId).toBe('doc_1');
      expect(result.chunksProcessed).toBe(1); // the text is short, so 1 chunk
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('searchSimilarChunks', () => {
    it('should return similar chunks using $queryRaw', async () => {
      const mockResults = [
        { id: 'chunk_1', content: 'similar text', similarity: 0.9 },
      ];
      mockPrismaService.$queryRaw.mockResolvedValueOnce(mockResults as any);
      
      const results = await service.searchSimilarChunks('query', 'org_1');
      
      expect(results).toEqual(mockResults);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
    
    it('should return empty array on error', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('DB Error'));
      
      const results = await service.searchSimilarChunks('query', 'org_1');
      
      expect(results).toEqual([]);
    });
  });
});
