import { useEffect, useState } from 'react';
import { obtenerBusqueda } from '../api/client.js';

export const jobTerminado = (estado) =>
  ['completada', 'error', 'interrumpida'].includes(estado);

export function useJob(id, intento) {
  const [estado, setEstado] = useState({ id: null, data: null, error: '' });
  useEffect(() => {
    if (!id) return;
    const control = new AbortController();
    let temporizador;
    async function consultar() {
      try {
        const data = await obtenerBusqueda(id, control.signal);
        if (control.signal.aborted) return;
        setEstado({ id, data, error: '' });
        if (!jobTerminado(data.estado))
          temporizador = setTimeout(consultar, 2500);
      } catch (error) {
        if (!control.signal.aborted)
          setEstado({
            id,
            data: null,
            error:
              error.name === 'TypeError'
                ? 'No se puede conectar con el servidor.'
                : error.message,
          });
      }
    }
    void consultar();
    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [id, intento]);
  return estado.id === id ? estado : { data: null, error: '' };
}
