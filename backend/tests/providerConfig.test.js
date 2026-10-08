import { afterEach, describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { obtenerProveedor } from '../src/ai/provider.js';

const anterior = {
  AI_PROVIDER: env.AI_PROVIDER,
  AI_MODEL: env.AI_MODEL,
  GROQ_API_KEY: env.GROQ_API_KEY,
  GEMINI_API_KEY: env.GEMINI_API_KEY,
};
describe('Selección del proveedor sin llamadas externas', () => {
  afterEach(() => Object.assign(env, anterior));
  it('exige modelo y clave del proveedor seleccionado', () => {
    Object.assign(env, {
      AI_PROVIDER: 'groq',
      AI_MODEL: 'modelo-prueba',
      GROQ_API_KEY: '',
      GEMINI_API_KEY: 'clave-simulada',
    });
    expect(obtenerProveedor).toThrow(
      expect.objectContaining({ code: 'AI_NOT_CONFIGURED' }),
    );
    env.GROQ_API_KEY = 'clave-simulada';
    expect(typeof obtenerProveedor().generateJSON).toBe('function');
    env.AI_MODEL = '';
    expect(obtenerProveedor).toThrow();
  });
  it('selecciona Gemini mediante la configuración de entorno', () => {
    Object.assign(env, {
      AI_PROVIDER: 'gemini',
      AI_MODEL: 'modelo-prueba',
      GROQ_API_KEY: '',
      GEMINI_API_KEY: 'clave-simulada',
    });
    expect(typeof obtenerProveedor().generateJSON).toBe('function');
  });
});
