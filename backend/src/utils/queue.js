import { setTimeout as esperar } from 'node:timers/promises';

// Una tarea rechazada no rompe la cadena. La pausa se mide desde su finalización.
export function crearCola({ delayMs = 0, pausa = esperar } = {}) {
  let cola = Promise.resolve();
  let necesitaPausa = false;
  return {
    encolar(tarea) {
      const resultado = cola.then(async () => {
        if (necesitaPausa && delayMs) await pausa(delayMs);
        try {
          return await tarea();
        } finally {
          necesitaPausa = true;
        }
      });
      cola = resultado.catch(() => {});
      return resultado;
    },
    esperarVacia() {
      return cola;
    },
  };
}
