import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { TranscriptionService } from './transcription.service';
import { mockPrismaService } from '../prisma/prisma.mock';

// Mocking OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Mocked response' } }],
          }),
        },
      },
    })),
  };
});

describe('AiService', () => {
  let service: AiService;
  let ragService: jest.Mocked<RagService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'OPENAI_API_KEY') return 'test-api-key';
              return null;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RagService,
          useValue: {
            findCachedMemory: jest.fn(),
            searchSimilarChunks: jest.fn().mockResolvedValue([]),
            storeMemory: jest.fn(),
          },
        },
        {
          provide: TranscriptionService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    ragService = module.get(RagService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chatWithContext', () => {
    const tenantId = 'tenant_1';
    const customerPhone = '56912345678';
    const userMessage = 'Hola';

    it('should return error if bot is not found', async () => {
      mockPrismaService.botInstance.findUnique.mockResolvedValueOnce(null);

      const result = await service.chatWithContext(tenantId, customerPhone, userMessage);
      
      expect(result.reply).toContain('no está configurado');
      expect(result.conversationId).toBe('');
    });

    it('should create new conversation if not exists', async () => {
      const mockBot = { id: 'bot_1', name: 'Test Bot', organizationId: 'org_1' };
      const mockConversation = { id: 'conv_1', botId: mockBot.id, customerPhone };
      
      mockPrismaService.botInstance.findUnique.mockResolvedValueOnce(mockBot as any);
      mockPrismaService.conversation.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.conversation.create.mockResolvedValueOnce(mockConversation as any);
      mockPrismaService.message.findMany.mockResolvedValueOnce([]);

      const result = await service.chatWithContext(tenantId, customerPhone, userMessage);
      
      expect(mockPrismaService.conversation.create).toHaveBeenCalledWith({
        data: { botId: mockBot.id, customerPhone },
      });
      expect(result.conversationId).toBe('conv_1');
      expect(result.reply).toBe('Mocked response');
    });

    it('should detect human handover and update conversation mode', async () => {
      const mockBot = { id: 'bot_1', name: 'Test Bot', organizationId: 'org_1' };
      const mockConversation = { id: 'conv_1', botId: mockBot.id, customerPhone, isHumanMode: false };
      
      mockPrismaService.botInstance.findUnique.mockResolvedValueOnce(mockBot as any);
      mockPrismaService.conversation.findFirst.mockResolvedValueOnce(mockConversation as any);
      mockPrismaService.conversation.update.mockResolvedValueOnce(mockConversation as any);
      
      const result = await service.chatWithContext(tenantId, customerPhone, 'quiero hablar con humano');
      
      expect(result.isHumanMode).toBe(true);
      expect(result.reply).toContain('He derivado tu solicitud');
      expect(mockPrismaService.conversation.update).toHaveBeenCalled();
    });

    it('should use semantic caching if available', async () => {
      const mockBot = { id: 'bot_1', name: 'Test Bot', organizationId: 'org_1' };
      const mockConversation = { id: 'conv_1', botId: mockBot.id, customerPhone, isHumanMode: false };
      
      mockPrismaService.botInstance.findUnique.mockResolvedValueOnce(mockBot as any);
      mockPrismaService.conversation.findFirst.mockResolvedValueOnce(mockConversation as any);
      mockPrismaService.message.findMany.mockResolvedValueOnce([]);
      
      ragService.findCachedMemory.mockResolvedValueOnce({ replyText: 'Respuesta desde caché' } as any);
      
      const result = await service.chatWithContext(tenantId, customerPhone, userMessage);
      
      expect(result.reply).toBe('Respuesta desde caché');
      // OpenAI should not be called since we didn't mock any OpenAI calls in this branch
    });
  });
});
