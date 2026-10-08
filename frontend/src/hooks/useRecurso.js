import { useEffect, useState } from 'react';

export function useRecurso(cargar, argumento, revision = 0) {
  const [estado, setEstado] = useState(null);
  useEffect(() => {
    const control = new AbortController();
    cargar(argumento, control.signal)
      .then((data) => {
        if (!control.signal.aborted)
          setEstado({ argumento, revision, data, error: '' });
      })
      .catch((error) => {
        if (!control.signal.aborted)
          setEstado({
            argumento,
            revision,
            data: null,
            error:
              error.name === 'TypeError'
                ? 'No se puede conectar con el servidor. Comprueba que está iniciado.'
                : error.message,
          });
      });
    return () => control.abort();
  }, [cargar, argumento, revision]);
  const vigente =
    estado?.argumento === argumento && estado?.revision === revision;
  return {
    loading: !vigente,
    data: vigente ? estado.data : null,
    error: vigente ? estado.error : '',
  };
}
