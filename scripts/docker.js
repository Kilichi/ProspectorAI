import { readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const archivo = new URL('../backend/.env', import.meta.url);
const accion = process.argv[2] || 'prepare';
if (!['prepare', 'up', 'down', 'check'].includes(accion)) {
  throw new Error('Acción Docker desconocida.');
}
if (accion === 'prepare' || accion === 'up') {
  try {
    await access(archivo);
  } catch {
    await copyFile(
      new URL('../backend/.env.example', import.meta.url),
      archivo,
    );
  }
  let contenido = await readFile(archivo, 'utf8');
  const token = contenido.match(/^ORCHESTRATOR_TOKEN=(.*)$/m)?.[1]?.trim();
  if (!token || token === '""' || token === "''") {
    const linea = `ORCHESTRATOR_TOKEN=${randomBytes(32).toString('hex')}`;
    contenido = /^ORCHESTRATOR_TOKEN=/m.test(contenido)
      ? contenido.replace(/^ORCHESTRATOR_TOKEN=.*$/m, linea)
      : `${contenido.trimEnd()}\n${linea}\n`;
    await writeFile(archivo, contenido, { mode: 0o600 });
  }
  console.log(
    'Entorno preparado. Las API keys existentes se conservan. El token permanece en backend/.env.',
  );
}
if (accion !== 'prepare') {
  const argumentos =
    accion === 'up'
      ? ['up', '-d', '--build']
      : accion === 'down'
        ? ['down']
        : ['config', '--quiet'];
  const resultado = spawnSync('docker', ['compose', ...argumentos], {
    cwd: raiz,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (resultado.error)
    console.error(
      'No se puede ejecutar Docker. Comprueba Docker Desktop y los permisos de tu terminal.',
    );
  process.exitCode = resultado.status ?? 1;
}
