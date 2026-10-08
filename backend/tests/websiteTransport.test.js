import { afterEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { descargarHtml } from '../src/services/websiteService.js';

function simularRespuesta(headers, partes, statusCode = 200) {
  const respuesta = Object.assign(new EventEmitter(), {
    statusCode,
    headers,
    destroy: vi.fn(),
  });
  const peticion = Object.assign(new EventEmitter(), { end: vi.fn() });
  const request = vi
    .spyOn(http, 'request')
    .mockImplementation((url, opciones, callback) => {
      queueMicrotask(() => {
        callback(respuesta);
        for (const parte of partes) respuesta.emit('data', Buffer.from(parte));
        respuesta.emit('end');
      });
      return peticion;
    });
  return { request, respuesta };
}

const destino = {
  url: new URL('http://example.org/'),
  direccion: { address: '93.184.216.34', family: 4 },
};
describe('Transporte web con socket simulado', () => {
  afterEach(() => vi.restoreAllMocks());
  it('fija la IP aprobada y no realiza otra resolución DNS', async () => {
    const { request } = simularRespuesta({ 'content-type': 'text/html' }, [
      '<p>Prueba</p>',
    ]);
    expect(await descargarHtml(destino, new AbortController().signal)).toEqual({
      html: '<p>Prueba</p>',
    });
    const opciones = request.mock.calls[0][1];
    const callback = vi.fn();
    opciones.lookup('example.org', {}, callback);
    expect(callback).toHaveBeenCalledWith(null, '93.184.216.34', 4);
    expect(opciones.agent).toBe(false);
    expect(opciones.headers['User-Agent']).toContain('ProspectorAI');
  });
  it('corta el stream al exceder el máximo aunque no exista Content-Length', async () => {
    const { respuesta } = simularRespuesta({ 'content-type': 'text/html' }, [
      'a'.repeat(300000),
      'b'.repeat(300000),
    ]);
    await expect(
      descargarHtml(destino, new AbortController().signal),
    ).rejects.toMatchObject({ code: 'WEB_TOO_LARGE' });
    expect(respuesta.destroy).toHaveBeenCalled();
  });
  it.each([
    { 'content-type': 'application/pdf' },
    { 'content-type': 'text/html', 'content-encoding': 'gzip' },
    { 'content-type': 'text/html', 'content-length': '600000' },
  ])('rechaza formato o tamaño inseguro %j', async (headers) => {
    simularRespuesta(headers, []);
    await expect(
      descargarHtml(destino, new AbortController().signal),
    ).rejects.toThrow();
  });
});
