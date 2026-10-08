import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { crear, obtener } from '../controllers/searchController.js';
import { aiRateLimit } from '../middlewares/aiRateLimit.js';

export const idSchema = z
  .object({ id: z.string().regex(/^[a-f\d]{24}$/i) })
  .strict();
export const searchSchema = z
  .object({
    localidad: z.string().trim().min(2).max(150).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
    radioKm: z.number().min(1).max(100).default(30),
    perfil: z.literal('daw').default('daw'),
    analizar: z.boolean().default(true),
  })
  .strict()
  .refine((value) =>
    value.localidad !== undefined
      ? value.lat === undefined && value.lon === undefined
      : value.lat !== undefined && value.lon !== undefined,
  );

export const searchRoutes = Router();
searchRoutes.post('/', validate(searchSchema), aiRateLimit, crear);
searchRoutes.get('/:id', validate(idSchema, 'params'), obtener);
