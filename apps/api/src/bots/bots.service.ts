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
   * Vaciar todas las conversaciones de un bot
   */
  async clearAllConversations(botId: string, organizationId: string) {
    await this.getBot(botId, organizationId); // Valida propiedad y existencia

    const deleted = await this.prisma.conversation.deleteMany({
      where: { botId },
    });

    this.logger.log(`🧹 ${deleted.count} conversaciones eliminadas para el bot ${botId}`);
    return { success: true, count: deleted.count };
  }

  /**
   * Eliminar una conversación individual
   */
  async deleteConversation(conversationId: string, organizationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { bot: { select: { organizationId: true } } },
    });

    if (!conversation) throw new NotFoundException('Conversación no encontrada.');
    if (conversation.bot.organizationId !== organizationId) {
      throw new ForbiddenException('No tienes acceso a esta conversación.');
    }

    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    return { success: true };
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

    const newMode = isHumanMode !== undefined ? isHumanMode : !conversation.isHumanMode;

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { isHumanMode: newMode },
    });

    this.logger.log(`👤 Modo Humano ${newMode ? 'ACTIVADO' : 'DESACTIVADO'} para conversación ${conversationId} (${conversation.customerPhone})`);
    return updated;
  }

  /**
   * Send a Document / Invoicing / Quotation PDF
   */
  async sendDocument(botId: string, organizationId: string, dto: { customerPhone: string; documentTitle?: string; documentContent: string }) {
    const bot = await this.getBot(botId, organizationId);

    // 1. Buscar o crear la conversación para asociar el mensaje en el historial
    let conversation = await this.prisma.conversation.findFirst({
      where: { botId: bot.id, customerPhone: dto.customerPhone },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          botId: bot.id,
          customerPhone: dto.customerPhone,
        },
      });
    }

    // 2. Guardar mensaje en base de datos
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'AGENT',
        content: `📄 [DOCUMENTO GENERADO: ${dto.documentTitle || 'Documento'}]\n\n${dto.documentContent}`,
      },
    });

    // 3. Enviar a través de bot-engine por WhatsApp
    try {
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
        this.logger.error(`Error enviando documento a bot-engine: HTTP ${res.status}`);
      }
    } catch (err) {
      this.logger.error('Excepción enviando documento a bot-engine:', err);
    }

    return message;
  }

  /**
   * Start / Wake up a bot in bot-engine for QR code generation
   */
  async startBot(botId: string, organizationId: string, isSuperAdmin: boolean = false) {
    const bot = await this.getBot(botId, organizationId, isSuperAdmin);
    const botEngineUrl = process.env.BOT_ENGINE_URL || 'https://whatsapp-service-production-e6f2.up.railway.app';
    const apiKey = process.env.INTERNAL_API_KEY;

    // Guard: si ya está conectado, no hacer nada.
    if (bot.status === 'CONNECTED') {
      this.logger.warn(`⚠️ [startBot] Bot "${bot.name}" ya está CONNECTED — ignorando solicitud.`);
      return { success: true, message: 'Already connected' };
    }

    // Guard: si ya está iniciándose, no destruir la instancia Baileys en mitad
    // de la negociación de QR. El frontend sigue polinando y mostrará el QR
    // cuando llegue vía webhook (bot-engine → /bots/internal/webhook → BD).
    if (bot.status === 'CONNECTING') {
      this.logger.warn(`⚠️ [startBot] Bot "${bot.name}" ya está en CONNECTING — ignorando solicitud duplicada para evitar reinicio prematuro.`);
      return { success: true, pending: true, message: 'Already connecting — QR incoming via webhook' };
    }

    // Marcar como CONNECTING antes de llamar al engine
    await this.prisma.botInstance.update({
      where: { id: bot.id },
      data: { status: 'CONNECTING' as any },
    });

    try {
      this.logger.log(`🚀 [startBot] Solicitando arranque de instancia en bot-engine para "${bot.name}" (${bot.tenantId})...`);
      const res = await fetch(`${botEngineUrl}/internal/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
        },
        body: JSON.stringify({
          tenantId: bot.tenantId,
          name: bot.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Engine error (HTTP ${res.status})`);
      }

      return await res.json();
    } catch (err: any) {
      this.logger.error(`Error iniciando bot en engine: ${err.message}`);
      // Revertir estado a DISCONNECTED si falló la conexión con el motor
      if (bot.status !== 'CONNECTED') {
        await this.prisma.botInstance.update({
          where: { id: bot.id },
          data: { status: 'DISCONNECTED' as any },
        });
      }
      throw new Error(`Engine error: ${err.message}`);
    }
  }

  /**
   * Request pairing code from bot engine
   * El motor responde 202 Accepted inmediatamente y el código llega vía WebSocket/Webhook
   */
  async requestPairingCode(botId: string, organizationId: string, phoneNumber: string) {
    const bot = await this.getBot(botId, organizationId);
    const botEngineUrl = process.env.BOT_ENGINE_URL || 'https://whatsapp-service-production-e6f2.up.railway.app';
    const apiKey = process.env.INTERNAL_API_KEY;

    try {
      this.logger.log(`📱 [requestPairingCode] Solicitando código para bot "${bot.name}" (${bot.tenantId}) a ${botEngineUrl}/internal/pair-phone...`);
      const res = await fetch(`${botEngineUrl}/internal/pair-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
        },
        body: JSON.stringify({
          tenantId: bot.tenantId,
          phoneNumber,
        }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { error: rawText || `HTTP ${res.status}` };
      }

      // Aceptar 200 (código inmediato) y 202 (pending, código llegará vía WS/Webhook)
      if (!res.ok && res.status !== 202) {
        throw new Error(data.error || `Error del motor de WhatsApp (HTTP ${res.status})`);
      }

      // Actualizar estado del bot a CONNECTING mientras el motor negocia con WhatsApp
      await this.prisma.botInstance.update({
        where: { id: bot.id },
        data: { status: 'CONNECTING' as any },
      });

      // Si el código llegó inmediatamente (raro pero posible con 200)
      if (data.code) {
        await this.prisma.botInstance.update({
          where: { id: bot.id },
          data: {
            pairingCode: data.code,
            status: 'QR_READY' as any,
          },
        });
        this.logger.log(`✅ [requestPairingCode] Código guardado en BD para ${bot.name}: ${data.code}`);
      } else {
        this.logger.log(`⏳ [requestPairingCode] Vinculación iniciada para ${bot.name}. Código llegará vía WebSocket.`);
      }

      return { success: true, pending: !data.code, code: data.code || null };
    } catch (err: any) {
      this.logger.error(`Error requesting pairing code: ${err.message}`);
      throw new Error(`Engine error: ${err.message}`);
    }
  }
}
