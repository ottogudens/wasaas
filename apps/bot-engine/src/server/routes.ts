import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { logger } from '../logger.js';
import { SESSIONS_DIR, API_KEY } from '../config.js';
import { createAiFlow, setupProviderListeners } from '../providers/manager.js';
import { notifyWebhook } from '../services/webhook.js';

export const setupRoutes = (app: any, manager: any) => {
  // Habilitar CORS global para permitir peticiones directas desde el Frontend (ej. generar QR o desconectar)
  app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Accept'],
    credentials: true
  }));

  // Helper para eliminar archivos de sesión en disco
  const cleanSessionFiles = (tenantId: string) => {
    try {
      if (!fs.existsSync(SESSIONS_DIR)) return;
      const files = fs.readdirSync(SESSIONS_DIR);
      for (const file of files) {
        if (file.includes(tenantId)) {
          const fullPath = path.join(SESSIONS_DIR, file);
          fs.rmSync(fullPath, { recursive: true, force: true });
          logger.info(`🗑️ [SessionClean] Sesión borrada de disco: ${fullPath}`);
        }
      }
    } catch (err) {
      logger.warn(`⚠️ Error borrando sesión en disco para ${tenantId}:`, err);
    }
  };

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
          logger.info(`🔄 [BotEngine] Bot ${tenantId} ya existía. Removiendo previa para generar QR nuevo (evitando 409)...`);
          await manager.removeBot(tenantId).catch(() => {});
        }

        const botInstance = await manager.createBot({
          tenantId,
          name: name || tenantId,
          flows: [createAiFlow(tenantId)],
        });
        setupProviderListeners(manager, botInstance, tenantId);

        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, tenantId }));
      } catch (err: any) {
        logger.error('❌ [BotEngine /internal/start Error]:', err);
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

  // Endpoint para enviar Documentos, Informes o Formularios por WhatsApp
  app.post('/internal/send-document', async (req: any, res: any) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== API_KEY) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: 'Unauthorized' }));
      }

      const data = await getParsedBody(req);
      const { tenantId, customerPhone, documentTitle, documentContent } = data;

      if (!tenantId || !customerPhone || !documentContent) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Missing params', received: data }));
      }

      const botInstance = manager.getBot(tenantId);
      if (!botInstance) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: 'Bot not found or not connected' }));
      }

      const provider = botInstance.provider as any;
      const formattedDocText = `📄 *DOCUMENTO GENERADO: ${documentTitle || 'Informe / Formulario'}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${documentContent}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n_Generado automáticamente por miBot_`;

      if (typeof provider.sendMessage === 'function') {
        await provider.sendMessage(customerPhone, formattedDocText, {});
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, message: 'Documento enviado con éxito por WhatsApp' }));
      } else {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: 'Provider does not support sendMessage' }));
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
          logger.info(`📱 [BotEngine] Removiendo bot anterior para pairing code...`);
          await manager.removeBot(tenantId).catch(() => {});
        }
        cleanSessionFiles(tenantId);

        logger.info(`📱 [BotEngine] Creando instancia con pairing code para ${cleanNumber} (Tenant: ${tenantId})...`);

        // Promesa reactiva que captura el evento bot:code emitido por Baileys
        const codePromise = new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            manager.removeListener('bot:code', onCode);
            manager.removeListener('bot:error', onError);
            reject(new Error('Tiempo de espera agotado al solicitar código a WhatsApp. Verifica que el número esté registrado en WhatsApp e incluye código de país.'));
          }, 35000);

          const onCode = (tId: string, data: any) => {
            if (tId === tenantId && data?.code) {
              clearTimeout(timeout);
              manager.removeListener('bot:code', onCode);
              manager.removeListener('bot:error', onError);
              resolve(data.code);
            }
          };

          const onError = (tId: string, errData: any) => {
            if (tId === tenantId) {
              clearTimeout(timeout);
              manager.removeListener('bot:code', onCode);
              manager.removeListener('bot:error', onError);
              reject(new Error(errData?.error || 'Error al inicializar sesión en WhatsApp'));
            }
          };

          manager.on('bot:code', onCode);
          manager.on('bot:error', onError);
        });

        botInstance = await manager.createBot({
          tenantId,
          usePairingCode: true,
          phoneNumber: cleanNumber,
          flows: [createAiFlow(tenantId)],
        });
        setupProviderListeners(manager, botInstance, tenantId);

        // Si el socket ya tiene el código disponible o lo emite
        const code = await codePromise;

        logger.info(`✅ [BotEngine] Pairing code generado para ${tenantId}: ${code}`);
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, code }));

      } catch (err: any) {
        logger.error('❌ [BotEngine] Error generando pairing code:', err);
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
              logger.info(`🚪 [BotEngine] Cerrando sesión WhatsApp (logout) para ${tenantId}...`);
              await sock.logout();
            } catch (e) {
              logger.warn(`⚠️ Error durante sock.logout() para ${tenantId}:`, e);
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
};
