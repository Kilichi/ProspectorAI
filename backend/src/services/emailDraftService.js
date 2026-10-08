import { z } from 'zod';
import { env } from '../config/env.js';
import { CompanyDAO } from '../dao/CompanyDAO.js';
import { SearchDAO } from '../dao/SearchDAO.js';
import { obtenerProveedor } from '../ai/provider.js';
import { systemPromptEmail } from '../ai/prompts/email.js';
import { programarJob } from './jobService.js';
import { errorPublico } from './analysisService.js';
import { AppError } from '../utils/AppError.js';

export const emailSchema = z
  .object({
    asunto: z
      .string()
      .trim()
      .min(1)
      .max(180)
      .refine((texto) => !/[\r\n]/.test(texto)),
    cuerpo: z.string().trim().min(1).max(12000),
  })
  .strict();

export async function generarTextoEmail(empresa, datosCentro, proveedor) {
  const centro = {
    nombreCentro:
      datosCentro.nombreCentro || env.SCHOOL_NAME || '[NOMBRE DEL CENTRO]',
    profesor:
      datosCentro.profesor || env.TEACHER_NAME || '[NOMBRE DEL PROFESOR]',
    email: datosCentro.email || env.SCHOOL_EMAIL || '[EMAIL DEL CENTRO]',
    telefono:
      datosCentro.telefono || env.SCHOOL_PHONE || '[TELÉFONO DEL CENTRO]',
  };
  const evidencia = {
    osm: {
      nombre: empresa.nombre,
      direccion: empresa.ubicacion?.direccion,
      etiquetas: empresa.infoObtenida?.etiquetasOsm || {},
    },
    textoWeb: empresa.infoObtenida?.resumenWeb || null,
    centro,
  };
  const prompt = `Prepara un borrador a partir de estos datos:\n${JSON.stringify(evidencia)}`;
  for (let intento = 0; intento < 2; intento++) {
    const texto = await proveedor.generateJSON(
      systemPromptEmail,
      `${prompt}${intento ? '\nCORRECCIÓN: Devuelve exclusivamente asunto y cuerpo válidos. Conserva todos los marcadores del centro recibidos.' : ''}`,
    );
    try {
      if (typeof texto !== 'string' || texto.length > 30000) throw new Error();
      const borrador = emailSchema.parse(JSON.parse(texto));
      for (const valor of Object.values(centro)) {
        if (valor.startsWith('[') && !borrador.cuerpo.includes(valor))
          throw new Error();
      }
      return borrador;
    } catch {
      if (intento === 1)
        throw new AppError(
          502,
          'EMAIL_INVALID_JSON',
          'La IA no ha devuelto un borrador válido después de la corrección.',
        );
    }
  }
}

export async function crearBorradorEmail(
  id,
  { datosCentro = {}, reemplazar = false },
) {
  const empresa = await CompanyDAO.obtener(id);
  if (!empresa)
    throw new AppError(404, 'COMPANY_NOT_FOUND', 'Empresa no encontrada.');
  if (empresa.borradorEmail?.asunto && !reemplazar)
    throw new AppError(
      409,
      'DRAFT_EXISTS',
      'Ya hay un borrador guardado. Confirma explícitamente su sustitución.',
    );
  const proveedor = obtenerProveedor();
  const version = empresa.borradorVersion || 0;
  return programarJob(
    () =>
      SearchDAO.crear(
        { perfil: empresa.perfil },
        {
          tipo: 'email',
          total: 1,
          totalCandidatas: 1,
          empresaIds: [empresa._id],
        },
      ),
    async (job) => {
      try {
        await SearchDAO.actualizar(job._id, {
          estado: 'analizando',
          empresaActual: empresa.nombre,
        });
        const borrador = await generarTextoEmail(
          empresa,
          datosCentro,
          proveedor,
        );
        const guardada = await CompanyDAO.guardarBorradorGenerado(
          id,
          borrador,
          version,
        );
        if (!guardada)
          throw new AppError(
            409,
            'DRAFT_CHANGED',
            'El borrador cambió durante la generación. Se conserva la versión guardada; recarga la ficha.',
          );
        await SearchDAO.actualizar(job._id, {
          estado: 'completada',
          procesadas: 1,
          empresaActual: null,
          finalizadaEn: new Date(),
        });
      } catch (error) {
        await SearchDAO.actualizar(job._id, {
          estado: 'error',
          procesadas: 1,
          errores: 1,
          empresaActual: null,
          finalizadaEn: new Date(),
          error: errorPublico(error),
        });
      }
    },
  );
}

export async function guardarBorradorEmail(id, { version, ...borrador }) {
  const guardada = await CompanyDAO.guardarBorradorManual(
    id,
    borrador,
    version,
  );
  if (!guardada) {
    if (!(await CompanyDAO.obtener(id)))
      throw new AppError(404, 'COMPANY_NOT_FOUND', 'Empresa no encontrada.');
    throw new AppError(
      409,
      'DRAFT_CHANGED',
      'El borrador cambió o no existe. Recarga la ficha antes de guardar.',
    );
  }
  return guardada;
}
