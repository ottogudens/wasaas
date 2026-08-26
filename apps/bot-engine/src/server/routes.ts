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
      const targetDir = path.join(SESSIONS_DIR, tenantId);
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        logger.info(`🗑️ [SessionClean] Directorio de sesión borrado: ${targetDir}`);
      }
      const files = fs.readdirSync(SESSIONS_DIR);
      for (const file of files) {
        if (file.includes(tenantId)) {
          const fullPath = path.join(SESSIONS_DIR, file);
          fs.rmSync(fullPath, { recursive: true, force: true });
          logger.info(`🗑️ [SessionClean] Archivo/Carpeta de sesión borrada: ${fullPath}`);
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
        
        // Limpiar archivos de sesión para forzar la generación de un nuevo QR
        cleanSessionFiles(tenantId);

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
  const handlePairPhoneRequest = async (req: any, res: any) => {
    const processRequest = async (bodyStr: string) => {
      try {
        const authHeader = req.headers['authorization'] || '';
        const apiKey = authHeader.replace('Bearer ', '').trim() || req.headers['x-api-key'];
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

        // Sanitización estricta: solo dígitos, validación E.164
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        if (cleanNumber.length < 10 || cleanNumber.length > 15) {
          res.statusCode = 400;
          return res.end(JSON.stringify({
            error: `Número inválido: "${phoneNumber}". Debe ser formato E.164 sin '+' (ej: 56912345678, mínimo 10 dígitos)`,
          }));
        }

        // Limpiar instancia previa si existe
        let botInstance = manager.getBot(tenantId);
        if (botInstance) {
          logger.info(`📱 [BotEngine] Removiendo bot anterior para pairing code...`);
          await manager.removeBot(tenantId).catch(() => {});
        }
        cleanSessionFiles(tenantId);

        logger.info(`📱 [BotEngine] Iniciando vinculación con pairing code para ${cleanNumber} (Tenant: ${tenantId})...`);

        // Responder inmediatamente con 202 Accepted — NO bloquear la petición HTTP
        // El código llegará al frontend vía WebSocket (bot:code) y Webhook
        res.statusCode = 202;
        res.end(JSON.stringify({
          success: true,
          pending: true,
          message: 'Solicitud de vinculación iniciada. El código llegará vía WebSocket.',
        }));

        // Continuar en background: crear bot y esperar código
        setImmediate(async () => {
          try {
            botInstance = await manager.createBot({
              tenantId,
              usePairingCode: true,
              phoneNumber: cleanNumber,
              flows: [createAiFlow(tenantId)],
            });
            setupProviderListeners(manager, botInstance, tenantId);
            logger.info(`✅ [BotEngine] Instancia con pairing code creada para ${tenantId}. Esperando código de WhatsApp...`);
          } catch (err: any) {
            logger.error(`❌ [BotEngine] Error en background pair-phone para ${tenantId}:`, err);
            manager.emit('bot:error', tenantId, { error: err?.message || String(err) });
          }
        });

      } catch (err: any) {
        logger.error('❌ [BotEngine] Error generando pairing code:', err);
        if (!res.headersSent && !res.writableEnded) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: err?.message || String(err) }));
        }
      }
    };

    if (req.body && Object.keys(req.body).length > 0) {
      await processRequest('');
    } else {
      let body = '';
      req.on('data', (chunk: any) => body += chunk.toString());
      req.on('end', () => processRequest(body));
    }
  };

  app.post('/internal/pair-phone', handlePairPhoneRequest);
  app.post('/internal/request-code', handlePairPhoneRequest);

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
