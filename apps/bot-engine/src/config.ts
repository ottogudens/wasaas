import './check-env.js';
import 'dotenv/config';

export const PORT = process.env.PORT ? parseInt(process.env.PORT) : (process.env.BOT_ENGINE_PORT ? parseInt(process.env.BOT_ENGINE_PORT) : 3005);
export const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';
export const API_KEY = process.env.INTERNAL_API_KEY as string;

const rawApiUrl = process.env.API_URL || 'https://wasaas-production.up.railway.app';
const formatUrl = (url: string) => {
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
};
export const API_URL = formatUrl(rawApiUrl);
