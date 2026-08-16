// Capturar excepciones globales y evitar caídas del contenedor por errores de Baileys / WebSocket
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [BotEngine Guard] Unhandled Promise Rejection interceptada:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ [BotEngine Guard] Uncaught Exception interceptada:', err);
});

import './check-env.js'; // Validar vars de entorno antes de cualquier otra importación
import 'dotenv/config';
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

import fs from 'fs';
import path from 'path';
import { BotManager, BotManagerApi } from '@builderbot/manager';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { fetchLatestBaileysVersion } from 'baileys';
import { logger } from './logger.js';
import { SESSIONS_DIR, PORT, API_KEY } from './config.js';
import { fetchActiveBots } from './services/api.js';
import { notifyWebhook } from './services/webhook.js';
import { setupWebSockets, broadcast } from './server/websocket.js';
import { setupRoutes } from './server/routes.js';
import { 
  overrideManagerCreateBot, 
  bindManagerEventsToBroadcast,
  createAiFlow,
  setupProviderListeners
} from './providers/manager.js';

// Asegurar la creación del directorio de sesiones para volumen persistente
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  logger.info(`📁 [BotEngine] Directorio de volúmenes persistentes creado en: ${path.resolve(SESSIONS_DIR)}`);
} else {
  logger.info(`📂 [BotEngine] Directorio de sesiones listo en: ${path.resolve(SESSIONS_DIR)}`);
}

// 7. Rehidratación (Arranque de Bots Activos) y Limpieza de Caché Huérfano
const cleanOrphanSessions = (activeTenantIds: string[]) => {
  try {
    if (!fs.existsSync(SESSIONS_DIR) || activeTenantIds.length === 0) return;
    const files = fs.readdirSync(SESSIONS_DIR);
    for (const file of files) {
      // Solo borrar carpetas de sesiones si no pertenecen a NINGÚN bot registrado
      const isTenantRegistered = activeTenantIds.some(id => file.includes(id));
      if (!isTenantRegistered) {
        const fullPath = path.join(SESSIONS_DIR, file);
        fs.rmSync(fullPath, { recursive: true, force: true });
        logger.info(`🧹 [CleanCache] Sesión eliminada de disco por no existir en la BD: ${fullPath}`);
      }
    }
  } catch (err) {
    logger.warn('⚠️ Error al verificar sesiones en disco:', err);
  }
};

const main = async () => {
  const { version } = await fetchLatestBaileysVersion();

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
  await overrideManagerCreateBot(manager);

  // 2. Inicializar Servidor de API REST para el Manager
  const managerApi = new BotManagerApi(manager, {
    port: PORT,
    apiKey: API_KEY,
  } as any);

  // 3. Iniciar el servidor HTTP Polka
  managerApi.start();

  // 4. Adjuntar el servidor de WebSockets con Aislamiento Multi-tenant
  const httpServer = (managerApi as any).app?.server;
  setupWebSockets(httpServer);

  // 5. Suscribirse a eventos del Manager y generar QR DataURL oficial de Baileys
  bindManagerEventsToBroadcast(manager, broadcast);

  // 6. Sincronización Webhook manejada directamente en manager.ts

  // 8. Endpoints Custom sobre Polka
  if ((managerApi as any).app) {
    setupRoutes((managerApi as any).app, manager);
  }

  // Ejecutar Rehidratación de bots
  const rehydrateBots = async () => {
    logger.info('🔄 [BotEngine] Iniciando rehidratación de bots y limpieza de caché...');
    try {
      const res = await fetchActiveBots();
      if (res.ok) {
        const bots = await res.json();
        const activeTenantIds = bots.map((b: any) => b.tenantId).filter(Boolean);
        
        // Limpiar de disco cualquier sesión de bots que ya fueron eliminados de la BD
        cleanOrphanSessions(activeTenantIds);

        logger.info(`🔄 [BotEngine] Encontrados ${bots.length} bots activos para rehidratar.`);
        for (const bot of bots) {
          if (bot.tenantId) {
            try {
              logger.info(`🔄 [BotEngine] Rehidratando ${bot.tenantId}...`);
              const botInstance = await manager.createBot({ tenantId: bot.tenantId, flows: [createAiFlow(bot.tenantId)] });
              setupProviderListeners(manager, botInstance, bot.tenantId);
            } catch (err) {
              logger.error(`❌ [BotEngine] Error rehidratando ${bot.tenantId}:`, err);
            }
          }
        }
      } else {
        logger.warn(`⚠️ [BotEngine] No se pudieron obtener bots activos (HTTP ${res.status})`);
      }
    } catch (err) {
      logger.warn('⚠️ [BotEngine] API inaccesible para rehidratación:', err);
    }
  };

  setTimeout(rehydrateBots, 3000); // Esperar 3s antes de rehidratar
};

main().catch(err => {
  logger.error('❌ Error fatal en Bot Engine:', err);
  process.exit(1);
});
