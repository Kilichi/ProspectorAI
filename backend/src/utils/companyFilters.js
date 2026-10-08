// Escapar la búsqueda literal evita interpretar expresiones regulares del usuario.
export const escaparRegex = (texto) =>
  texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function construirFiltroEmpresas(parametros) {
  const filtro = {};
  if (parametros.searchId) filtro.searchIds = parametros.searchId;
  for (const [entrada, campo] of [
    ['interesDAW', 'interesDAW'],
    ['teletrabajo', 'posibleTeletrabajo'],
  ]) {
    if (parametros[entrada] !== undefined)
      filtro[campo] =
        parametros[entrada] === 'desconocido'
          ? null
          : parametros[entrada] === 'true';
  }
  if (parametros.estadoContacto)
    filtro.estadoContacto = parametros.estadoContacto;
  if (parametros.analisisEstado)
    filtro.analisisEstado = parametros.analisisEstado;
  if (parametros.minPuntuacion !== undefined)
    filtro.puntuacion = { $gte: parametros.minPuntuacion };
  if (parametros.tecnologia)
    filtro.tecnologias = {
      $regex: `^${escaparRegex(parametros.tecnologia)}$`,
      $options: 'i',
    };
  if (parametros.texto) {
    const literal = { $regex: escaparRegex(parametros.texto), $options: 'i' };
    filtro.$or = [
      { nombre: literal },
      { 'ubicacion.direccion': literal },
      { 'analisis.actividad': literal },
    ];
  }
  return filtro;
}
