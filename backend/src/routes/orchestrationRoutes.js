import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { orchestratorAuth } from '../middlewares/orchestratorAuth.js';
import { validate } from '../middlewares/validate.js';
import { searchSchema } from './searchRoutes.js';
import { preparar, analizar } from '../controllers/orchestrationController.js';

const id = z.string().regex(/^[a-f\d]{24}$/i);
export const orchestrationRoutes = Router();
orchestrationRoutes.use(orchestratorAuth);
orchestrationRoutes.use(
  rateLimit({
    windowMs: 60000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT',
          message: 'Demasiadas peticiones internas. Espera un minuto.',
        },
      }),
  }),
);
orchestrationRoutes.post(
  '/prepare',
  validate(z.union([z.object({ searchId: id }).strict(), searchSchema])),
  preparar,
);
orchestrationRoutes.post(
  '/searches/:searchId/companies/:empresaId/analyze',
  validate(z.object({ searchId: id, empresaId: id }).strict(), 'params'),
  validate(z.object({}).strict()),
  analizar,
);
