const API_BASE = '/api';

async function solicitar(ruta, { signal, method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}${ruta}`, {
    method,
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
    ...(body !== undefined
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      'El servidor no ha devuelto una respuesta válida. Comprueba la conexión.',
    );
  }
  if (!response.ok)
    throw new Error(
      data.error?.message || 'No se ha podido completar la operación.',
    );
  return data;
}

export const crearBusqueda = (parametros) =>
  solicitar('/searches', { method: 'POST', body: parametros });
export const obtenerBusqueda = (id, signal) =>
  solicitar(`/searches/${encodeURIComponent(id)}`, { signal });
export const obtenerEmpresa = (id, signal) =>
  solicitar(`/companies/${encodeURIComponent(id)}`, { signal });
export const editarEmpresa = (id, cambios) =>
  solicitar(`/companies/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: cambios,
  });
export const reanalizarEmpresa = (id) =>
  solicitar(`/companies/${encodeURIComponent(id)}/reanalyze`, {
    method: 'POST',
    body: {},
  });
export const generarBorrador = (id, opciones) =>
  solicitar(`/companies/${encodeURIComponent(id)}/email-draft`, {
    method: 'POST',
    body: opciones,
  });
export const guardarBorrador = (id, cambios) =>
  solicitar(`/companies/${encodeURIComponent(id)}/email-draft`, {
    method: 'PATCH',
    body: cambios,
  });
export const cambiarContacto = (id, cambios) =>
  solicitar(`/companies/${encodeURIComponent(id)}/contact-status`, {
    method: 'PATCH',
    body: cambios,
  });
export const obtenerEstadisticas = (consulta, signal) =>
  solicitar(`/stats?${new URLSearchParams(JSON.parse(consulta))}`, { signal });
export function listarEmpresas(consulta, signal) {
  const parametros = JSON.parse(consulta);
  const query = new URLSearchParams(
    Object.entries(parametros).filter(
      ([, valor]) => valor !== '' && valor !== undefined,
    ),
  );
  return solicitar(`/companies?${query}`, { signal });
}

export async function getHealth(signal) {
  const response = await fetch(`${API_BASE}/health`, { signal });
  const data = await response.json();
  // El 503 incluye el diagnóstico, que también interesa mostrar en la interfaz.
  if (!response.ok && response.status !== 503) {
    throw new Error(data.error?.message ?? 'No se pudo consultar el servidor.');
  }
  return data;
}
