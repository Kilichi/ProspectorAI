import { env } from '../config/env.js';

const levels = { debug: 0, info: 1, warn: 2, error: 3 };
export const logger = Object.fromEntries(
  Object.entries(levels).map(([level, priority]) => [
    level,
    (message) => {
      if (priority >= levels[env.LOG_LEVEL]) {
        console[level](
          JSON.stringify({
            fecha: new Date().toISOString(),
            nivel: level,
            mensaje: message,
          }),
        );
      }
    },
  ]),
);
