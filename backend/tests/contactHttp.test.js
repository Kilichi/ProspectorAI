import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
vi.mock('../src/dao/CompanyDAO.js', () => ({
  CompanyDAO: {
    cambiarEstadoContacto: vi.fn(),
    estadisticas: vi.fn(),
    guardarBorradorManual: vi.fn(),
    obtener: vi.fn(),
  },
}));
import { CompanyDAO } from '../src/dao/CompanyDAO.js';
import { app } from '../src/app.js';
const id = '0123456789abcdef01234567';
describe('Contacto y estadísticas HTTP', () => {
  beforeEach(() => vi.resetAllMocks());
  it('guarda estado y nota únicamente por petición explícita', async () => {
    CompanyDAO.cambiarEstadoContacto.mockResolvedValue({
      _id: id,
      estadoContacto: 'Contactada',
    });
    const response = await request(app)
      .patch(`/api/companies/${id}/contact-status`)
      .send({ estado: 'Contactada', nota: 'Enviado manualmente' });
    expect(response.status).toBe(200);
    expect(CompanyDAO.cambiarEstadoContacto).toHaveBeenCalledWith(id, {
      estado: 'Contactada',
      nota: 'Enviado manualmente',
    });
  });
  it.each([
    { estado: 'enviada' },
    { estado: 'Contactada', enviar: true },
    { estado: 'Contactada', nota: 'a'.repeat(2001) },
  ])('rechaza estado o campos inválidos', async (body) => {
    expect(
      (
        await request(app)
          .patch(`/api/companies/${id}/contact-status`)
          .send(body)
      ).status,
    ).toBe(400);
  });
  it('guarda el borrador editado con versión', async () => {
    CompanyDAO.guardarBorradorManual.mockResolvedValue({ _id: id });
    const response = await request(app)
      .patch(`/api/companies/${id}/email-draft`)
      .send({ asunto: 'Colaboración', cuerpo: 'Texto revisado.', version: 1 });
    expect(response.status).toBe(200);
    expect(CompanyDAO.guardarBorradorManual).toHaveBeenCalledWith(
      id,
      { asunto: 'Colaboración', cuerpo: 'Texto revisado.' },
      1,
    );
  });
  it('rechaza asunto con saltos y no expone un endpoint de envío', async () => {
    expect(
      (
        await request(app)
          .patch(`/api/companies/${id}/email-draft`)
          .send({ asunto: 'Hola\nBcc: otro', cuerpo: 'Texto', version: 1 })
      ).status,
    ).toBe(400);
    expect(
      (await request(app).post(`/api/companies/${id}/send-email`).send({}))
        .status,
    ).toBe(404);
  });
  it('consulta estadísticas sin acceder a IA', async () => {
    CompanyDAO.estadisticas.mockResolvedValue({ total: 128, tecnologias: [] });
    const response = await request(app).get('/api/stats');
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(128);
    expect(CompanyDAO.estadisticas).toHaveBeenCalledWith(undefined);
  });
});
