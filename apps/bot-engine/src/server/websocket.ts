import { WebSocketServer, WebSocket } from 'ws';
import { timingSafeEqual } from 'crypto';
import { logger } from '../logger.js';
import { API_KEY } from '../config.js';

export interface TenantWebSocket extends WebSocket {
  tenantId?: string;
}

const connectedClients = new Set<TenantWebSocket>();

// Comparación en tiempo constante para evitar timing attacks sobre la API key
const isValidApiKey = (candidate: string | null): boolean => {
  if (!candidate || !API_KEY) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(API_KEY);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

export const setupWebSockets = (httpServer: any) => {
  if (!httpServer) {
    logger.error('❌ [Bot Engine Error] No se pudo obtener el servidor HTTP para adjuntar WebSockets.');
    return;
  }

  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: TenantWebSocket, req) => {
    const urlString = req.url || '';
    const queryParams = new URLSearchParams(urlString.includes('?') ? urlString.split('?')[1] : '');
    const apiKey = queryParams.get('apiKey');
    const clientTenantId = queryParams.get('tenantId') || undefined;

    // 1. Exigir autenticación por API key interna — sin ella, cerrar la conexión de inmediato.
    if (!isValidApiKey(apiKey)) {
      logger.warn(`🚫 [WebSocket] Conexión rechazada: API key inválida o ausente (Tenant solicitado: ${clientTenantId || 'N/A'}).`);
      ws.close(4401, 'Unauthorized');
      return;
    }

    // 2. Exigir tenantId explícito — un cliente sin tenantId ya NO recibe el broadcast de todos los tenants.
    if (!clientTenantId) {
      logger.warn('🚫 [WebSocket] Conexión rechazada: falta tenantId en la query string.');
      ws.close(4400, 'Missing tenantId');
      return;
    }

    ws.tenantId = clientTenantId;
    connectedClients.add(ws);
    logger.info(`📡 [WebSocket] Cliente autenticado conectado (Tenant Scoped: ${clientTenantId})`);

    ws.on('close', () => {
      logger.info(`🔌 [WebSocket] Cliente desconectado (Tenant: ${ws.tenantId})`);
      connectedClients.delete(ws);
    });

    ws.on('error', (err) => {
      logger.error('❌ [WebSocket Error en Cliente]:', err);
    });
  });
  
  logger.info(`🚀 [Bot Engine Worker] WebSockets inicializados (autenticación por API key requerida)`);
};

export const broadcast = (data: { tenantId?: string; [key: string]: any }) => {
  const payload = JSON.stringify(data);
  for (const client of connectedClients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    // Todo cliente conectado ya está autenticado y tiene un tenantId asignado.
    // Solo recibe eventos de SU propio tenant, o eventos verdaderamente globales
    // (sin tenantId en el payload, ej. errores generales del motor).
    if (!data.tenantId || client.tenantId === data.tenantId) {
      client.send(payload);
    }
  }
};
