import { API_URL, API_KEY } from '../config.js';
import { logger } from '../logger.js';

export const notifyWebhook = async (payload: any) => {
  try {
    const res = await fetch(`${API_URL}/bots/internal/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn(`⚠️ [Webhook] Error ${res.status} al notificar ${payload.event} para ${payload.tenantId}`);
    }
  } catch (err) {
    logger.warn(`⚠️ [Webhook] Fallo de conexión al notificar ${payload.event}: ${err}`);
  }
};
