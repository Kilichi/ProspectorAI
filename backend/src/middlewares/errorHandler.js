import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

export function notFound(req, res) {
  res
    .status(404)
    .json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } });
}

// Express necesita los cuatro argumentos para reconocer un middleware de error.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (error instanceof AppError) {
    return res
      .status(error.status)
      .json({ error: { code: error.code, message: error.message } });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'El cuerpo debe contener JSON válido.',
      },
    });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'El cuerpo de la petición es demasiado grande.',
      },
    });
  }
  logger.error('Error interno al procesar una petición');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'No se ha podido completar la petición.',
    },
  });
}
