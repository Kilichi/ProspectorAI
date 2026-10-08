import { AppError } from '../utils/AppError.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Parámetros inválidos. Comprueba los campos y sus límites.',
        ),
      );
    }
    req.validated ??= {};
    req.validated[source] = result.data;
    next();
  };
}
