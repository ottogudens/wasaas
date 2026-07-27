import 'dotenv/config';
import { BotManager, BotManagerApi } from '@builderbot/manager';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { WebSocketServer, WebSocket } from 'ws';
import QRCode from 'qrcode';

// En Railway se expone un único puerto público (PORT).
const PORT = process.env.PORT ? parseInt(process.env.PORT) : (process.env.BOT_ENGINE_PORT ? parseInt(process.env.BOT_ENGINE_PORT) : 3005);
const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';
const API_KEY = process.env.INTERNAL_API_KEY || 'skale-saas-secret-key';

// 1. Inicializar Orquestador de Instancias Multi-tenant
console.log(`📂 [BotManager] Directorio de sesiones: ${SESSIONS_DIR}`);
const manager = new BotManager({
  sessionsDir: SESSIONS_DIR,
  defaultProviderClass: BaileysProvider as any,
  defaultProviderOptions: {
    writeLog: true,
  },
});

// Interceptar la creación de cada bot para asegurar inicio explícito e instrumentación de eventos
const originalCreateBot = manager.createBot.bind(manager);
manager.createBot = async (tenantConfig: any) => {
  console.log(`🚀 [BotEngine] Creando e inicializando proveedor de WhatsApp para Tenant: ${tenantConfig.tenantId}...`);
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

    // Forzar inicio del proveedor vendor de Baileys si no se inició de forma automática
    if (typeof provider.initVendor === 'function') {
      try {
        console.log(`🔄 [BotEngine] Invocando initVendor() explícitamente para Tenant: ${tenantConfig.tenantId}...`);
        await provider.initVendor();
      } catch (err) {
        console.warn(`⚠️ [BotEngine] Advertencia durante initVendor() para Tenant ${tenantConfig.tenantId}:`, err);
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
    console.log('📡 [WebSocket] Cliente Frontend conectado desde navegador (Puerto Compartido HTTP/WS)');
    connectedClients.add(ws);

    ws.on('close', () => {
      console.log('🔌 [WebSocket] Cliente Frontend desconectado');
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

// 5. Registrar Flujo Base de Agente IA
const defaultAiFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx: any, { flowDynamic }: { flowDynamic: any }) => {
    const userPrompt = ctx.body;
    console.log(`🤖 [BotEngine] Mensaje recibido de ${ctx.from}: "${userPrompt}"`);
    
    await flowDynamic([
      { body: `🤖 *Asistente IA*: Hola, recibí tu consulta: "${userPrompt}". Procesando con base de conocimiento RAG...` }
    ]);
  });

managerApi.registerFlow('default_ai_flow', 'Flujo IA Multitenant', defaultAiFlow);

// 6. Suscribirse a eventos del Manager y generar QR DataURL oficial de Baileys
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
  console.error(`💥 [BotManager Global Error]:`, err);
  broadcast({
    event: 'bot:error',
    error: typeof err === 'string' ? err : err?.message || 'Error interno en BotManager',
  });
});
