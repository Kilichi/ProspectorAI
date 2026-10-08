import { lstat, realpath, rm } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const simular = process.argv.includes('--dry-run');
const permitidos = [
  'node_modules',
  'backend/node_modules',
  'frontend/node_modules',
];

// Verificar TODOS los destinos antes de borrar ninguno. Rechazar junctions/symlinks.
const destinos = [];
for (const nombre of permitidos) {
  const destino = resolve(raiz, nombre);
  let datos;
  try {
    datos = await lstat(destino);
  } catch (error) {
    if (error.code === 'ENOENT') continue;
    throw error;
  }
  const real = await realpath(destino);
  const rutaRelativa = relative(raiz, real);
  if (
    datos.isSymbolicLink() ||
    !datos.isDirectory() ||
    real !== destino ||
    rutaRelativa.startsWith('..') ||
    isAbsolute(rutaRelativa)
  ) {
    throw new Error(
      `Limpieza cancelada: destino fuera del alcance permitido (${nombre}).`,
    );
  }
  destinos.push(destino);
}
for (const destino of destinos) {
  console.log(
    `${simular ? 'Se eliminaría' : 'Eliminando'}: ${relative(raiz, destino)}`,
  );
  if (!simular) await rm(destino, { recursive: true, force: false });
}
console.log(
  simular
    ? 'Simulación terminada, sin borrar archivos.'
    : 'Limpieza terminada. Se conservan .env, fuentes y datos Docker.',
);
