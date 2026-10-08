import { rateLimit } from 'express-rate-limit';

// Compartido entre búsquedas y reanálisis, con almacenamiento local al proceso.
export const aiRateLimit = rateLimit({
  windowMs: 60000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT',
      message:
        'Demasiadas operaciones. Espera un minuto antes de volver a intentarlo.',
    },
  },
});
