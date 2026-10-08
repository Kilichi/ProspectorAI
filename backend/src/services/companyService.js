import { CompanyDAO } from '../dao/CompanyDAO.js';
import { SearchDAO } from '../dao/SearchDAO.js';
import { distanciaKm } from '../utils/distance.js';
import { AppError } from '../utils/AppError.js';

export async function listarEmpresas(parametros) {
  let busqueda;
  if (parametros.searchId) {
    busqueda = await SearchDAO.obtener(parametros.searchId);
    if (!busqueda)
      throw new AppError(404, 'SEARCH_NOT_FOUND', 'Búsqueda no encontrada.');
  }
  if (parametros.orden === 'distancia' && busqueda?.centro?.lat === undefined) {
    throw new AppError(
      400,
      'DISTANCE_REQUIRES_SEARCH',
      'Selecciona una búsqueda con centro para ordenar por distancia.',
    );
  }
  const resultado = await CompanyDAO.listar(parametros, busqueda?.centro);
  if (busqueda?.centro?.lat !== undefined) {
    resultado.empresas = resultado.empresas.map((empresa) => ({
      ...empresa,
      distanciaKm: distanciaKm(
        busqueda.centro.lat,
        busqueda.centro.lon,
        empresa.ubicacion.lat,
        empresa.ubicacion.lon,
      ),
    }));
  }
  return resultado;
}

export async function obtenerEmpresa(id) {
  const empresa = await CompanyDAO.obtener(id);
  if (!empresa)
    throw new AppError(404, 'COMPANY_NOT_FOUND', 'Empresa no encontrada.');
  return empresa;
}

export async function editarEmpresa(id, cambios) {
  const empresa = await CompanyDAO.editar(id, cambios);
  if (!empresa)
    throw new AppError(404, 'COMPANY_NOT_FOUND', 'Empresa no encontrada.');
  return empresa;
}

export async function cambiarContacto(id, cambios) {
  const empresa = await CompanyDAO.cambiarEstadoContacto(id, cambios);
  if (!empresa)
    throw new AppError(404, 'COMPANY_NOT_FOUND', 'Empresa no encontrada.');
  return empresa;
}

export async function obtenerEstadisticas(searchId) {
  if (searchId && !(await SearchDAO.obtener(searchId)))
    throw new AppError(404, 'SEARCH_NOT_FOUND', 'Búsqueda no encontrada.');
  return CompanyDAO.estadisticas(searchId);
}
