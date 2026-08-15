import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BotsService {
  private readonly logger = new Logger(BotsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listar todos los bots de una organización (o todos si es SUPER_ADMIN)
   */
  async listBots(organizationId: string, isSuperAdmin: boolean = false) {
    const where = isSuperAdmin ? {} : { organizationId };
    return this.prisma.botInstance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        phoneNumber: true,
        provider: true,
        status: true,
        aiModel: true,
        systemPrompt: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { conversations: true } },
      },
    });
  }

  /**
   * Crear una nueva instancia de bot
   */
  async createBot(organizationId: string, data: { name: string; systemPrompt?: string; aiModel?: string; provider?: string; metaJwtToken?: string; metaNumberId?: string; metaVerifyToken?: string }) {
    // Generar tenantId único basado en org slug + timestamp
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscriptions: true, bots: true },
    });
    if (!org) throw new NotFoundException('Organización no encontrada.');

    const sub = org.subscriptions?.[0];
    const botCount = org.bots?.length || 0;

    // Verificar si la prueba gratuita (TRIAL) ha expirado (7 días)
    if (sub && sub.plan === 'TRIAL') {
      const now = new Date();
      if (sub.currentPeriodEnd && now > new Date(sub.currentPeriodEnd)) {
        // Actualizar estado a TRIAL_EXPIRED
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'TRIAL_EXPIRED' as any },
        });
        throw new ForbiddenException('Tu prueba gratuita de 7 días ha finalizado. Por favor adquiere un plan de pago para continuar usando tus agentes.');
      }
      if (botCount >= 1) {
        throw new ForbiddenException('El periodo de prueba gratuita permite un máximo de 1 agente. Elige un plan de pago para crear más agentes.');
      }
    } else if (sub && sub.plan === 'STARTER' && botCount >= 1) {
      throw new ForbiddenException('El Plan Starter permite 1 agente activo. Actualiza al Plan Pro para agregar más agentes.');
    }

    const tenantId = `${org.slug}-bot-${Date.now().toString(36)}`;

    const bot = await this.prisma.botInstance.create({
      data: {
        tenantId,
        name: data.name,
        provider: data.provider || 'baileys',
        metaJwtToken: data.metaJwtToken,
        metaNumberId: data.metaNumberId,
        metaVerifyToken: data.metaVerifyToken,
        systemPrompt: data.systemPrompt || 'Eres un asistente virtual profesional especializado en atención al cliente. Responde de manera concisa y amable.',
        aiModel: data.aiModel || 'gpt-4o-mini',
        organizationId,
      },
    });

    this.logger.log(`🤖 Bot creado: "${bot.name}" (tenantId: ${bot.tenantId}) para Org: ${org.name}`);
    return bot;
  }

  /**
   * Obtener un bot con verificación de pertenencia a la organización (o acceso total si es SUPER_ADMIN)
   */
  async getBot(botId: string, organizationId: string, isSuperAdmin: boolean = false) {
    const bot = await this.prisma.botInstance.findUnique({
      where: { id: botId },
      include: {
        _count: { select: { conversations: true } },
      },
    });

    if (!bot) throw new NotFoundException('Bot no encontrado.');
    if (!isSuperAdmin && bot.organizationId !== organizationId) throw new ForbiddenException('No tienes acceso a este bot.');

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
  async updateBot(botId: string, organizationId: string, data: { name?: string; systemPrompt?: string; aiModel?: string; provider?: string; metaJwtToken?: string; metaNumberId?: string; metaVerifyToken?: string }, isSuperAdmin: boolean = false) {
    const bot = await this.getBot(botId, organizationId, isSuperAdmin);

    const updated = await this.prisma.botInstance.update({
      where: { id: bot.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.systemPrompt !== undefined && { systemPrompt: data.systemPrompt }),
        ...(data.aiModel && { aiModel: data.aiModel }),
        ...(data.provider && { provider: data.provider }),
        ...(data.metaJwtToken !== undefined && { metaJwtToken: data.metaJwtToken }),
        ...(data.metaNumberId !== undefined && { metaNumberId: data.metaNumberId }),
        ...(data.metaVerifyToken !== undefined && { metaVerifyToken: data.metaVerifyToken }),
      },
    });

    this.logger.log(`✏️ Bot actualizado: "${updated.name}" (${updated.id})`);
    return updated;
  }

  /**
   * Eliminar un bot y detenerlo en el engine
   */
  async deleteBot(botId: string, organizationId: string) {
    const bot = await this.getBot(botId, organizationId);

    // Intentar detener el bot en el engine
    try {
      const botEngineUrl = process.env.BOT_ENGINE_URL || 'https://whatsapp-service-production-e6f2.up.railway.app';
      const apiKey = process.env.INTERNAL_API_KEY;

      await fetch(`${botEngineUrl}/internal/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ tenantId: bot.tenantId }),
      });
    } catch (err) {
      this.logger.warn(`⚠️ No se pudo detener el bot en el engine: ${err}`);
    }

    // 1. Eliminar mensajes y conversaciones asociadas para evitar errores de clave foránea en Postgres
    try {
      await this.prisma.message.deleteMany({
        where: { conversation: { botId: bot.id } },
      });
      await this.prisma.conversation.deleteMany({
        where: { botId: bot.id },
      });
    } catch (err) {
      this.logger.warn(`⚠️ Error al limpiar conversaciones previas del bot ${bot.id}: ${err}`);
    }

    // 2. Eliminar de la BD
    try {
      await this.prisma.botInstance.delete({
        where: { id: bot.id },
      });
      this.logger.log(`🗑️ Bot eliminado: "${bot.name}" (${bot.tenantId})`);
    } catch (err: any) {
      if (err.code === 'P2025') {
        this.logger.warn(`⚠️ El bot ${bot.id} ya fue eliminado de la BD.`);
      } else {
        throw err;
      }
    }
    
    return { success: true, deletedId: bot.id };
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

  /**
   * Internal: Get all registered bots for rehydration after restart/deploy
   */
  async getActiveBots() {
    return this.prisma.botInstance.findMany({
      select: { tenantId: true, name: true, status: true },
    });
  }

  /**
   * Internal: Handle webhook events from bot-engine
   */
  async handleWebhook(data: any) {
    const { event, tenantId, qr, error } = data;
    if (!tenantId) return { success: false, message: 'Missing tenantId' };

    const bot = await this.prisma.botInstance.findUnique({ where: { tenantId } });
    if (!bot) return { success: false, message: 'Bot not found' };

    let newStatus = bot.status;
    let newQr = bot.qrCode;
    let newPairingCode = bot.pairingCode;

    switch (event) {
      case 'bot:qr':
        newStatus = 'QR_READY';
        newQr = qr;
        newPairingCode = null;
        break;
      case 'bot:code':
        newStatus = 'QR_READY'; // Keep it QR_READY so UI shows the code
        newPairingCode = data.code;
        break;
      case 'bot:ready':
      case 'connected':
        newStatus = 'CONNECTED';
        newQr = null; // Clear QR once connected
        newPairingCode = null;
        break;
      case 'bot:disconnected':
      case 'disconnected':
        newStatus = 'DISCONNECTED';
        newQr = null;
        newPairingCode = null;
        break;
      case 'bot:error':
      case 'error':
        newStatus = 'ERROR';
        break;
    }

    await this.prisma.botInstance.update({
      where: { id: bot.id },
      data: {
        status: newStatus as any,
        qrCode: newQr,
        pairingCode: newPairingCode,
      },
    });

    this.logger.log(`🔄 Webhook status update: Bot ${bot.name} (${tenantId}) -> ${newStatus}`);
    return { success: true };
  }

  /**
   * Send a manual message as an agent
   */
  async sendManualMessage(conversationId: string, organizationId: string, content: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { bot: true },
    });

    if (!conversation) throw new NotFoundException('Conversación no encontrada.');
    if (conversation.bot.organizationId !== organizationId) {
      throw new ForbiddenException('No tienes acceso a esta conversación.');
    }

    // Activar modo humano (Handoff)
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { isHumanMode: true, updatedAt: new Date() },
    });

    // Guardar mensaje en DB
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'AGENT',
        content,
      },
    });

    // Enviar mensaje real a WhatsApp a través del bot-engine
    try {
      const botEngineUrl = process.env.BOT_ENGINE_URL || 'https://whatsapp-service-production-e6f2.up.railway.app';
      const apiKey = process.env.INTERNAL_API_KEY;
      
      const res = await fetch(`${botEngineUrl}/internal/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          tenantId: conversation.bot.tenantId,
          customerPhone: conversation.customerPhone,
          message: content,
        }),
      });

      if (!res.ok) {
        this.logger.error(`Error enviando mensaje manual a bot-engine: HTTP ${res.status}`);
      }
    } catch (err) {
      this.logger.error('Excepción enviando mensaje a bot-engine:', err);
    }

    return message;
  }

  /**
   * Alternar modo humano (isHumanMode) para activar/desactivar mensajes manuales vs IA
   */
  async toggleHumanMode(conversationId: string, organizationId: string, isHumanMode?: boolean) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { bot: true },
    });

    if (!conversation) throw new NotFoundException('Conversación no encontrada.');
    if (conversation.bot.organizationId !== organizationId) {
      throw new ForbiddenException('No tienes acceso a esta conversación.');
    }

    const nextMode = isHumanMode !== undefined ? isHumanMode : !conversation.isHumanMode;
    const updated = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { isHumanMode: nextMode, updatedAt: new Date() },
    });

    this.logger.log(`👤 Modo Humano ${nextMode ? 'ACTIVADO' : 'DESACTIVADO'} para conversación ${conversation.id}`);
    return updated;
  }

  /**
   * Enviar documento generado por WhatsApp a través del bot-engine.
   * Este método actúa como proxy server-side para que la INTERNAL_API_KEY
   * NUNCA salga al navegador del usuario.
   */
  async sendDocument(botId: string, organizationId: string, dto: {
    customerPhone: string;
    documentTitle?: string;
    documentContent: string;
  }) {
    const bot = await this.getBot(botId, organizationId);

    const botEngineUrl = process.env.BOT_ENGINE_URL || 'https://whatsapp-service-production-e6f2.up.railway.app';
    const apiKey = process.env.INTERNAL_API_KEY;

    const res = await fetch(`${botEngineUrl}/internal/send-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        tenantId: bot.tenantId,
        customerPhone: dto.customerPhone,
        documentTitle: dto.documentTitle,
        documentContent: dto.documentContent,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      this.logger.error(`Error enviando documento a bot-engine: HTTP ${res.status} — ${errText}`);
      throw new Error(`Error al enviar documento por WhatsApp: HTTP ${res.status}`);
    }

    return res.json();
  }

  /**
   * Solicitar código de vinculación por número telefónico
   */
  async requestPairingCode(botId: string, organizationId: string, phoneNumber: string) {
    const bot = await this.getBot(botId, organizationId);
    
    // update status to connecting
    await this.prisma.botInstance.update({
      where: { id: bot.id },
      data: { status: 'CONNECTING' },
    });

    try {
      const botEngineUrl = process.env.BOT_ENGINE_URL || 'https://whatsapp-service-production-e6f2.up.railway.app';
      const apiKey = process.env.INTERNAL_API_KEY;
      
      const res = await fetch(`${botEngineUrl}/internal/pair-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          tenantId: bot.tenantId,
          phoneNumber,
        }),
      });

      if (!res.ok) {
        throw new Error(`Error en bot-engine pair-phone: HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      this.logger.error('Excepción requestPairingCode:', err);
      throw new Error('No se pudo solicitar el código de vinculación');
    }
  }
}
