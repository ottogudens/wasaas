import 'dotenv/config';
import { BotManager, BotManagerApi } from '@builderbot/manager';
import { addKeyword, EVENTS } from '@builderbot/bot';
import express from 'express';

const PORT = process.env.BOT_ENGINE_PORT ? parseInt(process.env.BOT_ENGINE_PORT) : 3005;
const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';
const API_KEY = process.env.INTERNAL_API_KEY || 'skale-saas-secret-key';

// 1. Inicializar Orquestador de Instancias Multi-tenant
const manager = new BotManager({
  sessionsDir: SESSIONS_DIR,
});

// 2. Inicializar Servidor de API REST para el Manager
const managerApi = new BotManagerApi(manager, {
  port: PORT,
  apiKey: API_KEY,
});

// 3. Registrar Flujo Base de Agente IA con captura de colas
const defaultAiFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx, { flowDynamic, state }) => {
    // Aquí el bot enviará la consulta al backend NestJS (apps/api) para RAG + GPT-4o
    const userPrompt = ctx.body;
    console.log(`[BotEngine] Mensaje recibido de ${ctx.from}: ${userPrompt}`);
    
    // Simulación de respuesta preliminar
    await flowDynamic([
      { body: `🤖 *Asistente IA*: Hola, recibí tu mensaje: "${userPrompt}". Estoy procesando tu consulta...` }
    ]);
  });

managerApi.registerFlow('default_ai_flow', 'Flujo IA Multitenant', defaultAiFlow);

// 4. Suscribirse a eventos del Manager (QR, estado de conexión)
manager.on('bot:qr', (tenantId, data) => {
  console.log(`[BotManager] Código QR generado para Tenant: ${tenantId}`);
});

manager.on('bot:connected', (tenantId) => {
  console.log(`[BotManager] Bot conectado exitosamente para Tenant: ${tenantId}`);
});

manager.on('bot:disconnected', (tenantId) => {
  console.log(`[BotManager] Bot desconectado para Tenant: ${tenantId}`);
});

// 5. Iniciar servidor
managerApi.start();
console.log(`🚀 [Bot Engine Worker] Servidor Multi-tenant iniciado en puerto ${PORT}`);
