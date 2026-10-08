import { CompanyDAO } from '../dao/CompanyDAO.js';
import { obtenerTextoWeb } from './websiteService.js';
import { generarAnalisis } from './aiService.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function errorPublico(error) {
  return error instanceof AppError
    ? { code: error.code, message: error.message }
    : {
        code: 'ANALYSIS_FAILED',
        message: 'No se ha podido completar el análisis.',
      };
}

export async function analizarEmpresa(id, proveedor, reanalizar = false) {
  const empresa = await CompanyDAO.reclamar(id, reanalizar);
  if (!empresa) return { omitida: true, error: false };
  let web;
  try {
    web = await obtenerTextoWeb(empresa.web);
    const analisis = await generarAnalisis(empresa, web.texto, proveedor);
    await CompanyDAO.guardarAnalisis(empresa, analisis, web, {
      proveedor: env.AI_PROVIDER,
      modelo: env.AI_MODEL,
    });
    return { omitida: false, error: false };
  } catch (error) {
    await CompanyDAO.marcarError(id, errorPublico(error), web);
    return { omitida: false, error: true };
  }
}
