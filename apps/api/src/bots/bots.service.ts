import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BotsService {
  private readonly logger = new Logger(BotsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listar todos los bots de una organización
   */
  async listBots(organizationId: string) {
    return this.prisma.botInstance.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        phoneNumber: true,
        status: true,
        aiModel: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { conversations: true } },
      },
    });
  }

  /**
   * Crear una nueva instancia de bot
   */
  async createBot(organizationId: string, data: { name: string; systemPrompt?: string; aiModel?: string }) {
    // Generar tenantId único basado en org slug + timestamp
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organización no encontrada.');

    const tenantId = `${org.slug}-bot-${Date.now().toString(36)}`;

    const bot = await this.prisma.botInstance.create({
      data: {
        tenantId,
        name: data.name,
        systemPrompt: data.systemPrompt || 'Eres un asistente virtual profesional especializado en atención al cliente. Responde de manera concisa y amable.',
        aiModel: data.aiModel || 'gpt-4o-mini',
        organizationId,
      },
    });

    this.logger.log(`🤖 Bot creado: "${bot.name}" (tenantId: ${bot.tenantId}) para Org: ${org.name}`);
    return bot;
  }

  /**
   * Obtener un bot con verificación de pertenencia a la organización
   */
  async getBot(botId: string, organizationId: string) {
    const bot = await this.prisma.botInstance.findUnique({
      where: { id: botId },
      include: {
        _count: { select: { conversations: true } },
      },
    });

    if (!bot) throw new NotFoundException('Bot no encontrado.');
    if (bot.organizationId !== organizationId) throw new ForbiddenException('No tienes acceso a este bot.');

    return bot;
  }

  /**
   * Obtener un bot por su tenantId (usado internamente por el bot-engine)
   */
  async getBotByTenantId(tenantId: string) {
    const bot = await this.prisma.botInstance.findUnique({
      where: { tenantId },
    });
    return bot;
  }

  /**
   * Actualizar configuración de un bot
   */
  async updateBot(botId: string, organizationId: string, data: { name?: string; systemPrompt?: string; aiModel?: string }) {
    const bot = await this.getBot(botId, organizationId);

    const updated = await this.prisma.botInstance.update({
      where: { id: bot.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.systemPrompt !== undefined && { systemPrompt: data.systemPrompt }),
        ...(data.aiModel && { aiModel: data.aiModel }),
      },
    });

    this.logger.log(`✏️ Bot actualizado: "${updated.name}" (${updated.id})`);
    return updated;
  }

  /**
   * Listar conversaciones de un bot
   */
  async listConversations(botId: string, organizationId: string) {
    await this.getBot(botId, organizationId); // Verifica acceso

    return this.prisma.conversation.findMany({
      where: { botId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, sender: true, createdAt: true },
        },
      },
    });
  }

  /**
   * Obtener mensajes de una conversación
   */
  async getConversationMessages(conversationId: string, organizationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { bot: { select: { organizationId: true } } },
    });

    if (!conversation) throw new NotFoundException('Conversación no encontrada.');
    if (conversation.bot.organizationId !== organizationId) {
      throw new ForbiddenException('No tienes acceso a esta conversación.');
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
