import { z } from 'zod';
import { AppError } from '../utils/AppError.js';

export const analysisSchema = z
  .object({
    empresa: z.string().trim().min(1).max(500),
    actividad: z.string().trim().min(1).max(2000),
    interesDAW: z.boolean().nullable(),
    puntuacion: z.number().int().min(0).max(100),
    tecnologias: z.array(z.string().trim().min(1).max(100)).max(30),
    posibleTeletrabajo: z.boolean().nullable(),
    confianza: z.enum(['alta', 'media', 'baja']),
    motivo: z.string().trim().min(1).max(4000),
    fuentesUsadas: z
      .array(z.enum(['osm', 'web']))
      .min(1)
      .max(2),
  })
  .strict();

export function validarAnalisis(texto, { nombre, tieneWeb }) {
  try {
    if (typeof texto !== 'string' || texto.length > 30000) throw new Error();
    const analisis = analysisSchema.parse(JSON.parse(texto));
    if (
      analisis.empresa !== nombre ||
      !analisis.fuentesUsadas.includes('osm') ||
      (!tieneWeb && analisis.fuentesUsadas.includes('web')) ||
      new Set(analisis.fuentesUsadas).size !== analisis.fuentesUsadas.length
    )
      throw new Error();
    return analisis;
  } catch {
    throw new AppError(
      502,
      'AI_INVALID_JSON',
      'El análisis de IA no cumple el formato o declara fuentes no disponibles.',
    );
  }
}
