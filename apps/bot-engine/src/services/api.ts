import { API_URL, API_KEY } from '../config.js';
import { fetchWithRetry } from '../utils/http.js';
import { logger } from '../logger.js';

export const transcribeVoice = async (tenantId: string, customerPhone: string, audioBase64: string) => {
  return fetchWithRetry(`${API_URL}/ai/transcribe-voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ tenantId, customerPhone, audioBase64 }),
  }, 1, 15000);
};

export const processWhatsappFile = async (tenantId: string, title: string, content: string) => {
  return fetchWithRetry(`${API_URL}/rag/process-whatsapp-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ tenantId, title, content }),
  }, 1, 15000);
};

export const chatWithContext = async (tenantId: string, customerPhone: string, message: string) => {
  return fetchWithRetry(`${API_URL}/ai/chat-with-context`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({
      tenantId,
      customerPhone,
      message,
    }),
  }, 2, 8000);
};

export const fetchActiveBots = async () => {
  return fetch(`${API_URL}/bots/internal/active-bots`, {
    headers: { 'x-api-key': API_KEY },
  });
};
