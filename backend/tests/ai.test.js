import { describe, expect, it, vi } from 'vitest';
import { validarAnalisis } from '../src/ai/analysisSchema.js';
import { generarAnalisis } from '../src/services/aiService.js';
import { crearGroqProvider } from '../src/ai/groqProvider.js';
import { crearGeminiProvider } from '../src/ai/geminiProvider.js';
import { crearClienteIA } from '../src/ai/client.js';
import { crearCola } from '../src/utils/queue.js';

const analisis = {
  empresa: 'Prueba',
  actividad: 'desconocido',
  interesDAW: null,
  puntuacion: 0,
  tecnologias: [],
  posibleTeletrabajo: null,
  confianza: 'baja',
  motivo: 'No hay evidencia suficiente.',
  fuentesUsadas: ['osm'],
};
const contexto = { nombre: 'Prueba', tieneWeb: false };
const empresa = {
  nombre: 'Prueba',
  osmId: 'node/1',
  ubicacion: { direccion: 'Villena' },
  infoObtenida: { etiquetasOsm: { name: 'Prueba' } },
  notaInterna: 'NO COMPARTIR',
  borradorEmail: 'NO COMPARTIR',
};

describe('Validación y corrección IA', () => {
  it('acepta desconocidos explícitos', () => {
    expect(validarAnalisis(JSON.stringify(analisis), contexto)).toEqual(
      analisis,
    );
  });
  it.each([
    'no es JSON',
    '```json\n{}\n```',
    'null',
    '{}',
    JSON.stringify({ ...analisis, puntuacion: 101 }),
    JSON.stringify({ ...analisis, interesDAW: 'true' }),
    JSON.stringify({ ...analisis, fuentesUsadas: ['osm', 'web'] }),
    JSON.stringify({ ...analisis, empresa: 'Otra' }),
    JSON.stringify({ ...analisis, extra: true }),
  ])('rechaza salida inválida %s', (texto) => {
    expect(() => validarAnalisis(texto, contexto)).toThrow(
      expect.objectContaining({ code: 'AI_INVALID_JSON' }),
    );
  });
  it('permite una sola corrección y limita los datos enviados', async () => {
    const proveedor = {
      generateJSON: vi
        .fn()
        .mockResolvedValueOnce('inválido')
        .mockResolvedValueOnce(JSON.stringify(analisis)),
    };
    expect(await generarAnalisis(empresa, '', proveedor)).toEqual(analisis);
    expect(proveedor.generateJSON).toHaveBeenCalledTimes(2);
    expect(proveedor.generateJSON.mock.calls[1][1]).toContain('CORRECCIÓN');
    expect(proveedor.generateJSON.mock.calls[0][1]).not.toContain(
      'NO COMPARTIR',
    );
  });
  it('falla tras la segunda respuesta inválida, sin bucle', async () => {
    const proveedor = { generateJSON: vi.fn().mockResolvedValue('{}') };
    await expect(generarAnalisis(empresa, '', proveedor)).rejects.toMatchObject(
      { code: 'AI_INVALID_JSON' },
    );
    expect(proveedor.generateJSON).toHaveBeenCalledTimes(2);
  });
  it('no intenta corregir errores de autenticación', async () => {
    const proveedor = {
      generateJSON: vi.fn().mockRejectedValue(new Error('Autenticación')),
    };
    await expect(generarAnalisis(empresa, '', proveedor)).rejects.toThrow();
    expect(proveedor.generateJSON).toHaveBeenCalledTimes(1);
  });
});

describe('Proveedores con transporte simulado', () => {
  it('Groq usa modelo configurable, Bearer y modo JSON', async () => {
    const solicitar = vi
      .fn()
      .mockResolvedValue({ choices: [{ message: { content: '{}' } }] });
    const provider = crearGroqProvider({
      apiKey: 'clave-prueba',
      model: 'modelo-prueba',
      solicitar,
    });
    expect(await provider.generateJSON('sistema', 'usuario')).toBe('{}');
    expect(solicitar).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      { Authorization: 'Bearer clave-prueba' },
      expect.objectContaining({
        model: 'modelo-prueba',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'sistema' },
          { role: 'user', content: 'usuario' },
        ],
      }),
    );
  });
  it('Gemini mantiene la clave en cabecera y separa sistema y evidencia', async () => {
    const solicitar = vi.fn().mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ thought: true, text: 'no incluir' }, { text: '{}' }],
          },
        },
      ],
    });
    const provider = crearGeminiProvider({
      apiKey: 'clave-prueba',
      model: 'models/modelo-prueba',
      solicitar,
    });
    expect(await provider.generateJSON('sistema', 'usuario')).toBe('{}');
    expect(solicitar).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/modelo-prueba:generateContent',
      { 'x-goog-api-key': 'clave-prueba' },
      expect.objectContaining({
        systemInstruction: { parts: [{ text: 'sistema' }] },
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 2500,
        },
      }),
    );
  });
  it('no devuelve respuestas vacías como resultados válidos', async () => {
    const provider = crearGroqProvider({
      apiKey: 'prueba',
      model: 'prueba',
      solicitar: vi.fn().mockResolvedValue({}),
    });
    await expect(
      provider.generateJSON('sistema', 'usuario'),
    ).rejects.toMatchObject({ code: 'AI_EMPTY_RESPONSE' });
  });
});

describe('Cola y reintentos del cliente IA', () => {
  it('serializa, pausa también tras un error y recupera la cola', async () => {
    const eventos = [];
    const cola = crearCola({
      delayMs: 1000,
      pausa: async (ms) => eventos.push(ms),
    });
    const primera = cola.encolar(async () => {
      eventos.push('primera');
      throw new Error('simulado');
    });
    const segunda = cola.encolar(async () => {
      eventos.push('segunda');
      return 2;
    });
    await expect(primera).rejects.toThrow('simulado');
    expect(await segunda).toBe(2);
    expect(eventos).toEqual(['primera', 1000, 'segunda']);
  });
  it('reintenta 429 con backoff limitado y no expone el cuerpo de error', async () => {
    const pedir = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 429, body: { cancel: vi.fn() } });
    const pausa = vi.fn();
    const solicitar = crearClienteIA({
      pedir,
      pausa,
      cola: crearCola(),
      reintentos: 2,
    });
    await expect(
      solicitar('https://example.org', {}, {}),
    ).rejects.toMatchObject({ code: 'AI_RATE_LIMIT' });
    expect(pedir).toHaveBeenCalledTimes(3);
    expect(pausa.mock.calls).toEqual([[2000], [4000]]);
  });
  it('no reintenta 401 ni transmite trazas o secretos', async () => {
    const json = vi.fn().mockResolvedValue({ error: 'secreto' });
    const pedir = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json,
      body: { cancel: vi.fn() },
    });
    const solicitar = crearClienteIA({ pedir, cola: crearCola() });
    await expect(
      solicitar('https://example.org', {}, {}),
    ).rejects.toMatchObject({ code: 'AI_AUTH_ERROR' });
    expect(pedir).toHaveBeenCalledTimes(1);
    expect(json).not.toHaveBeenCalled();
  });
});
