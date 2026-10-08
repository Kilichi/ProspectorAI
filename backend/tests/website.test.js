import { describe, expect, it, vi } from 'vitest';
import {
  direccionPublica,
  validarDestino,
  obtenerTextoWeb,
  extraerTexto,
} from '../src/services/websiteService.js';

const resolver = vi
  .fn()
  .mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
describe('Descarga web segura sin red real', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('bloquea IP interna o reservada %s', (ip) => {
    expect(direccionPublica(ip)).toBe(false);
  });
  it.each([
    'file:///etc/passwd',
    'http://localhost',
    'http://127.1',
    'http://2130706433',
    'http://[::1]',
    'http://usuario:clave@example.org',
    'https://example.org:3001',
  ])('bloquea URL insegura %s', async (url) => {
    await expect(validarDestino(url, resolver)).rejects.toThrow();
  });
  it('rechaza DNS que mezcla direcciones públicas y privadas', async () => {
    await expect(
      validarDestino('https://example.org', async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ]),
    ).rejects.toMatchObject({ code: 'WEB_PRIVATE_DESTINATION' });
  });
  it('descarga solo la principal y pasa la IP validada al transporte', async () => {
    const descargar = vi
      .fn()
      .mockResolvedValue({ html: '<p>Desarrollo de aplicaciones web</p>' });
    const result = await obtenerTextoWeb(
      'https://example.org/contacto?token=secreto',
      { resolver, descargar },
    );
    expect(result).toMatchObject({
      estado: 'obtenida',
      texto: 'Desarrollo de aplicaciones web',
      url: 'https://example.org/',
    });
    expect(descargar.mock.calls[0][0].direccion.address).toBe('93.184.216.34');
    expect(descargar).toHaveBeenCalledTimes(1);
  });
  it('valida cada redirección y no visita un destino privado', async () => {
    const descargar = vi
      .fn()
      .mockResolvedValue({ redireccion: 'http://169.254.169.254/' });
    const result = await obtenerTextoWeb('http://example.org', {
      resolver,
      descargar,
    });
    expect(result.motivo).toBe('WEB_PRIVATE_DESTINATION');
    expect(descargar).toHaveBeenCalledTimes(1);
  });
  it('bloquea downgrade HTTPS y limita redirecciones', async () => {
    const descargar = vi
      .fn()
      .mockResolvedValue({ redireccion: 'http://example.org/' });
    expect(
      (await obtenerTextoWeb('https://example.org', { resolver, descargar }))
        .motivo,
    ).toBe('WEB_UNSAFE_REDIRECT');
    descargar.mockResolvedValue({ redireccion: '/es' });
    expect(
      (await obtenerTextoWeb('https://example.org', { resolver, descargar }))
        .motivo,
    ).toBe('WEB_REDIRECT_LIMIT');
  });
  it('extrae texto, elimina scripts/ocultos y recorta a 4000 caracteres', () => {
    expect(
      extraerTexto(
        '<p>Hola</p><script>secreto</script><style>secreto</style><div hidden>oculto</div><p>Mundo</p>',
      ),
    ).toBe('Hola Mundo');
    expect(extraerTexto(`<p>${'a'.repeat(5000)}</p>`)).toHaveLength(4000);
  });
  it('continúa sin web ante ausencia, error o exceso de bytes', async () => {
    expect((await obtenerTextoWeb(null)).estado).toBe('sin_web');
    expect(
      (
        await obtenerTextoWeb('https://example.org', {
          resolver,
          descargar: vi.fn().mockRejectedValue(new Error('Detalle interno')),
        })
      ).motivo,
    ).toBe('WEB_DOWNLOAD_FAILED');
    expect(
      (
        await obtenerTextoWeb('https://example.org', {
          resolver,
          descargar: vi
            .fn()
            .mockResolvedValue({ html: 'a'.repeat(512 * 1024 + 1) }),
        })
      ).motivo,
    ).toBe('WEB_TOO_LARGE');
  });
  it('el plazo global incluye la resolución DNS', async () => {
    vi.useFakeTimers();
    // AbortSignal usa temporizadores nativos; simular su señal para no esperar 8 s.
    const control = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(control.signal);
    try {
      const tarea = obtenerTextoWeb('https://example.org', {
        resolver: () => new Promise(() => {}),
        descargar: vi.fn(),
      });
      control.abort();
      expect((await tarea).motivo).toBe('WEB_TIMEOUT');
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  });
});
