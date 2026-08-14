/**
 * check-env.ts — Bot Engine
 *
 * Valida que todas las variables de entorno requeridas estén definidas y tengan
 * el formato correcto antes de iniciar el servidor. Si alguna falta o es inválida,
 * imprime un mensaje de error claro y llama a process.exit(1).
 *
 * Compatible con Zod v4.
 *
 * IMPORTANTE: Este módulo debe ser importado como la primera instrucción de index.ts,
 * antes de cualquier otro import que consuma process.env.
 */

import { z } from 'zod';

const envSchema = z.object({
  // API key compartida entre bot-engine y api — obligatoria, sin fallback.
  INTERNAL_API_KEY: z
    .string()
    .min(16, 'INTERNAL_API_KEY debe tener al menos 16 caracteres.'),

  // URL base de la API NestJS
  API_URL: z
    .string()
    .url('API_URL debe ser una URL válida (ej. https://wasaas-production.up.railway.app).'),

  // Puerto del bot-engine (opcional; Railway lo inyecta automáticamente)
  PORT: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(parseInt(v, 10)), { message: 'PORT debe ser un número.' }),

  // Directorio de sesiones (opcional)
  SESSIONS_DIR: z.string().optional(),
});

function checkEnv(): void {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues;
    console.error('\n❌ [Bot Engine] ERROR DE CONFIGURACIÓN — Variables de entorno faltantes o inválidas:\n');
    issues.forEach((issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : 'campo desconocido';
      console.error(`   • ${field}: ${issue.message}`);
    });
    console.error('\n   Configura las variables en Railway → Variables antes de desplegar.');
    console.error('   Referencia: apps/bot-engine/.env.example\n');
    process.exit(1);
  }

  console.log('✅ [Bot Engine] Validación de variables de entorno: OK');
}

checkEnv();
