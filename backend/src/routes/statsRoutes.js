import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { idSchema } from './searchRoutes.js';
import { estadisticas } from '../controllers/contactController.js';

export const statsRoutes = Router();
statsRoutes.get(
  '/',
  validate(
    z.object({ searchId: idSchema.shape.id.optional() }).strict(),
    'query',
  ),
  estadisticas,
);
