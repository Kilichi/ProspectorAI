import { crearCola } from '../utils/queue.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { SearchDAO } from '../dao/SearchDAO.js';
import { CompanyDAO } from '../dao/CompanyDAO.js';

const colaJobs = crearCola();
let activos = 0;
let cerrando = false;

export async function programarJob(crear, ejecutar) {
  if (cerrando)
    throw new AppError(
      503,
      'SERVER_CLOSING',
      'El servidor se está deteniendo.',
    );
  if (activos >= env.MAX_PENDING_JOBS)
    throw new AppError(
      429,
      'JOB_QUEUE_FULL',
      'La cola está llena. Espera a que terminen los trabajos pendientes.',
    );
  // Reservar antes de escribir evita carreras entre peticiones concurrentes.
  activos++;
  let job;
  try {
    job = await crear();
  } catch (error) {
    activos--;
    throw error;
  }
  setImmediate(() => {
    void colaJobs.encolar(async () => {
      try {
        if (cerrando) return;
        await ejecutar(job);
      } catch {
        logger.error(
          'No se ha podido terminar un job. Consulta su estado o reinicia para recuperar trabajos interrumpidos.',
        );
      } finally {
        activos--;
      }
    });
  });
  return { searchId: String(job._id) };
}

export async function recuperarJobs() {
  await SearchDAO.recuperarInterrumpidas();
  await CompanyDAO.recuperarInterrumpidas();
}

export function detenerJobs() {
  cerrando = true;
}

export function comprobarJobActivo() {
  if (cerrando)
    throw new AppError(
      503,
      'JOB_INTERRUPTED',
      'El servidor se detuvo durante el trabajo. Repite la búsqueda o solicita el reanálisis.',
    );
}

// Útil para pruebas y para observar el vaciado, sin exponer información al frontend.
export async function esperarJobs() {
  await new Promise((resolve) => setImmediate(resolve));
  await colaJobs.esperarVacia();
}
