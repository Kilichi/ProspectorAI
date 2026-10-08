import { daw } from '../profiles/daw.js';
import { env } from '../config/env.js';
import { SearchDAO } from '../dao/SearchDAO.js';
import { CompanyDAO } from '../dao/CompanyDAO.js';
import { geocodificar } from './geocodingService.js';
import { buscarOsm } from './overpassService.js';
import { normalizarOsm } from '../utils/normalizeOsm.js';
import { obtenerProveedor } from '../ai/provider.js';
import { analizarEmpresa, errorPublico } from './analysisService.js';
import { programarJob, comprobarJobActivo } from './jobService.js';
import { AppError } from '../utils/AppError.js';
import { delegarBusqueda } from './n8nService.js';

async function procesarAnalisis(job, empresas, proveedor, reanalizar = false) {
  let procesadas = 0;
  let errores = 0;
  for (const empresa of empresas) {
    comprobarJobActivo();
    await SearchDAO.actualizar(job._id, {
      estado: 'analizando',
      empresaActual: empresa.nombre,
    });
    const resultado = await analizarEmpresa(empresa._id, proveedor, reanalizar);
    procesadas++;
    if (resultado.error) errores++;
    await SearchDAO.actualizar(job._id, { procesadas, errores });
  }
  await SearchDAO.actualizar(job._id, {
    estado: 'completada',
    empresaActual: null,
    finalizadaEn: new Date(),
  });
}

export async function prepararCandidatas(job, parametros) {
  await SearchDAO.actualizar(job._id, { estado: 'localizando' });
  const centro = parametros.localidad
    ? await geocodificar(parametros.localidad)
    : { lat: parametros.lat, lon: parametros.lon };
  await SearchDAO.actualizar(job._id, { centro });
  const elementos = await buscarOsm(
    { ...centro, radioKm: parametros.radioKm },
    daw,
  );
  const empresas = normalizarOsm(elementos, centro, parametros.radioKm);
  await CompanyDAO.guardarCandidatas(empresas, job._id, parametros.perfil);
  await SearchDAO.actualizar(job._id, { totalCandidatas: empresas.length });
  if (!parametros.analizar) {
    await SearchDAO.actualizar(job._id, {
      estado: 'completada',
      total: 0,
      procesadas: 0,
      finalizadaEn: new Date(),
    });
    return [];
  }
  const seleccion = await CompanyDAO.seleccionarParaAnalisis(
    job._id,
    env.MAX_COMPANIES_PER_RUN,
  );
  await SearchDAO.actualizar(job._id, {
    total: seleccion.empresas.length,
    omitidasCompletadas: seleccion.completadas,
    pendientesFueraLote: Math.max(
      0,
      seleccion.pendientes - seleccion.empresas.length,
    ),
    empresaIds: seleccion.empresas.map((empresa) => empresa._id),
  });
  return seleccion.empresas;
}

async function ejecutarBusqueda(job, parametros, proveedor) {
  try {
    const empresas = await prepararCandidatas(job, parametros);
    if (parametros.analizar) await procesarAnalisis(job, empresas, proveedor);
  } catch (error) {
    await SearchDAO.actualizar(job._id, {
      estado: 'error',
      empresaActual: null,
      finalizadaEn: new Date(),
      error: errorPublico(error),
    });
  }
}

export async function crearBusqueda(parametros, desdeWorkflow = false) {
  // Fallar antes de consumir OSM si falta configuración. analizar:false conserva Fase 2.
  const proveedor = parametros.analizar ? obtenerProveedor() : null;
  if (desdeWorkflow || env.ORCHESTRATOR === 'n8n') {
    return delegarBusqueda(parametros, desdeWorkflow);
  }
  return programarJob(
    () => SearchDAO.crear(parametros, { analizar: parametros.analizar }),
    (job) => ejecutarBusqueda(job, parametros, proveedor),
  );
}

export async function reanalizarEmpresa(id) {
  const empresa = await CompanyDAO.obtener(id);
  if (!empresa)
    throw new AppError(404, 'COMPANY_NOT_FOUND', 'Empresa no encontrada.');
  if (empresa.analisisEstado === 'analizando')
    throw new AppError(
      409,
      'COMPANY_BUSY',
      'Esta empresa ya se está analizando.',
    );
  const proveedor = obtenerProveedor();
  return programarJob(
    () =>
      SearchDAO.crear(
        { perfil: empresa.perfil },
        {
          tipo: 'reanalisis',
          analizar: true,
          total: 1,
          totalCandidatas: 1,
          empresaIds: [empresa._id],
        },
      ),
    async (job) => {
      try {
        await procesarAnalisis(job, [empresa], proveedor, true);
      } catch (error) {
        await SearchDAO.actualizar(job._id, {
          estado: 'error',
          empresaActual: null,
          finalizadaEn: new Date(),
          error: errorPublico(error),
        });
      }
    },
  );
}

export async function obtenerBusqueda(id) {
  const busqueda = await SearchDAO.obtener(id);
  if (!busqueda)
    throw new AppError(404, 'SEARCH_NOT_FOUND', 'Búsqueda no encontrada.');
  return busqueda;
}
