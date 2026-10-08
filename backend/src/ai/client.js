import { setTimeout as esperar } from 'node:timers/promises';
import { env } from '../config/env.js';
import { crearCola } from '../utils/queue.js';
import { AppError } from '../utils/AppError.js';

export const colaIA = crearCola({ delayMs: env.AI_DELAY_MS });

export function crearClienteIA({
  pedir = fetch,
  cola = colaIA,
  pausa = esperar,
  reintentos = env.AI_MAX_RETRIES,
} = {}) {
  return async (url, headers, body) => {
    for (let intento = 0; intento <= reintentos; intento++) {
      try {
        return await cola.encolar(async () => {
          let response;
          try {
            response = await pedir(url, {
              method: 'POST',
              redirect: 'error',
              headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify(body),
              signal: AbortSignal.timeout(60000),
            });
          } catch {
            throw new AppError(
              502,
              'AI_UNAVAILABLE',
              'No se ha podido conectar con el proveedor de IA.',
            );
          }
          if (!response.ok) {
            // No propagar cuerpos externos: pueden contener datos o credenciales.
            await response.body?.cancel();
            const code =
              response.status === 429
                ? 'AI_RATE_LIMIT'
                : [401, 403].includes(response.status)
                  ? 'AI_AUTH_ERROR'
                  : 'AI_PROVIDER_ERROR';
            throw new AppError(
              502,
              code,
              response.status === 429
                ? 'Se ha alcanzado el límite del proveedor de IA.'
                : 'El proveedor de IA ha rechazado la petición. Revisa la clave y el modelo en el backend.',
            );
          }
          try {
            return await response.json();
          } catch {
            throw new AppError(
              502,
              'AI_PROVIDER_ERROR',
              'El proveedor de IA ha devuelto una respuesta ilegible.',
            );
          }
        });
      } catch (error) {
        if (error.code !== 'AI_RATE_LIMIT' || intento === reintentos)
          throw error;
        await pausa(2000 * 2 ** intento);
      }
    }
  };
}

export const solicitarIA = crearClienteIA();
