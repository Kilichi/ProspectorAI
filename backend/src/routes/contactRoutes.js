import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { idSchema } from './searchRoutes.js';
import { aiRateLimit } from '../middlewares/aiRateLimit.js';
import { emailSchema } from '../services/emailDraftService.js';
import { generar, guardar, estado } from '../controllers/contactController.js';

export const contactRoutes = Router({ mergeParams: true });
contactRoutes.use(validate(idSchema, 'params'));
contactRoutes.post(
  '/email-draft',
  validate(
    z
      .object({
        reemplazar: z.boolean().default(false),
        datosCentro: z
          .object({
            nombreCentro: z.string().trim().max(200).optional(),
            profesor: z.string().trim().max(200).optional(),
            email: z.union([z.email(), z.literal('')]).optional(),
            telefono: z.string().trim().max(50).optional(),
          })
          .strict()
          .default({}),
      })
      .strict()
      .default({}),
  ),
  aiRateLimit,
  generar,
);
contactRoutes.patch(
  '/email-draft',
  validate(emailSchema.extend({ version: z.number().int().min(0) })),
  guardar,
);
contactRoutes.patch(
  '/contact-status',
  validate(
    z
      .object({
        estado: z.enum([
          'Pendiente',
          'Contactada',
          'Respondió',
          'Interesada',
          'Descartada',
        ]),
        nota: z.string().trim().max(2000).default(''),
      })
      .strict(),
  ),
  estado,
);
