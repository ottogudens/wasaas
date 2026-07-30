import 'dotenv/config';
import { BotManager, BotManagerApi } from '@builderbot/manager';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { fetchLatestBaileysVersion } from 'baileys';
import { WebSocketServer, WebSocket } from 'ws';
import QRCode from 'qrcode';

// En Railway se expone un Ãºnico puerto pÃºblico (PORT).
const PORT = process.env.PORT ? parseInt(process.env.PORT) : (process.env.BOT_ENGINE_PORT ? parseInt(process.env.BOT_ENGINE_PORT) : 3005);
const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';
const API_KEY = process.env.INTERNAL_API_KEY || 'skale-saas-secret-key';
const API_URL = process.env.API_URL || 'http://localhost:3001';

// Obtenemos dinÃ¡micamente la Ãºltima versiÃ³n soportada por las APIs de WhatsApp Web
const { version } = await fetchLatestBaileysVersion();
console.log(`ðŸŒ [Baileys] VersiÃ³n de WhatsApp Web obtenida de servidores oficiales: ${version.join('.')}`);

// 1. Inicializar Orquestador de Instancias Multi-tenant
console.log(`ðŸ“‚ [BotManager] Directorio de sesiones: ${SESSIONS_DIR}`);
const manager = new BotManager({
  sessionsDir: SESSIONS_DIR,
  defaultProviderClass: BaileysProvider as any,
  defaultProviderOptions: {
    version,
    writeLog: true,
  },
});

// Interceptar la creaciÃ³n de cada bot para asegurar inicio explÃ­cito e instrumentaciÃ³n de eventos
const originalCreateBot = manager.createBot.bind(manager);
manager.createBot = async (tenantConfig: any) => {
  console.log(`ðŸš€ [BotEngine] Creando e inicializando proveedor de WhatsApp para Tenant: ${tenantConfig.tenantId}...`);
  
  // Inyectar versiÃ³n dinÃ¡mica si no se especifica
  if (!tenantConfig.providerOptions) {
    tenantConfig.providerOptions = {};
  }
  tenantConfig.providerOptions.version = version;

  const botInstance = await originalCreateBot(tenantConfig);

  const provider = botInstance.provider;
  if (provider) {
    // Escuchar el evento 'require_action' nativo de BaileysProvider que entrega el payload del QR
    provider.on('require_action', async (actionData: any) => {
      const qrStr = actionData?.payload?.qr;
      console.log(`âš¡ [Baileys Native Event] 'require_action' recibido para Tenant ${tenantConfig.tenantId}. String QR: ${!!qrStr}`);
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

    provider.on('message', (payload: any) => {
      if (payload) {
        payload._tenantId = tenantConfig.tenantId;
      }
    });


    // Forzar inicio del proveedor vendor de Baileys
    if (typeof provider.initVendor === 'function') {
      try {
        console.log(`ðŸ”„ [BotEngine] Invocando initVendor() explÃ­citamente para Tenant: ${tenantConfig.tenantId}...`);
        await provider.initVendor();
      } catch (err) {
        console.warn(`âš ï¸ [BotEngine] Advertencia durante initVendor() para Tenant ${tenantConfig.tenantId}:`, err);
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

// 4. Adjuntar el servidor de WebSockets al mismo puerto HTTP (Polka server)
const httpServer = (managerApi as any).app?.server;
const connectedClients = new Set<WebSocket>();

if (httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: WebSocket) => {
    console.log('ðŸ“¡ [WebSocket] Cliente Frontend conectado desde navegador (Puerto Compartido HTTP/WS)');
    connectedClients.add(ws);

    ws.on('close', () => {
      console.log('ðŸ”Œ [WebSocket] Cliente Frontend desconectado');
      connectedClients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('âŒ [WebSocket Error en Cliente]:', err);
    });
  });
  console.log(`ðŸš€ [Bot Engine Worker] REST API & WebSockets compartiendo el puerto ${PORT}`);
} else {
  console.error('âŒ [Bot Engine Error] No se pudo obtener el servidor HTTP para adjuntar WebSockets.');
}

const broadcast = (data: object) => {
  const payload = JSON.stringify(data);
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
};

// 5. Registrar Flujo Base de Agente IA con contexto dinÃ¡mico desde BD
const defaultAiFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx: any, { flowDynamic }: { flowDynamic: any }) => {
    const userPrompt = ctx.body;
    const customerPhone = ctx.from;
    // Extraer el tenantId del contexto del bot (inyectado por BotManager)
    const tenantId = ctx._tenantId || (ctx as any).tenantId || 'unknown';
    console.log(`ðŸ¤– [BotEngine] Mensaje de ${customerPhone} (Tenant: ${tenantId}): "${userPrompt}"`);
    
    let botReply = 'Lo siento, en este momento no puedo procesar tu solicitud. Intenta mÃ¡s tarde.';

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
          console.log(`âœ‹ [BotEngine] Modo humano activo para ${customerPhone}. Ignorando IA.`);
          return;
        }

        if (data.reply) {
          botReply = data.reply;
        }
      } else {
        console.warn(`âš ï¸ [BotEngine] Respuesta HTTP ${response.status} desde /ai/chat-with-context`);
      }
    } catch (err) {
      console.warn('âš ï¸ Error al consultar el mÃ³dulo NestJS AI API:', err);
    }

    await flowDynamic([{ body: botReply }]);
  });

managerApi.registerFlow('default_ai_flow', 'Flujo IA Multitenant', defaultAiFlow);

// 6. Suscribirse a eventos del Manager y generar QR DataURL oficial de Baileys
manager.on('bot:qr', async (tenantId: string, data: any) => {
  console.log(`âš¡ [BotManager Event] Evento 'bot:qr' disparado para Tenant: ${tenantId}`);
  let qrImageBase64 = data.qr;

  if (!data || !data.qr) {
    console.error(`âŒ [BotManager Error] Se recibiÃ³ un evento 'bot:qr' pero el payload 'data.qr' estÃ¡ vacÃ­o o indefinido para Tenant: ${tenantId}`);
    broadcast({
      event: 'bot:error',
      tenantId,
      error: 'El payload del cÃ³digo QR estÃ¡ vacÃ­o.',
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
      console.log(`âœ… [BotManager Success] String de Baileys convertido exitosamente a Base64 PNG para Tenant: ${tenantId}`);
    } catch (err) {
      console.error(`âŒ [BotManager Error] FallÃ³ la conversiÃ³n de QR string a DataURL en QRCode.toDataURL para Tenant ${tenantId}:`, err);
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
  console.log(`ðŸ“¡ [BotManager WebSocket] Evento 'bot:qr' emitido a ${connectedClients.size} clientes WebSocket activos.`);
});

manager.on('bot:connected', (tenantId: string) => {
  console.log(`ðŸŽ‰ [BotManager Event] WhatsApp Conectado exitosamente para Tenant: ${tenantId}`);
  broadcast({
    event: 'bot:connected',
    tenantId,
    status: 'CONNECTED',
  });
});

manager.on('bot:disconnected', (tenantId: string) => {
  console.log(`âš ï¸ [BotManager Event] WhatsApp Desconectado para Tenant: ${tenantId}`);
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

// --- 7. Sincronización Webhook y Rehidratación ---
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

// 8. Rehidratación (Arranque de Bots Activos)
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
            await manager.createBot({ tenantId: bot.tenantId, flows: [defaultAiFlow] });
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

// 9. Endpoint Manual Send Message
if ((managerApi as any).app) {
  (managerApi as any).app.post('/internal/send-message', async (req: any, res: any) => {
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
}
