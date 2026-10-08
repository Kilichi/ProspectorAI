import { crearBusqueda, obtenerBusqueda } from '../services/searchService.js';

export async function crear(req, res) {
  res.status(202).json(await crearBusqueda(req.validated.body));
}
export async function obtener(req, res) {
  res.json(await obtenerBusqueda(req.validated.params.id));
}
