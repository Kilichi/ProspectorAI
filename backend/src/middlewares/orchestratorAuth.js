import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function orchestratorAuth(req, res, next) {
  const recibido = Buffer.from(req.get('X-Orchestrator-Token') || '');
  const esperado = Buffer.from(env.ORCHESTRATOR_TOKEN);
  if (
    esperado.length < 32 ||
    recibido.length !== esperado.length ||
    !timingSafeEqual(recibido, esperado)
  ) {
    return next(
      new AppError(
        401,
        'ORCHESTRATOR_UNAUTHORIZED',
        'Acceso de orquestación no autorizado.',
      ),
    );
  }
  next();
}
