import 'dotenv/config';
import { BotManager, BotManagerApi } from '@builderbot/manager';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { WebSocketServer, WebSocket } from 'ws';
import QRCode from 'qrcode';

const PORT = process.env.BOT_ENGINE_PORT ? parseInt(process.env.BOT_ENGINE_PORT) : 3005;
const WS_PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 3006;
const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';
const API_KEY = process.env.INTERNAL_API_KEY || 'skale-saas-secret-key';

// 1. Inicializar Servidor de WebSockets
const wss = new WebSocketServer({ port: WS_PORT });
const connectedClients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  console.log('📡 [WebSocket] Cliente Frontend conectado');
  connectedClients.add(ws);

  ws.on('close', () => {
    connectedClients.delete(ws);
  });
});

const broadcast = (data: object) => {
  const payload = JSON.stringify(data);
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
};

// 2. Inicializar Orquestador de Instancias Multi-tenant
const manager = new BotManager({
  sessionsDir: SESSIONS_DIR,
});

// 3. Inicializar Servidor de API REST para el Manager
const managerApi = new BotManagerApi(manager, {
  port: PORT,
  apiKey: API_KEY,
});

// 4. Registrar Flujo Base de Agente IA
const defaultAiFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx: any, { flowDynamic }: { flowDynamic: any }) => {
    const userPrompt = ctx.body;
    console.log(`[BotEngine] Mensaje recibido de ${ctx.from}: ${userPrompt}`);
    
    await flowDynamic([
      { body: `🤖 *Asistente IA*: Hola, recibí tu consulta: "${userPrompt}". Procesando con base de conocimiento RAG...` }
    ]);
  });

managerApi.registerFlow('default_ai_flow', 'Flujo IA Multitenant', defaultAiFlow);

// 5. Suscribirse a eventos del Manager y generar QR DataURL oficial de Baileys
manager.on('bot:qr', async (tenantId: string, data: any) => {
  console.log(`[BotManager] Transmitiendo QR para Tenant: ${tenantId}`);
  let qrImageBase64 = data.qr;

  // Si data.qr es un raw string de Baileys, convertirlo directamente a Base64 PNG en el servidor
  if (data.qr && typeof data.qr === 'string' && !data.qr.startsWith('data:image')) {
    try {
      qrImageBase64 = await QRCode.toDataURL(data.qr, {
        margin: 2,
        scale: 8,
        errorCorrectionLevel: 'M',
      });
    } catch (err) {
      console.error('Error convirtiendo QR a DataURL:', err);
    }
  }

  broadcast({
    event: 'bot:qr',
    tenantId,
    qr: qrImageBase64,
  });
});

manager.on('bot:connected', (tenantId: string) => {
  console.log(`[BotManager] Transmitiendo Conexión para Tenant: ${tenantId}`);
  broadcast({
    event: 'bot:connected',
    tenantId,
    status: 'CONNECTED',
  });
});

manager.on('bot:disconnected', (tenantId: string) => {
  console.log(`[BotManager] Transmitiendo Desconexión para Tenant: ${tenantId}`);
  broadcast({
    event: 'bot:disconnected',
    tenantId,
    status: 'DISCONNECTED',
  });
});

// 6. Iniciar servidor
managerApi.start();
console.log(`🚀 [Bot Engine Worker] REST API en puerto ${PORT} | WebSockets en puerto ${WS_PORT}`);
