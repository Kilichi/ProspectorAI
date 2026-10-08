import { describe, expect, it, vi } from 'vitest';
import { distanciaKm } from '../src/utils/distance.js';
import { normalizarOsm } from '../src/utils/normalizeOsm.js';
import {
  construirConsulta,
  buscarOsm,
} from '../src/services/overpassService.js';
import { crearGeocodificador } from '../src/services/geocodingService.js';
import { daw } from '../src/profiles/daw.js';
import { AppError } from '../src/utils/AppError.js';

const centro = { lat: 38.635, lon: -0.866 };
const nodo = {
  type: 'node',
  id: 1,
  ...centro,
  tags: {
    name: 'Empresa de prueba',
    'addr:street': 'Calle Prueba',
    'addr:housenumber': '2',
    'addr:city': 'Villena',
    'contact:website': 'https://example.org',
    'contact:email': 'prueba@example.org',
    'contact:phone': '123',
  },
};

describe('Distancia Haversine', () => {
  it('devuelve cero para el mismo punto', () => {
    expect(distanciaKm(centro.lat, centro.lon, centro.lat, centro.lon)).toBe(0);
  });
  it('calcula un grado en el ecuador y es simétrica', () => {
    expect(distanciaKm(0, 0, 0, 1)).toBeCloseTo(111.195, 2);
    expect(distanciaKm(0, 1, 0, 0)).toBeCloseTo(111.195, 2);
  });
  it('soporta antípodas sin NaN', () => {
    expect(distanciaKm(0, 0, 0, 180)).toBeCloseTo(20015.114, 2);
  });
});

describe('Normalización OSM', () => {
  it('normaliza dirección y contactos, deduplica y conserva tags', () => {
    const empresas = normalizarOsm([nodo, nodo], centro, 30);
    expect(empresas).toHaveLength(1);
    expect(empresas[0]).toMatchObject({
      osmId: 'node/1',
      direccion: 'Calle Prueba 2, Villena',
      web: 'https://example.org',
      email: 'prueba@example.org',
      telefono: '123',
      distanciaKm: 0,
      etiquetasOsm: nodo.tags,
    });
  });
  it('usa el centro de ways sin confundir su id con el de un nodo', () => {
    const way = {
      type: 'way',
      id: 1,
      center: centro,
      tags: { name: 'Way', 'addr:full': 'Dirección completa' },
    };
    expect(
      normalizarOsm([nodo, way], centro, 30).map((item) => item.osmId),
    ).toEqual(['node/1', 'way/1']);
    expect(normalizarOsm([way], centro, 30)[0]).toMatchObject({
      direccion: 'Dirección completa',
      web: null,
      email: null,
    });
  });
  it('descarta datos inválidos, sin nombre, sin centro y fuera del radio', () => {
    expect(
      normalizarOsm(
        [
          null,
          {},
          { ...nodo, tags: { name: ' ' } },
          { ...nodo, lat: 100 },
          { ...nodo, lat: 0 },
          { type: 'way', id: 5, tags: { name: 'Sin centro' } },
        ],
        centro,
        30,
      ),
    ).toEqual([]);
  });
});

describe('Overpass sin red real', () => {
  it('agrupa nodos y ways de todo el perfil en una consulta', () => {
    const consulta = construirConsulta({ ...centro, radioKm: 30 }, daw);
    expect(consulta).toContain('[out:json][timeout:60]');
    expect(consulta).toContain('node(around:30000,38.635,-0.866)["name"]');
    expect(consulta).toContain('way(around:30000,38.635,-0.866)["name"]');
    expect(consulta).toContain('["office"~"^(it)$"]');
    expect(consulta).toContain(
      '["company"~"^(software|software_development)$"]',
    );
    expect(consulta).toContain('["consulting"~"^(software)$"]');
    expect(consulta).toContain('out center tags;');
  });
  it('no amplía la búsqueda a comercios, industrias o empresas genéricas', () => {
    const consulta = construirConsulta({ ...centro, radioKm: 30 }, daw);
    for (const termino of [
      'craft',
      'industrial',
      'shop',
      'estate_agent',
      'advertising_agency',
      'telecommunication',
      '^(company)$',
      '^(consulting)$',
    ]) {
      expect(consulta).not.toContain(termino);
    }
  });
  it('hace una petición POST para una búsqueda satisfactoria', async () => {
    const pedir = vi.fn().mockResolvedValue({ elements: [nodo] });
    expect(await buscarOsm({ ...centro, radioKm: 30 }, daw, { pedir })).toEqual(
      [nodo],
    );
    expect(pedir).toHaveBeenCalledTimes(1);
    expect(pedir.mock.calls[0][1].body.get('data')).toContain(
      'out center tags;',
    );
  });
  it('limita reintentos ante 429/504 con backoff', async () => {
    const error = Object.assign(new AppError(502, 'OSM_UNAVAILABLE', 'Error'), {
      externalStatus: 429,
    });
    const pedir = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce({ externalStatus: 504 })
      .mockResolvedValue({ elements: [] });
    const pausa = vi.fn().mockResolvedValue();
    await buscarOsm({ ...centro, radioKm: 30 }, daw, { pedir, pausa });
    expect(pedir).toHaveBeenCalledTimes(3);
    expect(pausa.mock.calls).toEqual([[2000], [4000]]);
    pedir.mockReset().mockRejectedValue(error);
    await expect(
      buscarOsm({ ...centro, radioKm: 30 }, daw, { pedir, pausa }),
    ).rejects.toBe(error);
    expect(pedir).toHaveBeenCalledTimes(3);
  });
  it('rechaza resultados parciales y no reintenta errores distintos de 429/504', async () => {
    const pedir = vi
      .fn()
      .mockResolvedValue({ elements: [], remark: 'runtime error: timeout' });
    await expect(
      buscarOsm({ ...centro, radioKm: 30 }, daw, { pedir }),
    ).rejects.toMatchObject({ code: 'INVALID_OSM_RESPONSE' });
    expect(pedir).toHaveBeenCalledTimes(1);
  });
});

describe('Geocodificación con caché y cola', () => {
  it('cachea localidades y espacia solicitudes simultáneas un segundo', async () => {
    let tiempo = 0;
    const pausa = vi.fn(async (ms) => {
      tiempo += ms;
    });
    const pedir = vi.fn().mockResolvedValue([
      {
        lat: '38.635',
        lon: '-0.866',
        display_name: 'Villena, Alicante, España',
      },
    ]);
    const geocodificar = crearGeocodificador({
      pedir,
      pausa,
      ahora: () => tiempo,
    });
    await Promise.all([
      geocodificar('Villena'),
      geocodificar(' VILLENA '),
      geocodificar('Alicante'),
    ]);
    expect(pedir).toHaveBeenCalledTimes(2);
    expect(pausa.mock.calls).toEqual([[0], [1000]]);
    const url = pedir.mock.calls[0][0];
    expect(url.searchParams.get('format')).toBe('jsonv2');
    expect(url.searchParams.get('countrycodes')).toBe('es');
  });
  it('recupera la cola después de un fallo y no cachea respuestas vacías', async () => {
    const pedir = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { lat: '38.635', lon: '-0.866', display_name: 'Villena' },
      ]);
    const geocodificar = crearGeocodificador({
      pedir,
      pausa: vi.fn(),
      ahora: () => 0,
    });
    await expect(geocodificar('Villena')).rejects.toMatchObject({
      code: 'LOCALITY_NOT_FOUND',
    });
    expect(await geocodificar('Villena')).toMatchObject(centro);
  });
  it('rechaza coordenadas externas inválidas', async () => {
    const geocodificar = crearGeocodificador({
      pedir: vi
        .fn()
        .mockResolvedValue([
          { lat: '999', lon: '0', display_name: 'Inválido' },
        ]),
      pausa: vi.fn(),
    });
    await expect(geocodificar('Villena')).rejects.toMatchObject({
      code: 'INVALID_OSM_RESPONSE',
    });
  });
});
