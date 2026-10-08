import { z } from 'zod';
import { obtenerJson, esperar } from './osmHttp.js';
import { AppError } from '../utils/AppError.js';

export function construirConsulta({ lat, lon, radioKm }, perfil) {
  const alrededor = `(around:${radioKm * 1000},${lat},${lon})`;
  const filtros = perfil.etiquetas
    .map(([clave, valores]) => {
      const etiqueta = valores
        ? `["${clave}"~"^(${valores.join('|')})$"]`
        : `["${clave}"]`;
      return ['node', 'way']
        .map((tipo) => `${tipo}${alrededor}["name"]${etiqueta};`)
        .join('\n');
    })
    .join('\n');
  return `[out:json][timeout:60];\n(\n${filtros}\n);\nout center tags;`;
}

export async function buscarOsm(
  parametros,
  perfil,
  { pedir = obtenerJson, pausa = esperar } = {},
) {
  const consulta = construirConsulta(parametros, perfil);
  for (let intento = 0; intento < 3; intento++) {
    try {
      const data = await pedir(
        'https://overpass-api.de/api/interpreter',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: consulta }),
        },
        70000,
      );
      const result = z
        .object({
          elements: z.array(z.unknown()),
          remark: z.string().optional(),
        })
        .safeParse(data);
      // Overpass puede devolver HTTP 200 con un error y resultados parciales.
      if (!result.success || result.data.remark)
        throw new AppError(
          502,
          'INVALID_OSM_RESPONSE',
          'Overpass no ha completado la consulta. Prueba más tarde o reduce el radio.',
        );
      return result.data.elements;
    } catch (error) {
      if (![429, 504].includes(error.externalStatus) || intento === 2)
        throw error;
      await pausa(2000 * 2 ** intento);
    }
  }
}
