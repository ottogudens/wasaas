import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { BotManager, BotManagerApi } from '@builderbot/manager';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { MetaProvider } from '@builderbot/provider-meta';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { fetchLatestBaileysVersion } from 'baileys';
import { WebSocketServer, WebSocket } from 'ws';
import QRCode from 'qrcode';

import cors from 'cors';

// En Railway se expone un único puerto público (PORT).
const PORT = process.env.PORT ? parseInt(process.env.PORT) : (process.env.BOT_ENGINE_PORT ? parseInt(process.env.BOT_ENGINE_PORT) : 3005);
const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';
const API_KEY = process.env.INTERNAL_API_KEY || 'skale-saas-secret-key';
const rawApiUrl = process.env.API_URL || 'https://wasaas-production.up.railway.app';
const formatUrl = (url: string) => {
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
};
const API_URL = formatUrl(rawApiUrl);

// Asegurar la creación del directorio de sesiones para volumen persistente
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  console.log(`📁 [BotEngine] Directorio de volúmenes persistentes creado en: ${path.resolve(SESSIONS_DIR)}`);
} else {
  console.log(`📂 [BotEngine] Directorio de sesiones listo en: ${path.resolve(SESSIONS_DIR)}`);
}

// Obtenemos dinámicamente la última versión soportada por las APIs de WhatsApp Web
const { version } = await fetchLatestBaileysVersion();
console.log(`🌐 [Baileys] Versión de WhatsApp Web obtenida de servidores oficiales: ${version.join('.')}`);

// --- Factory de flujos IA por tenant ---
// Cada bot obtiene su propio flujo con el tenantId capturado en la closure.
// Esto garantiza que cuando llega un mensaje, el tenantId correcto se envía a la API.
const createAiFlow = (tenantId: string) => {
  return addKeyword(EVENTS.WELCOME)
    .addAction(async (ctx: any, { flowDynamic }: { flowDynamic: any }) => {
      const userPrompt = ctx.body;
      const customerPhone = ctx.from;
      console.log(`🤖 [BotEngine] Mensaje de ${customerPhone} (Tenant: ${tenantId}): "${userPrompt}"`);

      let botReply = 'Lo siento, en este momento no puedo procesar tu solicitud. Intenta más tarde.';

      try {
        // Endpoint con contexto: carga prompt de BD, busca RAG, persiste historial
        const response = await fetch(`${API_URL}/ai/chat-with-context`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            customerPhone,
            message: userPrompt,
          }),
        });

        if (response.ok) {
          const data = await response.json();

          if (data.isHumanMode) {
            console.log(`✋ [BotEngine] Modo humano activo para ${customerPhone}. Ignorando IA.`);
            return;
          }

          if (data.reply) {
            botReply = data.reply;
          }
        } else {
          console.warn(`⚠️ [BotEngine] Respuesta HTTP ${response.status} desde /ai/chat-with-context`);
        }
      } catch (err) {
        console.warn('⚠️ Error al consultar el módulo NestJS AI API:', err);
      }

      await flowDynamic([{ body: botReply }]);
    });
};

// 1. Inicializar Orquestador de Instancias Multi-tenant
const manager = new BotManager({
  sessionsDir: SESSIONS_DIR,
  defaultProviderClass: BaileysProvider as any,
  defaultProviderOptions: {
    version,
    writeLog: true,
  },
});

// Interceptar la creación de cada bot para soporte multi-proveedor (Baileys / Meta Cloud API)
const originalCreateBot = manager.createBot.bind(manager);
manager.createBot = async (tenantConfig: any) => {
  console.log(`🚀 [BotEngine] Configurando proveedor para Tenant: ${tenantConfig.tenantId} (Proveedor: ${tenantConfig.provider || 'baileys'})...`);

  // Selección dinámica de clase de proveedor y opciones
  if (tenantConfig.provider === 'meta') {
    tenantConfig.providerClass = MetaProvider as any;
    tenantConfig.providerOptions = {
      jwtToken: tenantConfig.metaJwtToken || process.env.META_JWT_TOKEN || '',
      numberId: tenantConfig.metaNumberId || process.env.META_NUMBER_ID || '',
      verifyToken: tenantConfig.metaVerifyToken || process.env.META_VERIFY_TOKEN || '',
      version: tenantConfig.metaVersion || 'v18.0',
      port: PORT,
    };
  } else {
    // Proveedor por defecto: Baileys (Código QR / Pairing Code)
    tenantConfig.providerClass = BaileysProvider as any;
    if (!tenantConfig.providerOptions) {
      tenantConfig.providerOptions = {};
    }
    tenantConfig.providerOptions.version = version;
  }

  // Inyectar flujo dinámico con tenantId en closure si no trae flujos
  if (!tenantConfig.flows || tenantConfig.flows.length === 0) {
    tenantConfig.flows = [createAiFlow(tenantConfig.tenantId)];
  }

  const botInstance = await originalCreateBot(tenantConfig);

  const provider = botInstance.provider;
  if (provider && tenantConfig.provider !== 'meta') {
    // Escuchar el evento 'require_action' nativo de BaileysProvider que entrega el payload del QR o Pairing Code
    provider.on('require_action', async (actionData: any) => {
      const qrStr = actionData?.payload?.qr;
      const codeStr = actionData?.payload?.code;
      console.log(`⚡ [Baileys Native Event] 'require_action' recibido para Tenant ${tenantConfig.tenantId}. String QR: ${!!qrStr}, Code: ${codeStr || 'N/A'}`);
      if (qrStr) {
        (manager as any).emit('bot:qr', tenantConfig.tenantId, { qr: qrStr });
      }
      if (codeStr) {
        (manager as any).emit('bot:code', tenantConfig.tenantId, { code: codeStr });
      }
    });

    provider.on('qr', (qrStr: string) => {
      console.log(`⚡ [Baileys Native Event] 'qr' directo recibido para Tenant ${tenantConfig.tenantId}`);
      if (qrStr) {
        (manager as any).emit('bot:qr', tenantConfig.tenantId, { qr: qrStr });
      }
    });

    provider.on('ready', (data: any) => {
      console.log(`🎉 [Baileys Native Event] 'ready' recibido para Tenant ${tenantConfig.tenantId}:`, data);
      (manager as any).emit('bot:connected', tenantConfig.tenantId);
    });

    provider.on('host', (data: any) => {
      console.log(`🎉 [Baileys Native Event] 'host' recibido para Tenant ${tenantConfig.tenantId}:`, data);
      (manager as any).emit('bot:connected', tenantConfig.tenantId);
    });

    provider.on('message', (payload: any) => {
      console.log(`📩 [Baileys Raw Message] Tenant: ${tenantConfig.tenantId}, From: ${payload?.from || payload?.key?.remoteJid}, Body: ${payload?.body || payload?.message?.conversation}`);
      // Propagate message to Frontend Live Chat via WebSocket
      (manager as any).emit('bot:message', tenantConfig.tenantId, {
        from: payload?.from || payload?.key?.remoteJid,
        body: payload?.body || payload?.message?.conversation,
        name: payload?.name,
        timestamp: Date.now()
      });
    });

    // Forzar inicio del proveedor vendor de Baileys
    if (typeof provider.initVendor === 'function') {
      try {
        console.log(`🔄 [BotEngine] Invocando initVendor() explícitamente para Tenant: ${tenantConfig.tenantId}...`);
        await provider.initVendor();
      } catch (err) {
        console.warn(`⚠️  [BotEngine] Advertencia durante initVendor() para Tenant ${tenantConfig.tenantId}:`, err);
      }
    }
  }

  return botInstance;
};

// 2. Inicializar Servidor de API REST para el Manager
const managerApi = new BotManagerApi(manager, {
  port: PORT,
  apiKey: API_KEY,
} as any);

// 3. Iniciar el servidor HTTP Polka
managerApi.start();

// 4. Adjuntar el servidor de WebSockets con Aislamiento Multi-tenant
const httpServer = (managerApi as any).app?.server;
interface TenantWebSocket extends WebSocket {
  tenantId?: string;
}

const connectedClients = new Set<TenantWebSocket>();

if (httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: TenantWebSocket, req) => {
    // Extraer tenantId del URL params (ejemplo: ws://host:port/?tenantId=abc-123)
    const urlString = req.url || '';
    const queryParams = new URLSearchParams(urlString.includes('?') ? urlString.split('?')[1] : '');
    const clientTenantId = queryParams.get('tenantId') || undefined;

    ws.tenantId = clientTenantId;
    connectedClients.add(ws);
    console.log(`📡 [WebSocket] Cliente conectado (Tenant Scoped: ${clientTenantId || 'Global'})`);

    ws.on('close', () => {
      console.log(`🔌 [WebSocket] Cliente desconectado (Tenant: ${ws.tenantId || 'Global'})`);
      connectedClients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('❌ [WebSocket Error en Cliente]:', err);
    });
  });
  console.log(`🚀 [Bot Engine Worker] REST API & WebSockets compartiendo el puerto ${PORT}`);
} else {
  console.error('❌ [Bot Engine Error] No se pudo obtener el servidor HTTP para adjuntar WebSockets.');
}

const broadcast = (data: { tenantId?: string; [key: string]: any }) => {
  const payload = JSON.stringify(data);
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      // Filtrar el envío: enviar si el mensaje es global o si el tenantId del cliente coincide
      if (!data.tenantId || !client.tenantId || client.tenantId === data.tenantId) {
        client.send(payload);
      }
    }
  }
};

// 5. Suscribirse a eventos del Manager y generar QR DataURL oficial de Baileys
manager.on('bot:qr', async (tenantId: string, data: any) => {
  console.log(`⚡ [BotManager Event] Evento 'bot:qr' disparado para Tenant: ${tenantId}`);
  let qrImageBase64 = data.qr;

  if (!data || !data.qr) {
    console.error(`❌ [BotManager Error] Se recibió un evento 'bot:qr' pero el payload 'data.qr' está vacío para Tenant: ${tenantId}`);
    broadcast({
      event: 'bot:error',
      tenantId,
      error: 'El payload del código QR está vacío.',
    });
    return;
  }

  // Convertir string de Baileys a DataURL PNG Base64
  if (typeof data.qr === 'string' && !data.qr.startsWith('data:image')) {
    try {
      qrImageBase64 = await QRCode.toDataURL(data.qr, {
        margin: 2,
        scale: 8,
        errorCorrectionLevel: 'M',
      });
      console.log(`✅ [BotManager Success] String de Baileys convertido a PNG Base64 para Tenant: ${tenantId}`);
    } catch (err) {
      console.error(`❌ [BotManager Error] Falló la conversión de QR string a DataURL para Tenant ${tenantId}:`, err);
      broadcast({
        event: 'bot:error',
        tenantId,
        error: `Error procesando imagen QR: ${(err as Error).message}`,
      });
      return;
    }
  }

  broadcast({
    event: 'bot:qr',
    tenantId,
    qr: qrImageBase64,
  });
  console.log(`📡 [BotManager WebSocket] Evento 'bot:qr' emitido a clientes autorizados para Tenant ${tenantId}`);
});

(manager as any).on('bot:code', (tenantId: string, data: any) => {
  console.log(`📱 [BotManager Event] Evento 'bot:code' disparado para Tenant: ${tenantId}, Code: ${data?.code}`);
  broadcast({
    event: 'bot:code',
    tenantId,
    code: data?.code,
  });
});

manager.on('bot:connected', (tenantId: string) => {
  console.log(`🎉 [BotManager Event] WhatsApp Conectado exitosamente para Tenant: ${tenantId}`);
  broadcast({
    event: 'bot:connected',
    tenantId,
    status: 'CONNECTED',
  });
});

manager.on('bot:disconnected', (tenantId: string) => {
  console.log(`⚠️ [BotManager Event] WhatsApp Desconectado para Tenant: ${tenantId}`);
  broadcast({
    event: 'bot:disconnected',
    tenantId,
    status: 'DISCONNECTED',
  });
});

(manager as any).on('bot:message', (tenantId: string, data: any) => {
  console.log(`📡 [BotManager Event] bot:message para ${tenantId}:`, data);
  broadcast({
    event: 'bot:message',
    tenantId,
    ...data,
  });
});

(manager as any).on('error', (err: any) => {
  console.error('💥 [BotManager Global Error]:', err);
  broadcast({
    event: 'bot:error',
    error: typeof err === 'string' ? err : err?.message || 'Error interno en BotManager',
  });
});

// --- 6. Sincronización Webhook y Rehidratación ---
const notifyWebhook = async (payload: any) => {
  try {
    const res = await fetch(`${API_URL}/bots/internal/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`⚠️ [Webhook] Error ${res.status} al notificar ${payload.event} para ${payload.tenantId}`);
    }
  } catch (err) {
    console.warn(`⚠️ [Webhook] Fallo de conexión al notificar ${payload.event}: ${err}`);
  }
};

// Hookear eventos para Webhook
manager.on('bot:qr', (tenantId, data) => notifyWebhook({ event: 'bot:qr', tenantId, qr: typeof data?.qr === 'string' && data.qr.startsWith('data:image') ? data.qr : null }));
manager.on('bot:connected', (tenantId) => notifyWebhook({ event: 'connected', tenantId }));
manager.on('bot:disconnected', (tenantId) => notifyWebhook({ event: 'disconnected', tenantId }));
(manager as any).on('error', (err: any) => notifyWebhook({ event: 'error', error: err?.message || 'Error' }));

// --- 6.5 Configurar manejo de error de auth para BotInstances
const setupProviderListeners = (botInstance: any, tenantId: string) => {
  if (!botInstance || !botInstance.provider) return;
  botInstance.provider.on('auth_failure', async (err: any) => {
    console.error(`💥 [BotEngine] Error crítico de Auth (auth_failure) para ${tenantId}:`, err);
    try {
      await manager.removeBot(tenantId).catch(() => {});
      const tenantSessionDir = path.join(SESSIONS_DIR, tenantId);
      if (fs.existsSync(tenantSessionDir)) {
        fs.rmSync(tenantSessionDir, { recursive: true, force: true });
        console.log(`🧹 [BotEngine] Caché limpia para ${tenantId} debido a auth_failure.`);
      }
      notifyWebhook({ event: 'disconnected', tenantId });
    } catch (e) {
      console.error(`Error al limpiar sesión tras auth_failure de ${tenantId}:`, e);
    }
  });
};

// 7. Rehidratación (Arranque de Bots Activos) y Limpieza de Caché Huérfano
const cleanOrphanSessions = (activeTenantIds: string[]) => {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) return;
    const files = fs.readdirSync(SESSIONS_DIR);
    for (const file of files) {
      const isTenantActive = activeTenantIds.some(id => file.includes(id));
      if (!isTenantActive) {
        const fullPath = path.join(SESSIONS_DIR, file);
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`🧹 [CleanCache] Sesión huérfana o eliminada borrada de disco: ${fullPath}`);
      }
    }
  } catch (err) {
    console.warn('⚠️ Error al limpiar sesiones huérfanas:', err);
  }
};

const rehydrateBots = async () => {
  console.log('🔄 [BotEngine] Iniciando rehidratación de bots y limpieza de caché...');
  try {
    const res = await fetch(`${API_URL}/bots/internal/active-bots`, {
      headers: { 'x-api-key': API_KEY },
    });
    if (res.ok) {
      const bots = await res.json();
      const activeTenantIds = bots.map((b: any) => b.tenantId).filter(Boolean);
      
      // Limpiar de disco cualquier sesión de bots que ya fueron eliminados de la BD
      cleanOrphanSessions(activeTenantIds);

      console.log(`🔄 [BotEngine] Encontrados ${bots.length} bots activos para rehidratar.`);
      for (const bot of bots) {
        if (bot.tenantId) {
          try {
            console.log(`🔄 [BotEngine] Rehidratando ${bot.tenantId}...`);
            const botInstance = await manager.createBot({ tenantId: bot.tenantId, flows: [createAiFlow(bot.tenantId)] });
            setupProviderListeners(botInstance, bot.tenantId);
          } catch (err) {
            console.error(`❌ [BotEngine] Error rehidratando ${bot.tenantId}:`, err);
          }
        }
      }
    } else {
      console.warn(`⚠️ [BotEngine] No se pudieron obtener bots activos (HTTP ${res.status})`);
    }
  } catch (err) {
    console.warn('⚠️ [BotEngine] API inaccesible para rehidratación:', err);
  }
};

setTimeout(rehydrateBots, 3000); // Esperar 3s antes de rehidratar

// 8. Endpoints Custom sobre Polka
if ((managerApi as any).app) {
  const app = (managerApi as any).app;

  // Habilitar CORS global para permitir peticiones directas desde el Frontend (ej. generar QR o desconectar)
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
  }));

  app.post('/internal/start', async (req: any, res: any) => {
    const processRequest = async (bodyStr: string) => {
      try {
        const authHeader = req.headers['authorization'] || '';
        const apiKey = authHeader.replace('Bearer ', '').trim() || req.headers['x-api-key'];
        if (apiKey !== API_KEY) {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: 'Unauthorized' }));
        }

        const data = req.body && Object.keys(req.body).length > 0 ? req.body : JSON.parse(bodyStr || '{}');
        const { tenantId, name } = data;

        if (!tenantId) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Missing tenantId' }));
        }

        // Si ya existe la instancia, la removemos en lugar de retornar 409
        if (manager.getBot(tenantId)) {
          console.log(`🔄 [BotEngine] Bot ${tenantId} ya existía. Removiendo previa para generar QR nuevo (evitando 409)...`);
          await manager.removeBot(tenantId).catch(() => {});
        }

        const botInstance = await manager.createBot({
          tenantId,
          name: name || tenantId,
          flows: [createAiFlow(tenantId)],
        });
        setupProviderListeners(botInstance, tenantId);

        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, tenantId }));
      } catch (err: any) {
        console.error('❌ [BotEngine /internal/start Error]:', err);
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: err?.message || String(err) }));
      }
    };

    if (req.body && Object.keys(req.body).length > 0) {
      await processRequest('');
    } else {
      let body = '';
      req.on('data', (chunk: any) => body += chunk.toString());
      req.on('end', () => processRequest(body));
    }
  });

  // Helper para leer body de req dinámicamente
  const getParsedBody = async (req: any) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      return req.body;
    }
    if (typeof req.body === 'string' && req.body.trim()) {
      try { return JSON.parse(req.body); } catch (e) {}
    }
    return new Promise<any>((resolve) => {
      let raw = '';
      req.on('data', (chunk: any) => raw += chunk.toString());
      req.on('end', () => {
        try { resolve(JSON.parse(raw || '{}')); } catch (e) { resolve({}); }
      });
      if (req.readableEnded || req.complete) {
        try { resolve(JSON.parse(raw || '{}')); } catch (e) { resolve({}); }
      }
    });
  };

  // Endpoint Manual Send Message
  app.post('/internal/send-message', async (req: any, res: any) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== API_KEY) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: 'Unauthorized' }));
      }

      const data = await getParsedBody(req);
      const { tenantId, customerPhone, message } = data;

      if (!tenantId || !customerPhone || !message) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Missing params', received: data }));
      }

      const botInstance = manager.getBot(tenantId);
      if (!botInstance) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: 'Bot not found or not connected' }));
      }

      const provider = botInstance.provider as any;
      if (typeof provider.sendMessage === 'function') {
        await provider.sendMessage(customerPhone, message, {});
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true }));
      } else {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: 'Provider does not support sendMessage directly' }));
      }
    } catch (err) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: String(err) }));
    }
  });

  // Endpoint de Prueba Simulación de Mensaje Entrante
  app.post('/internal/test-message', async (req: any, res: any) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== API_KEY) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: 'Unauthorized' }));
      }
      const data = await getParsedBody(req);
      const botInstance = manager.getBot(data.tenantId);
      if (botInstance && botInstance.provider) {
        botInstance.provider.emit('message', {
          from: data.phone || '1234567890',
          body: data.message || 'hola',
          message: { conversation: data.message || 'hola' }
        });
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, text: 'emitted' }));
      }
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: 'Bot not found' }));
    } catch (err) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: String(err) }));
    }
  });

  // Endpoint para obtener estado de un bot
  app.get('/internal/bot-status/:tenantId', async (req: any, res: any) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== API_KEY) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: 'Unauthorized' }));
      }

      const tenantId = req.params?.tenantId || '';
      const botInstance = manager.getBot(tenantId);

      if (!botInstance) {
        res.statusCode = 200;
        return res.end(JSON.stringify({ status: 'NOT_RUNNING', tenantId }));
      }

      res.statusCode = 200;
      return res.end(JSON.stringify({
        status: botInstance.status || 'unknown',
        tenantId,
        isConnected: botInstance.status === 'connected',
      }));
    } catch (err) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: String(err) }));
    }
  });

  // Helper para eliminar archivos de sesión en disco
  const cleanSessionFiles = (tenantId: string) => {
    try {
      if (!fs.existsSync(SESSIONS_DIR)) return;
      const files = fs.readdirSync(SESSIONS_DIR);
      for (const file of files) {
        if (file.includes(tenantId)) {
          const fullPath = path.join(SESSIONS_DIR, file);
          fs.rmSync(fullPath, { recursive: true, force: true });
          console.log(`🗑️ [SessionClean] Sesión borrada de disco: ${fullPath}`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Error borrando sesión en disco para ${tenantId}:`, err);
    }
  };

  // Endpoint de pairing code (vincular por teléfono)
  app.post('/internal/pair-phone', async (req: any, res: any) => {
    const processRequest = async (bodyStr: string) => {
      try {
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== API_KEY) {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: 'Unauthorized' }));
        }

        const data = req.body && Object.keys(req.body).length > 0 ? req.body : JSON.parse(bodyStr || '{}');
        const { tenantId, phoneNumber } = data;

        if (!tenantId || !phoneNumber) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Missing tenantId or phoneNumber' }));
        }

        const cleanNumber = phoneNumber.replace(/[\s\-\+]/g, '');

        let botInstance = manager.getBot(tenantId);
        if (botInstance) {
          console.log(`📱 [BotEngine] Removiendo bot anterior para pairing code...`);
          await manager.removeBot(tenantId).catch(() => {});
        }
        cleanSessionFiles(tenantId);

        console.log(`📱 [BotEngine] Creando instancia con pairing code para ${cleanNumber} (Tenant: ${tenantId})...`);
        
        botInstance = await manager.createBot({
          tenantId,
          flows: [createAiFlow(tenantId)],
        });
        setupProviderListeners(botInstance, tenantId);

        const provider = botInstance.provider as any;

        const code = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout esperando código de Baileys')), 25000);
          
          setTimeout(async () => {
            try {
               const sock = provider.vendor || provider.socket || provider.sock;
               if (!sock || !sock.requestPairingCode) {
                 clearTimeout(timeout);
                 return reject(new Error('El proveedor de WhatsApp no soporta pairing code'));
               }
               const rawCode = await sock.requestPairingCode(cleanNumber);
               clearTimeout(timeout);
               resolve(rawCode);
            } catch (err) {
               clearTimeout(timeout);
               reject(err);
            }
          }, 3000); // Wait for Baileys WS to connect
        });

        console.log(`✅ [BotEngine] Pairing code generado para ${tenantId}: ${code}`);
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, code }));

      } catch (err: any) {
        console.error('❌ [BotEngine] Error generando pairing code:', err);
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: err?.message || String(err) }));
      }
    };

    if (req.body && Object.keys(req.body).length > 0) {
      await processRequest('');
    } else {
      let body = '';
      req.on('data', (chunk: any) => body += chunk.toString());
      req.on('end', () => processRequest(body));
    }
  });

  // Endpoint para desconectar un bot y notificar a la API
  app.post('/internal/disconnect', async (req: any, res: any) => {
    const processRequest = async (bodyStr: string) => {
      try {
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== API_KEY) {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: 'Unauthorized' }));
        }

        const data = req.body && Object.keys(req.body).length > 0 ? req.body : JSON.parse(bodyStr || '{}');
        const { tenantId } = data;

        if (!tenantId) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Missing tenantId' }));
        }

        const botInstance = manager.getBot(tenantId);
        if (botInstance) {
          const provider = botInstance.provider as any;
          const sock = provider?.vendor || provider?.globalVendorArgs || provider?.socket || provider?.sock;
          if (sock && typeof sock.logout === 'function') {
            try {
              console.log(`🚪 [BotEngine] Cerrando sesión WhatsApp (logout) para ${tenantId}...`);
              await sock.logout();
            } catch (e) {
              console.warn(`⚠️ Error durante sock.logout() para ${tenantId}:`, e);
            }
          }
        }

        const removed = await manager.removeBot(tenantId);
        cleanSessionFiles(tenantId);

        // Notificar a la API que se desconectó
        await notifyWebhook({ event: 'disconnected', tenantId });

        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, removed }));
      } catch (err) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: String(err) }));
      }
    };

    if (req.body && Object.keys(req.body).length > 0) {
      await processRequest('');
    } else {
      let body = '';
      req.on('data', (chunk: any) => body += chunk.toString());
      req.on('end', () => processRequest(body));
    }
  });
}
