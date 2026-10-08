import {
  prepararWorkflow,
  analizarDesdeWorkflow,
} from '../services/n8nService.js';

export async function preparar(req, res) {
  res.json(await prepararWorkflow(req.validated.body));
}

export async function analizar(req, res) {
  const { searchId, empresaId } = req.validated.params;
  res.json(await analizarDesdeWorkflow(searchId, empresaId));
}
