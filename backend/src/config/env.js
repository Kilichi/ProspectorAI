import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.enum(['127.0.0.1', '0.0.0.0']).default('127.0.0.1'),
  ORCHESTRATOR: z.enum(['backend', 'n8n']).default('backend'),
  ORCHESTRATOR_TOKEN: z.string().max(200).default(''),
  N8N_WEBHOOK_URL: z
    .string()
    .url()
    .default('http://127.0.0.1:5678/webhook/buscar-empresas'),
  FRONTEND_ORIGIN: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
    }, 'Debe ser un origen HTTP/HTTPS sin ruta')
    .default('http://localhost:5173'),
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(?:\+srv)?:\/\//)
    .default('mongodb://127.0.0.1:27017/prospectorai'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  AI_PROVIDER: z.enum(['groq', 'gemini']).default('groq'),
  AI_MODEL: z
    .string()
    .trim()
    .max(150)
    .regex(/^[a-zA-Z0-9._/-]*$/)
    .default(''),
  GROQ_API_KEY: z.string().trim().max(500).default(''),
  GEMINI_API_KEY: z.string().trim().max(500).default(''),
  AI_DELAY_MS: z.coerce.number().int().min(1000).max(60000).default(3000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(3).default(2),
  MAX_COMPANIES_PER_RUN: z.coerce.number().int().min(1).max(100).default(15),
  MAX_PENDING_JOBS: z.coerce.number().int().min(1).max(20).default(5),
  SCHOOL_NAME: z.string().trim().max(200).default(''),
  TEACHER_NAME: z.string().trim().max(200).default(''),
  SCHOOL_EMAIL: z.union([z.email(), z.literal('')]).default(''),
  SCHOOL_PHONE: z.string().trim().max(50).default(''),
  HTTP_USER_AGENT: z
    .string()
    .min(10)
    .max(200)
    .regex(/^[\x20-\x7e]+$/)
    .default('ProspectorAI/1.0 (proyecto educativo DWES)'),
});

const result = schema.safeParse(process.env);
if (!result.success) {
  // Mostrar solo los nombres de las variables, nunca sus valores.
  throw new Error(
    `Configuración inválida: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
  );
}
export const env = result.data;
