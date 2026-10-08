import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/database.js', () => ({ databaseStatus: vi.fn() }));
import { databaseStatus } from '../src/config/database.js';
import { app } from '../src/app.js';

describe('Infraestructura HTTP', () => {
  it('informa de que el servicio está preparado cuando MongoDB está conectado', async () => {
    databaseStatus.mockReturnValue('conectada');
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'ProspectorAI',
      database: 'conectada',
    });
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
  });
  it('devuelve 503 si MongoDB no está disponible', async () => {
    databaseStatus.mockReturnValue('desconectada');
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degradado');
  });
  it('normaliza las rutas inexistentes', async () => {
    const response = await request(app).get('/no-existe');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
  it('rechaza JSON inválido sin revelar trazas', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_JSON',
        message: 'El cuerpo debe contener JSON válido.',
      },
    });
  });
});
