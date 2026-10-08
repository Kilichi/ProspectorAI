import { z } from 'zod';
import { obtenerJson, esperar } from './osmHttp.js';
import { AppError } from '../utils/AppError.js';

const respuesta = z.array(
  z.object({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
    display_name: z.string(),
  }),
);

// Una cola y caché compartidas por todo el proceso, incluso con peticiones simultáneas.
export function crearGeocodificador({
  pedir = obtenerJson,
  pausa = esperar,
  ahora = Date.now,
} = {}) {
  const cache = new Map();
  let cola = Promise.resolve();
  let ultimaPeticion = -Infinity;
  return (localidad) => {
    const clave = localidad.trim().toLocaleLowerCase('es');
    const tarea = cola.then(async () => {
      const guardado = cache.get(clave);
      if (guardado && guardado.caduca > ahora()) return guardado.valor;
      await pausa(Math.max(0, 1000 - (ahora() - ultimaPeticion)));
      ultimaPeticion = ahora();
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.search = new URLSearchParams({
        q: localidad,
        format: 'jsonv2',
        limit: '1',
        countrycodes: 'es',
        'accept-language': 'es',
      });
      const result = respuesta.safeParse(await pedir(url, {}, 10000));
      if (!result.success)
        throw new AppError(
          502,
          'INVALID_OSM_RESPONSE',
          'La respuesta del geocodificador no es válida.',
        );
      if (!result.data.length)
        throw new AppError(
          404,
          'LOCALITY_NOT_FOUND',
          'No se ha encontrado la localidad en España. Prueba con provincia o coordenadas.',
        );
      const { lat, lon, display_name: nombre } = result.data[0];
      const valor = { lat, lon, nombre };
      if (cache.size >= 500) cache.delete(cache.keys().next().value);
      cache.set(clave, { valor, caduca: ahora() + 86400000 });
      return valor;
    });
    cola = tarea.catch(() => {});
    return tarea;
  };
}

export const geocodificar = crearGeocodificador();
