export const textoInteres = (valor) =>
  valor === true
    ? 'Interés DAW'
    : valor === false
      ? 'Interés bajo'
      : 'Interés por determinar';
export const textoRemoto = (valor) =>
  valor === true
    ? 'Remoto posible'
    : valor === false
      ? 'Sin opción remota'
      : 'Remoto desconocido';
export const formatoDistancia = (valor) =>
  Number.isFinite(valor)
    ? `${valor.toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`
    : null;
export function urlWebSegura(valor) {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
