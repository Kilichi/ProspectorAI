import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const esperar = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenerJson(url, options, timeoutMs) {
  try {
    const response = await fetch(url, {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent': env.HTTP_USER_AGENT,
        Accept: 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const error = new AppError(
        502,
        'OSM_UNAVAILABLE',
        'El servicio de OpenStreetMap no está disponible. Inténtalo más tarde.',
      );
      error.externalStatus = response.status;
      throw error;
    }
    return await response.json();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      502,
      'OSM_UNAVAILABLE',
      'No se ha podido obtener una respuesta válida de OpenStreetMap.',
    );
  }
}
