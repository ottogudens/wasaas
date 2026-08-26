/**
 * check-env.ts — API NestJS
 *
 * Valida que todas las variables de entorno requeridas estén definidas y tengan
 * el formato correcto antes de iniciar NestJS. Si alguna falta o es inválida,
 * imprime un mensaje de error claro y llama a process.exit(1).
 *
 * Compatible con Zod v4.
 *
 * IMPORTANTE: Este módulo debe ser importado como la primera instrucción de main.ts,
 * antes de `NestFactory.create()`.
 */

import { z } from 'zod';

const envSchema = z.object({
  // JWT — obligatorio, sin fallback.
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres para ser segura.'),

  // API key compartida entre bot-engine y api — obligatoria, sin fallback.
  INTERNAL_API_KEY: z
    .string()
    .min(16, 'INTERNAL_API_KEY debe tener al menos 16 caracteres.'),

  // Base de datos
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL debe ser una URL válida de Postgres.'),

  // OpenAI
  OPENAI_API_KEY: z
    .string()
    .startsWith('sk-', 'OPENAI_API_KEY debe comenzar con "sk-".'),

  // Puerto (Railway lo inyecta; opcional en desarrollo local)
  PORT: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(parseInt(v, 10)), { message: 'PORT debe ser un número.' }),

  // Super Admin — obligatorio, sin fallback. Sin estas vars, main.ts omite el
  // seed en vez de crear una cuenta con credenciales predecibles.
  SUPER_ADMIN_EMAIL: z.string().email('SUPER_ADMIN_EMAIL debe ser un email válido.'),
  SUPER_ADMIN_PASSWORD: z
    .string()
    .min(12, 'SUPER_ADMIN_PASSWORD debe tener al menos 12 caracteres.'),
});

export function checkEnv(): void {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues;
    console.error('\n❌ [API] ERROR DE CONFIGURACIÓN — Variables de entorno faltantes o inválidas:\n');
    issues.forEach((issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : 'campo desconocido';
      console.error(`   • ${field}: ${issue.message}`);
    });
    console.error('\n   Configura las variables en Railway → Variables antes de desplegar.');
    console.error('   Referencia: apps/api/.env.example\n');
    process.exit(1);
  }

  console.log('✅ [API] Validación de variables de entorno: OK');
}
