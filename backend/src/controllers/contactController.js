import {
  crearBorradorEmail,
  guardarBorradorEmail,
} from '../services/emailDraftService.js';
import {
  cambiarContacto,
  obtenerEstadisticas,
} from '../services/companyService.js';

export async function generar(req, res) {
  res
    .status(202)
    .json(
      await crearBorradorEmail(req.validated.params.id, req.validated.body),
    );
}
export async function guardar(req, res) {
  res.json(
    await guardarBorradorEmail(req.validated.params.id, req.validated.body),
  );
}
export async function estado(req, res) {
  res.json(await cambiarContacto(req.validated.params.id, req.validated.body));
}
export async function estadisticas(req, res) {
  res.json(await obtenerEstadisticas(req.validated.query.searchId));
}
