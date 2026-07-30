import 'dotenv/config';
import { BotManager, BotManagerApi } from '@builderbot/manager';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { fetchLatestBaileysVersion } from 'baileys';
import { WebSocketServer, WebSocket } from 'ws';
import QRCode from 'qrcode';

import fs from 'fs';
import path from 'path';

// En Railway se expone un único puerto público (PORT).
const PORT = process.env.PORT ? parseInt(process.env.PORT) : (process.env.BOT_ENGINE_PORT ? parseInt(process.env.BOT_ENGINE_PORT) : 3005);
const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';
const API_KEY = process.env.INTERNAL_API_KEY || 'skale-saas-secret-key';
const API_URL = process.env.API_URL || 'https://wasaas-production.up.railway.app';

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
console.log(`📂 [BotManager] Directorio de sesiones: ${SESSIONS_DIR}`);
const manager = new BotManager({
  sessionsDir: SESSIONS_DIR,
  defaultProviderClass: BaileysProvider as any,
  defaultProviderOptions: {
    version,
    writeLog: true,
  },
});

// Interceptar la creación de cada bot para asegurar inicio explícito e instrumentación de eventos
const originalCreateBot = manager.createBot.bind(manager);
manager.createBot = async (tenantConfig: any) => {
  console.log(`🚀 [BotEngine] Creando e inicializando proveedor de WhatsApp para Tenant: ${tenantConfig.tenantId}...`);

  // Inyectar versión dinámica si no se especifica
  if (!tenantConfig.providerOptions) {
    tenantConfig.providerOptions = {};
  }
  tenantConfig.providerOptions.version = version;

  // Inyectar flujo dinámico con tenantId en closure si no trae flujos
  if (!tenantConfig.flows || tenantConfig.flows.length === 0) {
    tenantConfig.flows = [createAiFlow(tenantConfig.tenantId)];
  }

  const botInstance = await originalCreateBot(tenantConfig);

  const provider = botInstance.provider;
  if (provider) {
    // Escuchar el evento 'require_action' nativo de BaileysProvider que entrega el payload del QR
    provider.on('require_action', async (actionData: any) => {
      const qrStr = actionData?.payload?.qr;
      console.log(`⚡ [Baileys Native Event] 'require_action' recibido para Tenant ${tenantConfig.tenantId}. String QR: ${!!qrStr}`);
      if (qrStr) {
        (manager as any).emit('bot:qr', tenantConfig.tenantId, { qr: qrStr });
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

// Registrar un flujo "placeholder" en el registry de la API (los flujos reales se crean dinámicamente)
managerApi.registerFlow('default_ai_flow', 'Flujo IA Multitenant', createAiFlow('_placeholder_'));

// 3. Iniciar el servidor HTTP Polka
managerApi.start();

// 4. Adjuntar el servidor de WebSockets al mismo puerto HTTP (Polka server)
const httpServer = (managerApi as any).app?.server;
const connectedClients = new Set<WebSocket>();

if (httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: WebSocket) => {
    console.log('📡 [WebSocket] Cliente Frontend conectado desde navegador (Puerto Compartido HTTP/WS)');
    connectedClients.add(ws);

    ws.on('close', () => {
      console.log('📌 [WebSocket] Cliente Frontend desconectado');
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

const broadcast = (data: object) => {
  const payload = JSON.stringify(data);
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
};

// 5. Suscribirse a eventos del Manager y generar QR DataURL oficial de Baileys
manager.on('bot:qr', async (tenantId: string, data: any) => {
  console.log(`⚡ [BotManager Event] Evento 'bot:qr' disparado para Tenant: ${tenantId}`);
  let qrImageBase64 = data.qr;

  if (!data || !data.qr) {
    console.error(`❌ [BotManager Error] Se recibió un evento 'bot:qr' pero el payload 'data.qr' está vacío o indefinido para Tenant: ${tenantId}`);
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
      console.log(`✅ [BotManager Success] String de Baileys convertido exitosamente a Base64 PNG para Tenant: ${tenantId}`);
    } catch (err) {
      console.error(`❌ [BotManager Error] Falló la conversión de QR string a DataURL en QRCode.toDataURL para Tenant ${tenantId}:`, err);
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
  console.log(`📡 [BotManager WebSocket] Evento 'bot:qr' emitido a ${connectedClients.size} clientes WebSocket activos.`);
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

// 7. Rehidratación (Arranque de Bots Activos)
const rehydrateBots = async () => {
  console.log('🔄 [BotEngine] Iniciando rehidratación de bots...');
  try {
    const res = await fetch(`${API_URL}/bots/internal/active-bots`, {
      headers: { 'x-api-key': API_KEY },
    });
    if (res.ok) {
      const bots = await res.json();
      console.log(`🔄 [BotEngine] Encontrados ${bots.length} bots activos para rehidratar.`);
      for (const bot of bots) {
        if (bot.tenantId) {
          try {
            console.log(`🔄 [BotEngine] Rehidratando ${bot.tenantId}...`);
            // Cada bot recibe su propio flujo con tenantId en closure
            await manager.createBot({ tenantId: bot.tenantId, flows: [createAiFlow(bot.tenantId)] });
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

  // Endpoint Manual Send Message
  app.post('/internal/send-message', async (req: any, res: any) => {
    let body = '';
    req.on('data', (chunk: any) => body += chunk.toString());
    req.on('end', async () => {
      try {
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== API_KEY) {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: 'Unauthorized' }));
        }

        const data = JSON.parse(body);
        const { tenantId, customerPhone, message } = data;

        if (!tenantId || !customerPhone || !message) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Missing params' }));
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
    let body = '';
    req.on('data', (chunk: any) => body += chunk.toString());
    req.on('end', async () => {
      try {
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== API_KEY) {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: 'Unauthorized' }));
        }

        const data = JSON.parse(body);
        const { tenantId, phoneNumber } = data;

        if (!tenantId || !phoneNumber) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Missing tenantId or phoneNumber' }));
        }

        const cleanNumber = phoneNumber.replace(/[\s\-\+]/g, '');

        let botInstance = manager.getBot(tenantId);
        if (!botInstance) {
          console.log(`📱 [BotEngine] Creando instancia con pairing code para ${tenantId}...`);
          botInstance = await manager.createBot({
            tenantId,
            flows: [createAiFlow(tenantId)],
            providerOptions: { usePairingCode: true }
          });
        }

        const provider = botInstance.provider as any;
        
        // Esperar brevemente a que el socket de Baileys esté instanciado
        let sock = provider?.vendor || provider?.globalVendorArgs || provider?.socket || provider?.sock;
        let attempts = 0;
        while (!sock && attempts < 10) {
          await new Promise(r => setTimeout(r, 500));
          sock = provider?.vendor || provider?.globalVendorArgs || provider?.socket || provider?.sock;
          attempts++;
        }

        if (!sock || typeof sock.requestPairingCode !== 'function') {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'El socket de Baileys aún no está listo. Intenta de nuevo en unos segundos.' }));
        }

        console.log(`📱 [BotEngine] Generando pairing code para ${cleanNumber} (Tenant: ${tenantId})...`);
        const rawCode = await sock.requestPairingCode(cleanNumber);
        const code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
        console.log(`✅ [BotEngine] Pairing code generado para ${tenantId}: ${code}`);

        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, code }));
      } catch (err: any) {
        console.error('❌ [BotEngine] Error generando pairing code:', err);
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: err?.message || String(err) }));
      }
    });
  });

  // Endpoint para desconectar un bot y notificar a la API
  app.post('/internal/disconnect', async (req: any, res: any) => {
    let body = '';
    req.on('data', (chunk: any) => body += chunk.toString());
    req.on('end', async () => {
      try {
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== API_KEY) {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: 'Unauthorized' }));
        }

        const data = JSON.parse(body);
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
    });
  });
}
