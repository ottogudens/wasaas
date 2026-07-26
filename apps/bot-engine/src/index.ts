import 'dotenv/config';
import { BotManager, BotManagerApi } from '@builderbot/manager';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { WebSocketServer, WebSocket } from 'ws';

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

// 4. Registrar Flujo Base de Agente IA con tipos explicitos
const defaultAiFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx: any, { flowDynamic }: { flowDynamic: any }) => {
    const userPrompt = ctx.body;
    console.log(`[BotEngine] Mensaje recibido de ${ctx.from}: ${userPrompt}`);
    
    await flowDynamic([
      { body: `🤖 *Asistente IA*: Hola, recibí tu consulta: "${userPrompt}". Procesando con base de conocimiento RAG...` }
    ]);
  });

managerApi.registerFlow('default_ai_flow', 'Flujo IA Multitenant', defaultAiFlow);

// 5. Suscribirse a eventos del Manager con tipos explicitos
manager.on('bot:qr', (tenantId: string, data: any) => {
  console.log(`[BotManager] Transmitiendo QR para Tenant: ${tenantId}`);
  broadcast({
    event: 'bot:qr',
    tenantId,
    qr: data.qr,
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
