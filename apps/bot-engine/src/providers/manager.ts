import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { addKeyword } from '@builderbot/bot';
import { fetchLatestBaileysVersion, downloadMediaMessage } from 'baileys';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { MetaProvider } from '@builderbot/provider-meta';
import { logger } from '../logger.js';
import { SESSIONS_DIR, PORT } from '../config.js';
import { extractMessageText, cleanPhoneNumber } from '../utils/format.js';
import { transcribeVoice, processWhatsappFile, chatWithContext } from '../services/api.js';
import { notifyWebhook } from '../services/webhook.js';

// --- Factory de flujos IA por tenant ---
// Flujo inerte para cumplir con el requisito de BuilderBot de tener al menos un flujo.
// No atrapamos EVENTS.WELCOME para evitar que BuilderBot secuestre notas de voz o documentos.
// Todo el procesamiento se hará a nivel nativo en provider.on('message')
export const createAiFlow = (tenantId: string) => {
  return addKeyword('__IGNORE_THIS_FLOW__')
    .addAction(async (ctx: any, { flowDynamic }: { flowDynamic: any }) => {
      // No hace nada
    });
};

export const setupProviderListeners = (manager: any, botInstance: any, tenantId: string) => {
  if (!botInstance || !botInstance.provider) return;
  botInstance.provider.on('auth_failure', async (err: any) => {
    logger.error(`💥 [BotEngine] Error crítico de Auth (auth_failure) para ${tenantId}:`, err);
    try {
      await manager.removeBot(tenantId).catch(() => {});
      const tenantSessionDir = path.join(SESSIONS_DIR, tenantId);
      if (fs.existsSync(tenantSessionDir)) {
        fs.rmSync(tenantSessionDir, { recursive: true, force: true });
        logger.info(`🧹 [BotEngine] Caché limpia para ${tenantId} debido a auth_failure.`);
      }
      notifyWebhook({ event: 'disconnected', tenantId });
    } catch (e) {
      logger.error(`Error al limpiar sesión tras auth_failure de ${tenantId}:`, e);
    }
  });
};

export const overrideManagerCreateBot = async (manager: any) => {
  const { version } = await fetchLatestBaileysVersion();
  logger.info(`🌐 [Baileys] Versión de WhatsApp Web obtenida de servidores oficiales: ${version.join('.')}`);

  const originalCreateBot = manager.createBot.bind(manager);

  manager.createBot = async (tenantConfig: any) => {
    logger.info(`🚀 [BotEngine] Configurando proveedor para Tenant: ${tenantConfig.tenantId} (Proveedor: ${tenantConfig.provider || 'baileys'})...`);

    // Selección dinámica de clase de proveedor y opciones
    if (tenantConfig.provider === 'meta') {
      tenantConfig.providerClass = MetaProvider as any;
      tenantConfig.providerOptions = {
        jwtToken: tenantConfig.metaJwtToken || process.env.META_JWT_TOKEN || '',
        numberId: tenantConfig.metaNumberId || process.env.META_NUMBER_ID || '',
        verifyToken: tenantConfig.metaVerifyToken || process.env.META_VERIFY_TOKEN || '',
        version: tenantConfig.metaVersion || 'v18.0',
        port: PORT,
      };
    } else {
      // Proveedor por defecto: Baileys (Código QR / Pairing Code)
      tenantConfig.providerClass = BaileysProvider as any;
      if (!tenantConfig.providerOptions) {
        tenantConfig.providerOptions = {};
      }
      tenantConfig.providerOptions.version = version;
    }

    // Inyectar flujo dinámico con tenantId en closure si no trae flujos
    if (!tenantConfig.flows || tenantConfig.flows.length === 0) {
      tenantConfig.flows = [createAiFlow(tenantConfig.tenantId)];
    }

    const botInstance = await originalCreateBot(tenantConfig);

    const provider = botInstance.provider;
    if (provider && tenantConfig.provider !== 'meta') {
      // Escuchar el evento 'require_action' nativo de BaileysProvider
      provider.on('require_action', async (actionData: any) => {
        const qrStr = actionData?.payload?.qr;
        const codeStr = actionData?.payload?.code;
        logger.info(`⚡ [Baileys Native Event] 'require_action' recibido para Tenant ${tenantConfig.tenantId}. String QR: ${!!qrStr}, Code: ${codeStr || 'N/A'}`);
        if (qrStr) {
          manager.emit('bot:qr', tenantConfig.tenantId, { qr: qrStr });
        }
        if (codeStr) {
          manager.emit('bot:code', tenantConfig.tenantId, { code: codeStr });
        }
      });

      provider.on('qr', (qrStr: string) => {
        logger.info(`⚡ [Baileys Native Event] 'qr' directo recibido para Tenant ${tenantConfig.tenantId}`);
        if (qrStr) {
          manager.emit('bot:qr', tenantConfig.tenantId, { qr: qrStr });
        }
      });

      provider.on('ready', (data: any) => {
        logger.info(`🎉 [Baileys Native Event] 'ready' recibido para Tenant ${tenantConfig.tenantId}:`, data);
        manager.emit('bot:connected', tenantConfig.tenantId);
      });

      provider.on('host', (data: any) => {
        logger.info(`🎉 [Baileys Native Event] 'host' recibido para Tenant ${tenantConfig.tenantId}:`, data);
        manager.emit('bot:connected', tenantConfig.tenantId);
      });

      provider.on('message', async (payload: any) => {
        const rawFrom = payload?.from || payload?.key?.remoteJid || '';
        const cleanFrom = cleanPhoneNumber(rawFrom);
        // Ignorar mensajes salientes o de broadcast
        if (!cleanFrom || rawFrom.includes('status@broadcast') || payload?.key?.fromMe) return;

        const msgContent = payload?.message || {};
        const isAudio = !!(msgContent.audioMessage || msgContent.pttMessage);
        const isDocument = !!(msgContent.documentMessage || msgContent.documentWithCaptionMessage);
        
        let bodyText = extractMessageText(payload);

        // 🎙️ A. Procesar Nota de Voz vía OpenAI Whisper (descarga nativa de Baileys)
        if (isAudio) {
          logger.info(`🎙️ [Baileys Audio] Recibida nota de voz de ${cleanFrom}...`);
          try {
            const audioBuffer = await downloadMediaMessage(payload, 'buffer', {}) as Buffer;
            
            if (audioBuffer && audioBuffer.length > 0) {
              logger.info(`🎙️ [Baileys Audio] Descargados ${audioBuffer.length} bytes de audio.`);
              const audioBase64 = audioBuffer.toString('base64');
              
              const voiceRes = await transcribeVoice(tenantConfig.tenantId, cleanFrom, audioBase64);
              
              if (voiceRes.ok) {
                const voiceData = await voiceRes.json();
                
                // Emitir al Live Chat el texto transcrito
                if (voiceData.transcribedText) {
                  manager.emit('bot:message', tenantConfig.tenantId, {
                    from: cleanFrom,
                    body: `🎙️ ${voiceData.transcribedText}`,
                    name: payload?.pushName || payload?.name || cleanFrom,
                    timestamp: Date.now()
                  });
                }
                
                // Enviar la respuesta de la IA
                if (voiceData.reply && !voiceData.isHumanMode && typeof provider.sendMessage === 'function') {
                  logger.info(`🤖 [BotEngine Voice Reply] Respondiendo a ${cleanFrom}: "${voiceData.reply}"`);
                  await provider.sendMessage(cleanFrom, voiceData.reply, {});
                }
              } else {
                logger.warn(`⚠️ [BotEngine] transcribe-voice HTTP ${voiceRes.status}`);
              }
              return; // Procesado como audio
            }
          } catch (audioErr) {
            logger.error('❌ Error procesando mensaje de voz:', audioErr);
          }
        }

        // 📄 B. Procesar Ingesta de Documentos vía RAG
        if (isDocument) {
          const docMsg = msgContent.documentMessage || msgContent.documentWithCaptionMessage?.message?.documentMessage;
          const docTitle = docMsg?.fileName || 'Documento_WhatsApp.txt';
          logger.info(`📄 [Baileys Document] Recibido archivo "${docTitle}" de ${cleanFrom}...`);
          try {
            const docBuffer = await downloadMediaMessage(payload, 'buffer', {}) as Buffer;
            
            if (docBuffer && docBuffer.length > 0) {
              logger.info(`📄 [Baileys Document] Descargados ${docBuffer.length} bytes del documento.`);
              const docContentBase64 = docBuffer.toString('base64');
              
              const docRes = await processWhatsappFile(tenantConfig.tenantId, docTitle, docContentBase64);
              
              if (docRes.ok) {
                const docData = await docRes.json();
                const ackReply = `📄 He recibido e indexado el documento "${docTitle}" (${docData.chunksProcessed} fragmentos aprendidos). Ya puedo responder preguntas sobre su contenido.`;
                if (typeof provider.sendMessage === 'function') {
                  await provider.sendMessage(cleanFrom, ackReply, {});
                }
              } else {
                logger.warn(`⚠️ [BotEngine] process-whatsapp-file HTTP ${docRes.status}`);
                if (typeof provider.sendMessage === 'function') {
                  await provider.sendMessage(cleanFrom, 'Recibí tu documento pero ocurrió un error al procesarlo. Por favor inténtalo de nuevo.', {});
                }
              }
              return;
            }
          } catch (docErr) {
            logger.error('❌ Error procesando documento de WhatsApp:', docErr);
          }
        }

        // Ignorar si al final no hay texto
        if (!bodyText) return;

        logger.info(`📩 [Baileys Incoming Message] Tenant: ${tenantConfig.tenantId}, From: ${cleanFrom}, Body: "${bodyText}"`);

        // 1. Emitir evento WebSocket para actualizar Live Chat
        manager.emit('bot:message', tenantConfig.tenantId, {
          from: cleanFrom,
          body: bodyText,
          name: payload?.pushName || payload?.name || cleanFrom,
          timestamp: Date.now()
        });

        // 2. Procesar mensaje con NestJS AI API
        try {
          const response = await chatWithContext(tenantConfig.tenantId, cleanFrom, bodyText);

          if (response.ok) {
            const data = await response.json();
            if (data.isHumanMode) {
              logger.info(`✋ [BotEngine] Modo humano activo para ${cleanFrom}. Ignorando IA.`);
              return;
            }
            if (data.reply && typeof provider.sendMessage === 'function') {
              logger.info(`🤖 [BotEngine] Respondiendo a ${cleanFrom}: "${data.reply}"`);
              try {
                await provider.sendMessage(cleanFrom, data.reply, {});
              } catch (sendErr: any) {
                const errMsg = sendErr?.message || String(sendErr);
                const statusCode = sendErr?.output?.statusCode || sendErr?.data?.statusCode;
                if (errMsg.includes('Connection Closed') || statusCode === 428) {
                  logger.warn(`⚠️ [BotEngine] La conexión de WhatsApp se cerró (428).`);
                  manager.emit('bot:disconnected', tenantConfig.tenantId);
                } else {
                  logger.error(`❌ [BotEngine] Error al enviar mensaje con Baileys:`, sendErr);
                }
              }
            }
          } else {
            logger.warn(`⚠️ [BotEngine] Respuesta HTTP ${response.status} desde /ai/chat-with-context`);
            if (typeof provider.sendMessage === 'function') {
              await provider.sendMessage(cleanFrom, 'Estoy teniendo intermitencias técnicas en este momento, por favor intenta en unos minutos.', {});
            }
          }
        } catch (err) {
          logger.error('❌ Error al enviar mensaje entrante a AI API:', err);
          if (typeof provider.sendMessage === 'function') {
            await provider.sendMessage(cleanFrom, 'Disculpa, mi sistema central está tardando en responder. Vuelve a escribirme en breve.', {});
          }
        }
      });

      // Forzar inicio del proveedor vendor de Baileys
      if (typeof provider.initVendor === 'function') {
        try {
          logger.info(`🔄 [BotEngine] Invocando initVendor() explícitamente para Tenant: ${tenantConfig.tenantId}...`);
          await provider.initVendor();
        } catch (err) {
          logger.warn(`⚠️  [BotEngine] Advertencia durante initVendor() para Tenant ${tenantConfig.tenantId}:`, err);
        }
      }
    }

    return botInstance;
  };
};

export const bindManagerEventsToBroadcast = (manager: any, broadcast: Function) => {
  manager.on('bot:qr', async (tenantId: string, data: any) => {
    logger.info(`⚡ [BotManager Event] Evento 'bot:qr' disparado para Tenant: ${tenantId}`);
    let qrImageBase64 = data.qr;
  
    if (!data || !data.qr) {
      logger.error(`❌ [BotManager Error] Se recibió un evento 'bot:qr' pero el payload 'data.qr' está vacío para Tenant: ${tenantId}`);
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
        logger.info(`✅ [BotManager Success] String de Baileys convertido a PNG Base64 para Tenant: ${tenantId}`);
      } catch (err) {
        logger.error(`❌ [BotManager Error] Falló la conversión de QR string a DataURL para Tenant ${tenantId}:`, err);
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
    logger.info(`📡 [BotManager WebSocket] Evento 'bot:qr' emitido a clientes autorizados para Tenant ${tenantId}`);
  });
  
  manager.on('bot:code', (tenantId: string, data: any) => {
    logger.info(`📱 [BotManager Event] Evento 'bot:code' disparado para Tenant: ${tenantId}, Code: ${data?.code}`);
    broadcast({
      event: 'bot:code',
      tenantId,
      code: data?.code,
    });
  });
  
  manager.on('bot:connected', (tenantId: string) => {
    logger.info(`🎉 [BotManager Event] WhatsApp Conectado exitosamente para Tenant: ${tenantId}`);
    broadcast({
      event: 'bot:connected',
      tenantId,
      status: 'CONNECTED',
    });
  });
  
  manager.on('bot:disconnected', (tenantId: string) => {
    logger.info(`⚠️ [BotManager Event] WhatsApp Desconectado para Tenant: ${tenantId}`);
    broadcast({
      event: 'bot:disconnected',
      tenantId,
      status: 'DISCONNECTED',
    });
  });
  
  manager.on('bot:message', (tenantId: string, data: any) => {
    logger.info(`📡 [BotManager Event] bot:message para ${tenantId}:`, data);
    broadcast({
      event: 'bot:message',
      tenantId,
      ...data,
    });
  });
  
  manager.on('error', (err: any) => {
    logger.error('💥 [BotManager Global Error]:', err);
    broadcast({
      event: 'bot:error',
      error: typeof err === 'string' ? err : err?.message || 'Error interno en BotManager',
    });
  });
};
