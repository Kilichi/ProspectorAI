import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { crearGroqProvider } from './groqProvider.js';
import { crearGeminiProvider } from './geminiProvider.js';

export function obtenerProveedor() {
  const apiKey =
    env.AI_PROVIDER === 'groq' ? env.GROQ_API_KEY : env.GEMINI_API_KEY;
  if (!apiKey || !env.AI_MODEL)
    throw new AppError(
      503,
      'AI_NOT_CONFIGURED',
      'Configura AI_PROVIDER, AI_MODEL y la clave del proveedor en backend/.env.',
    );
  return env.AI_PROVIDER === 'groq'
    ? crearGroqProvider({ apiKey, model: env.AI_MODEL })
    : crearGeminiProvider({ apiKey, model: env.AI_MODEL });
}
