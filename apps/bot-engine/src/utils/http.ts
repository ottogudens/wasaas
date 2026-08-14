import { logger } from '../logger.js';

export const fetchWithRetry = async (url: string, options: RequestInit, retries = 2, timeoutMs = 8000) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return res;
      if (res.status >= 500 && attempt < retries) {
        logger.warn(`⚠️ [HTTP] Status ${res.status} en ${url}. Reintentando (${attempt + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt))); // Exponential backoff
        continue;
      }
      return res;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      logger.warn(`⚠️ [HTTP] ${isTimeout ? 'Timeout' : 'Error'} en ${url}. Intento ${attempt + 1}/${retries}`);
      if (attempt >= retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new Error('Max retries reached');
};
