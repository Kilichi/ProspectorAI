import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { aiRateLimit } from '../src/middlewares/aiRateLimit.js';

describe('Límite HTTP de operaciones IA', () => {
  it('devuelve 429 uniforme al superar diez operaciones por minuto', async () => {
    const app = express();
    app.post('/operacion', aiRateLimit, (req, res) => res.sendStatus(202));
    for (let i = 0; i < 10; i++)
      expect((await request(app).post('/operacion')).status).toBe(202);
    const response = await request(app).post('/operacion');
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMIT');
  });
});
