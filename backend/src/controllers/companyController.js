import {
  listarEmpresas,
  obtenerEmpresa,
  editarEmpresa,
} from '../services/companyService.js';
import { reanalizarEmpresa } from '../services/searchService.js';

export async function listar(req, res) {
  res.json(await listarEmpresas(req.validated.query));
}
export async function obtener(req, res) {
  res.json(await obtenerEmpresa(req.validated.params.id));
}

export async function reanalizar(req, res) {
  res.status(202).json(await reanalizarEmpresa(req.validated.params.id));
}

export async function editar(req, res) {
  res.json(await editarEmpresa(req.validated.params.id, req.validated.body));
}
