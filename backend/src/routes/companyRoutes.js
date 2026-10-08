import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { idSchema } from './searchRoutes.js';
import {
  listar,
  obtener,
  reanalizar,
  editar,
} from '../controllers/companyController.js';
import { aiRateLimit } from '../middlewares/aiRateLimit.js';
import { contactRoutes } from './contactRoutes.js';

const listadoSchema = z
  .object({
    searchId: idSchema.shape.id.optional(),
    pagina: z.coerce.number().int().min(1).max(100000).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    interesDAW: z.enum(['true', 'false', 'desconocido']).optional(),
    teletrabajo: z.enum(['true', 'false', 'desconocido']).optional(),
    tecnologia: z.string().trim().min(1).max(100).optional(),
    estadoContacto: z
      .enum([
        'Pendiente',
        'Contactada',
        'Respondió',
        'Interesada',
        'Descartada',
      ])
      .optional(),
    analisisEstado: z
      .enum(['pendiente', 'analizando', 'completado', 'error'])
      .optional(),
    minPuntuacion: z.coerce.number().int().min(0).max(100).optional(),
    texto: z.string().trim().min(1).max(150).optional(),
    orden: z.enum(['nombre', 'puntuacion', 'distancia']).default('nombre'),
    direccion: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();
const edicionSchema = z
  .object({
    tecnologias: z
      .array(z.string().trim().min(1).max(100))
      .max(30)
      .transform((valores) => [...new Set(valores)])
      .optional(),
    notaInterna: z.string().trim().max(5000).optional(),
    interesDAW: z.boolean().nullable().optional(),
    puntuacion: z.number().int().min(0).max(100).nullable().optional(),
  })
  .strict()
  .refine((valor) => Object.keys(valor).length > 0);
export const companyRoutes = Router();
companyRoutes.use('/:id', contactRoutes);
companyRoutes.get('/', validate(listadoSchema, 'query'), listar);
companyRoutes.get('/:id', validate(idSchema, 'params'), obtener);
companyRoutes.patch(
  '/:id',
  validate(idSchema, 'params'),
  validate(edicionSchema),
  editar,
);
companyRoutes.post(
  '/:id/reanalyze',
  validate(idSchema, 'params'),
  validate(z.object({}).strict().default({})),
  aiRateLimit,
  reanalizar,
);
