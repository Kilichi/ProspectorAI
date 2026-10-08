import { env } from '../config/env.js';
import { SearchDAO } from '../dao/SearchDAO.js';
import { crearCola } from '../utils/queue.js';
import { AppError } from '../utils/AppError.js';
import { programarJob, comprobarJobActivo } from './jobService.js';
import { prepararCandidatas, crearBusqueda } from './searchService.js';
import { analizarEmpresa, errorPublico } from './analysisService.js';
import { obtenerProveedor } from '../ai/provider.js';

const operaciones = crearCola();
const terminales = ['completada', 'error', 'interrumpida'];

export function comprobarTokenConfigurado() {
  if (env.ORCHESTRATOR_TOKEN.length < 32) {
    throw new AppError(
      503,
      'ORCHESTRATOR_NOT_CONFIGURED',
      'Configura un ORCHESTRATOR_TOKEN aleatorio de al menos 32 caracteres.',
    );
  }
}

export async function fallarOrquestacion(id, error) {
  const job = await SearchDAO.obtener(id);
  if (job && !terminales.includes(job.estado)) {
    await SearchDAO.actualizar(id, {
      estado: 'error',
      error: errorPublico(error),
      empresaActual: null,
      finalizadaEn: new Date(),
    });
  }
}

export function delegarBusqueda(parametros, desdeWorkflow = false) {
  comprobarTokenConfigurado();
  return programarJob(
    () =>
      SearchDAO.crear(parametros, {
        analizar: parametros.analizar,
        orquestador: 'n8n',
      }),
    async (job) => {
      try {
        if (!desdeWorkflow) {
          const respuesta = await fetch(env.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Orchestrator-Token': env.ORCHESTRATOR_TOKEN,
            },
            body: JSON.stringify({ searchId: String(job._id) }),
            signal: AbortSignal.timeout(10000),
            redirect: 'error',
          });
          if (!respuesta.ok)
            throw new AppError(
              502,
              'N8N_UNAVAILABLE',
              'n8n no ha aceptado el trabajo. Comprueba que el workflow está publicado.',
            );
        }
        // Conserva la reserva de MAX_PENDING_JOBS hasta que el workflow termine.
        const limite = Date.now() + 30 * 60 * 1000;
        while (Date.now() < limite) {
          comprobarJobActivo();
          const actual = await SearchDAO.obtener(job._id);
          if (!actual || terminales.includes(actual.estado)) return;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        throw new AppError(
          504,
          'N8N_TIMEOUT',
          'El workflow no ha terminado en 30 minutos. Revisa su ejecución en n8n.',
        );
      } catch (error) {
        await fallarOrquestacion(
          job._id,
          error instanceof AppError
            ? error
            : new AppError(
                502,
                'N8N_UNAVAILABLE',
                'No se puede contactar con n8n. Comprueba el contenedor y el workflow.',
              ),
        );
      }
    },
  );
}

export async function prepararWorkflow(entrada) {
  let id = entrada.searchId;
  if (!id) ({ searchId: id } = await crearBusqueda(entrada, true));
  return operaciones.encolar(async () => {
    const job = await SearchDAO.reclamarPreparacion(id);
    if (!job)
      throw new AppError(
        409,
        'JOB_NOT_QUEUED',
        'El trabajo no está pendiente o ya ha sido preparado.',
      );
    try {
      const empresas = await prepararCandidatas(job, {
        ...job.parametros,
        analizar: job.analizar,
      });
      await SearchDAO.actualizar(
        id,
        empresas.length
          ? { estado: 'analizando' }
          : { estado: 'completada', finalizadaEn: new Date() },
      );
      return {
        searchId: String(id),
        empresas: empresas.map((empresa) => ({
          id: String(empresa._id),
          nombre: empresa.nombre,
        })),
        aiDelayMs: env.AI_DELAY_MS,
      };
    } catch (error) {
      await fallarOrquestacion(id, error);
      throw error;
    }
  });
}

export function analizarDesdeWorkflow(searchId, empresaId) {
  // Serializa las peticiones internas y evita duplicados por reintentos HTTP.
  return operaciones.encolar(async () => {
    const job = await SearchDAO.obtener(searchId);
    if (
      !job ||
      job.orquestador !== 'n8n' ||
      !job.empresaIds.some((id) => String(id) === empresaId)
    ) {
      throw new AppError(
        404,
        'JOB_COMPANY_NOT_FOUND',
        'Empresa no incluida en este trabajo de n8n.',
      );
    }
    if (job.atendidasIds?.some((id) => String(id) === empresaId)) {
      return { searchId, empresaId, omitida: true, aiDelayMs: env.AI_DELAY_MS };
    }
    if (job.estado !== 'analizando')
      throw new AppError(409, 'JOB_NOT_ACTIVE', 'El trabajo no está activo.');
    try {
      comprobarJobActivo();
      const resultado = await analizarEmpresa(empresaId, obtenerProveedor());
      const actualizado = await SearchDAO.registrarAnalizada(
        searchId,
        empresaId,
        resultado.error,
      );
      if (actualizado?.procesadas >= actualizado?.total) {
        await SearchDAO.actualizar(searchId, {
          estado: 'completada',
          empresaActual: null,
          finalizadaEn: new Date(),
        });
      }
      return { searchId, empresaId, ...resultado, aiDelayMs: env.AI_DELAY_MS };
    } catch (error) {
      await fallarOrquestacion(searchId, error);
      throw error;
    }
  });
}
