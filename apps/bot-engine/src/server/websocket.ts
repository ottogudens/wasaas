import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../logger.js';

export interface TenantWebSocket extends WebSocket {
  tenantId?: string;
}

const connectedClients = new Set<TenantWebSocket>();

export const setupWebSockets = (httpServer: any) => {
  if (!httpServer) {
    logger.error('❌ [Bot Engine Error] No se pudo obtener el servidor HTTP para adjuntar WebSockets.');
    return;
  }

  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: TenantWebSocket, req) => {
    // Extraer tenantId del URL params (ejemplo: ws://host:port/?tenantId=abc-123)
    const urlString = req.url || '';
    const queryParams = new URLSearchParams(urlString.includes('?') ? urlString.split('?')[1] : '');
    const clientTenantId = queryParams.get('tenantId') || undefined;

    ws.tenantId = clientTenantId;
    connectedClients.add(ws);
    logger.info(`📡 [WebSocket] Cliente conectado (Tenant Scoped: ${clientTenantId || 'Global'})`);

    ws.on('close', () => {
      logger.info(`🔌 [WebSocket] Cliente desconectado (Tenant: ${ws.tenantId || 'Global'})`);
      connectedClients.delete(ws);
    });

    ws.on('error', (err) => {
      logger.error('❌ [WebSocket Error en Cliente]:', err);
    });
  });
  
  logger.info(`🚀 [Bot Engine Worker] WebSockets inicializados`);
};

export const broadcast = (data: { tenantId?: string; [key: string]: any }) => {
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
