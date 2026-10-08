import { useCallback, useEffect, useState } from 'react';
import { getHealth } from '../api/client.js';

export function useHealth() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: null,
  });
  const retry = useCallback(() => {
    setState({ loading: true, data: null, error: null });
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), 8000);
    getHealth(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ loading: false, data, error: null });
      })
      .catch(() => {
        if (controller.signal.reason === 'cleanup') return;
        setState({
          loading: false,
          data: null,
          error:
            'No se pudo conectar con el backend. Comprueba que está iniciado en el puerto 3001.',
        });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      controller.abort('cleanup');
      clearTimeout(timeout);
    };
  }, [attempt]);

  return { ...state, retry };
}
