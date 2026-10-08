import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { recuperarJobs, detenerJobs } from './services/jobService.js';

// El servidor sigue disponible para diagnosticar MongoDB mediante /api/health.
try {
  await connectDatabase();
  await recuperarJobs();
} catch {
  await disconnectDatabase();
  logger.warn(
    'No se ha podido preparar MongoDB y recuperar los jobs. Comprueba Docker y reinicia el backend.',
  );
}

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(`Backend disponible en http://localhost:${env.PORT}`);
});
server.on('error', () => {
  logger.error('No se ha podido iniciar el servidor HTTP');
  process.exitCode = 1;
  void disconnectDatabase();
});

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  detenerJobs();
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  server.close(async () => {
    await disconnectDatabase();
    clearTimeout(timeout);
    logger.info('Servidor detenido');
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
