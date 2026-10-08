import { z } from 'zod';
import { distanciaKm } from './distance.js';

const coordenadas = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
const elemento = z.object({
  type: z.enum(['node', 'way']),
  id: z.number().int().positive().safe(),
  tags: z.record(z.string(), z.string()),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: coordenadas.optional(),
});

export function normalizarOsm(elements, centro, radioKm) {
  const empresas = new Map();
  for (const original of elements) {
    const result = elemento.safeParse(original);
    if (!result.success) continue;
    const data = result.data;
    const posicion = coordenadas.safeParse(
      data.type === 'node' ? data : data.center,
    );
    if (!posicion.success || !data.tags.name?.trim()) continue;
    const { lat, lon } = posicion.data;
    const distancia = distanciaKm(centro.lat, centro.lon, lat, lon);
    // El centro de un way puede quedar fuera aunque parte de su geometría esté dentro.
    if (distancia > radioKm) continue;
    const tags = data.tags;
    const osmId = `${data.type}/${data.id}`;
    const calle = [
      tags['addr:street'] || tags['addr:place'],
      tags['addr:housenumber'],
    ]
      .filter(Boolean)
      .join(' ');
    empresas.set(osmId, {
      osmId,
      nombre: tags.name.trim(),
      direccion:
        tags['addr:full'] ||
        [
          calle,
          tags['addr:postcode'],
          tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
        ]
          .filter(Boolean)
          .join(', '),
      lat,
      lon,
      distanciaKm: distancia,
      web: tags.website || tags['contact:website'] || null,
      email: tags.email || tags['contact:email'] || null,
      telefono: tags.phone || tags['contact:phone'] || null,
      etiquetasOsm: tags,
    });
  }
  return [...empresas.values()].sort((a, b) => a.distanciaKm - b.distanciaKm);
}
