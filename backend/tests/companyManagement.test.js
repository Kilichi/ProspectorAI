import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
vi.mock('../src/dao/CompanyDAO.js', () => ({
  CompanyDAO: { listar: vi.fn(), editar: vi.fn() },
}));
vi.mock('../src/dao/SearchDAO.js', () => ({ SearchDAO: { obtener: vi.fn() } }));
import { CompanyDAO } from '../src/dao/CompanyDAO.js';
import { SearchDAO } from '../src/dao/SearchDAO.js';
import { app } from '../src/app.js';
import { construirFiltroEmpresas } from '../src/utils/companyFilters.js';

const id = '0123456789abcdef01234567';
describe('Filtros y edición docente', () => {
  beforeEach(() => vi.resetAllMocks());
  it('combina filtros sin interpretar regex ni booleanos por truthiness', () => {
    const filtro = construirFiltroEmpresas({
      interesDAW: 'false',
      teletrabajo: 'desconocido',
      tecnologia: 'C++',
      texto: '.*',
      minPuntuacion: 0,
    });
    expect(filtro.interesDAW).toBe(false);
    expect(filtro.posibleTeletrabajo).toBe(null);
    expect(filtro.tecnologias.$regex).toBe('^C\\+\\+$');
    expect(filtro.$or[0].nombre.$regex).toBe('\\.\\*');
    expect(filtro.puntuacion).toEqual({ $gte: 0 });
  });
  it('acepta todos los filtros válidos y los envía al DAO', async () => {
    CompanyDAO.listar.mockResolvedValue({ empresas: [], total: 0 });
    const response = await request(app).get(
      '/api/companies?interesDAW=false&teletrabajo=desconocido&minPuntuacion=40&orden=puntuacion&direccion=desc&analisisEstado=completado&estadoContacto=Pendiente',
    );
    expect(response.status).toBe(200);
    expect(CompanyDAO.listar).toHaveBeenCalledWith(
      expect.objectContaining({
        interesDAW: 'false',
        minPuntuacion: 40,
        orden: 'puntuacion',
        direccion: 'desc',
      }),
      undefined,
    );
  });
  it.each([
    'interesDAW=1',
    'teletrabajo=no',
    'minPuntuacion=101',
    'orden=__proto__',
    'texto[$ne]=x',
    'direccion=otro',
  ])('rechaza filtro inválido %s', async (consulta) => {
    expect((await request(app).get(`/api/companies?${consulta}`)).status).toBe(
      400,
    );
    expect(CompanyDAO.listar).not.toHaveBeenCalled();
  });
  it('exige centro de búsqueda para ordenar por distancia', async () => {
    expect(
      (await request(app).get('/api/companies?orden=distancia')).status,
    ).toBe(400);
    SearchDAO.obtener.mockResolvedValue({ centro: { lat: 38, lon: -1 } });
    CompanyDAO.listar.mockResolvedValue({ empresas: [], total: 0 });
    expect(
      (await request(app).get(`/api/companies?orden=distancia&searchId=${id}`))
        .status,
    ).toBe(200);
  });
  it('permite vaciar tecnologías y valores desconocidos en una edición', async () => {
    CompanyDAO.editar.mockResolvedValue({
      _id: id,
      interesDAW: null,
      tecnologias: [],
    });
    const cambios = {
      interesDAW: null,
      puntuacion: null,
      tecnologias: [],
      notaInterna: ' Nota revisada ',
    };
    const response = await request(app)
      .patch(`/api/companies/${id}`)
      .send(cambios);
    expect(response.status).toBe(200);
    expect(CompanyDAO.editar).toHaveBeenCalledWith(id, {
      ...cambios,
      notaInterna: 'Nota revisada',
    });
  });
  it.each([
    {},
    { puntuacion: 101 },
    { interesDAW: 'true' },
    { analisisEstado: 'completado' },
    { estadoContacto: 'Contactada' },
    { tecnologias: [''] },
  ])('rechaza campos o valores de edición inválidos %j', async (body) => {
    expect(
      (await request(app).patch(`/api/companies/${id}`).send(body)).status,
    ).toBe(400);
    expect(CompanyDAO.editar).not.toHaveBeenCalled();
  });
  it('devuelve 404 si se intenta editar una empresa inexistente', async () => {
    CompanyDAO.editar.mockResolvedValue(null);
    expect(
      (
        await request(app)
          .patch(`/api/companies/${id}`)
          .send({ puntuacion: 50 })
      ).status,
    ).toBe(404);
  });
});
