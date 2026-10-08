import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/dao/SearchDAO.js', () => ({
  SearchDAO: { crear: vi.fn(), actualizar: vi.fn(), obtener: vi.fn() },
}));
vi.mock('../src/dao/CompanyDAO.js', () => ({
  CompanyDAO: {
    guardarCandidatas: vi.fn(),
    listar: vi.fn(),
    obtener: vi.fn(),
    seleccionarParaAnalisis: vi.fn(),
  },
}));
vi.mock('../src/services/geocodingService.js', () => ({
  geocodificar: vi.fn(),
}));
vi.mock('../src/services/overpassService.js', () => ({ buscarOsm: vi.fn() }));
vi.mock('../src/ai/provider.js', () => ({
  obtenerProveedor: vi.fn(() => ({ generateJSON: vi.fn() })),
}));
vi.mock('../src/services/analysisService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  analizarEmpresa: vi.fn(),
}));
vi.mock('../src/middlewares/aiRateLimit.js', () => ({
  aiRateLimit: (req, res, next) => next(),
}));
import { SearchDAO } from '../src/dao/SearchDAO.js';
import { CompanyDAO } from '../src/dao/CompanyDAO.js';
import { geocodificar } from '../src/services/geocodingService.js';
import { buscarOsm } from '../src/services/overpassService.js';
import { AppError } from '../src/utils/AppError.js';
import { app } from '../src/app.js';
import { esperarJobs } from '../src/services/jobService.js';
import { analizarEmpresa } from '../src/services/analysisService.js';
import { obtenerProveedor } from '../src/ai/provider.js';

const id = '0123456789abcdef01234567';
describe('Búsquedas y empresas HTTP sin servicios externos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    SearchDAO.crear.mockResolvedValue({ _id: id });
    obtenerProveedor.mockReturnValue({ generateJSON: vi.fn() });
    CompanyDAO.seleccionarParaAnalisis.mockResolvedValue({
      empresas: [{ _id: id, nombre: 'Prueba' }],
      pendientes: 1,
      completadas: 0,
    });
    analizarEmpresa.mockResolvedValue({ error: false, omitida: false });
    geocodificar.mockResolvedValue({ lat: 38.635, lon: -0.866 });
    buscarOsm.mockResolvedValue([
      {
        type: 'node',
        id: 1,
        lat: 38.635,
        lon: -0.866,
        tags: { name: 'Prueba' },
      },
    ]);
  });
  afterEach(async () => {
    await esperarJobs();
  });
  it('devuelve searchId y procesa el job en segundo plano', async () => {
    const response = await request(app)
      .post('/api/searches')
      .send({ localidad: 'Villena' });
    expect(response.status).toBe(202);
    expect(response.body).toEqual({ searchId: id });
    await esperarJobs();
    expect(CompanyDAO.guardarCandidatas).toHaveBeenCalledWith(
      [expect.objectContaining({ osmId: 'node/1' })],
      id,
      'daw',
    );
    expect(SearchDAO.actualizar).toHaveBeenLastCalledWith(
      id,
      expect.objectContaining({ estado: 'completada' }),
    );
  });
  it('acepta coordenadas cero sin geocodificar', async () => {
    const response = await request(app)
      .post('/api/searches')
      .send({ lat: 0, lon: 0, radioKm: 1 });
    expect(response.status).toBe(202);
    await esperarJobs();
    expect(geocodificar).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { localidad: 'Villena', lat: 0, lon: 0 },
    { lat: 38 },
    { lat: 91, lon: 0 },
    { lat: 0, lon: 181 },
    { localidad: 'Villena', radioKm: 101 },
    { localidad: 'Villena', radioKm: 0 },
    { localidad: 'Villena', perfil: 'otro' },
    { localidad: 'Villena', extra: true },
  ])('rechaza entrada inválida %j', async (body) => {
    const response = await request(app).post('/api/searches').send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(SearchDAO.crear).not.toHaveBeenCalled();
  });
  it('registra el fallo externo y devuelve un error público', async () => {
    geocodificar.mockRejectedValue(
      new AppError(404, 'LOCALITY_NOT_FOUND', 'Localidad no encontrada.'),
    );
    const response = await request(app)
      .post('/api/searches')
      .send({ localidad: 'No existe' });
    expect(response.status).toBe(202);
    await esperarJobs();
    expect(SearchDAO.actualizar).toHaveBeenCalledWith(
      id,
      expect.objectContaining({
        estado: 'error',
        error: {
          code: 'LOCALITY_NOT_FOUND',
          message: 'Localidad no encontrada.',
        },
      }),
    );
  });
  it('recupera una búsqueda guardada', async () => {
    SearchDAO.obtener.mockResolvedValue({ _id: id, estado: 'completada' });
    const response = await request(app).get(`/api/searches/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.estado).toBe('completada');
  });
  it('responde sin esperar a Overpass y serializa dos jobs', async () => {
    let liberar;
    const esperando = new Promise((resolve) => {
      liberar = resolve;
    });
    buscarOsm.mockReturnValueOnce(esperando);
    const primera = request(app)
      .post('/api/searches')
      .send({ localidad: 'Villena' })
      .then((response) => response);
    await vi.waitFor(() => expect(buscarOsm).toHaveBeenCalledTimes(1));
    try {
      const segunda = await request(app)
        .post('/api/searches')
        .send({ localidad: 'Alicante' });
      expect(segunda.status).toBe(202);
      expect(buscarOsm).toHaveBeenCalledTimes(1);
    } finally {
      liberar([]);
    }
    expect((await primera).status).toBe(202);
    await esperarJobs();
    expect(buscarOsm).toHaveBeenCalledTimes(2);
  });
  it('valida ids y paginación y distingue registros inexistentes', async () => {
    expect((await request(app).get('/api/searches/invalido')).status).toBe(400);
    expect((await request(app).get(`/api/searches/${id}`)).status).toBe(404);
    expect((await request(app).get('/api/companies?limite=101')).status).toBe(
      400,
    );
    expect((await request(app).get(`/api/companies/${id}`)).status).toBe(404);
  });
  it('lista empresas paginadas con distancia relativa a una búsqueda', async () => {
    SearchDAO.obtener.mockResolvedValue({
      centro: { lat: 38.635, lon: -0.866 },
    });
    CompanyDAO.listar.mockResolvedValue({
      empresas: [{ ubicacion: { lat: 38.635, lon: -0.866 } }],
      total: 1,
      pagina: 1,
      limite: 20,
    });
    const response = await request(app).get(`/api/companies?searchId=${id}`);
    expect(response.status).toBe(200);
    expect(response.body.empresas[0].distanciaKm).toBe(0);
    expect(CompanyDAO.listar).toHaveBeenCalledWith(
      {
        searchId: id,
        pagina: 1,
        limite: 20,
        orden: 'nombre',
        direccion: 'asc',
      },
      { lat: 38.635, lon: -0.866 },
    );
  });
  it('mantiene la localización utilizable sin IA y sin pedir proveedor', async () => {
    const response = await request(app)
      .post('/api/searches')
      .send({ localidad: 'Villena', analizar: false });
    expect(response.status).toBe(202);
    await esperarJobs();
    expect(obtenerProveedor).not.toHaveBeenCalled();
    expect(analizarEmpresa).not.toHaveBeenCalled();
    expect(SearchDAO.actualizar).toHaveBeenCalledWith(
      id,
      expect.objectContaining({ totalCandidatas: 1 }),
    );
  });
  it('rechaza IA sin configuración antes de crear job o consumir OSM', async () => {
    obtenerProveedor.mockImplementation(() => {
      throw new AppError(503, 'AI_NOT_CONFIGURED', 'Configura el backend.');
    });
    const response = await request(app)
      .post('/api/searches')
      .send({ localidad: 'Villena' });
    expect(response.status).toBe(503);
    expect(SearchDAO.crear).not.toHaveBeenCalled();
    expect(buscarOsm).not.toHaveBeenCalled();
  });
  it('publica el límite del lote y omite completadas', async () => {
    CompanyDAO.seleccionarParaAnalisis.mockResolvedValue({
      empresas: [],
      pendientes: 0,
      completadas: 128,
    });
    await request(app).post('/api/searches').send({ localidad: 'Villena' });
    await esperarJobs();
    expect(analizarEmpresa).not.toHaveBeenCalled();
    expect(SearchDAO.actualizar).toHaveBeenCalledWith(
      id,
      expect.objectContaining({ total: 0, omitidasCompletadas: 128 }),
    );
  });
  it('separa fallos de empresas y continúa con el resto del lote', async () => {
    CompanyDAO.seleccionarParaAnalisis.mockResolvedValue({
      empresas: [
        { _id: id, nombre: 'Primera' },
        { _id: id, nombre: 'Segunda' },
      ],
      pendientes: 20,
      completadas: 5,
    });
    analizarEmpresa
      .mockResolvedValueOnce({ error: true })
      .mockResolvedValueOnce({ error: false });
    await request(app).post('/api/searches').send({ localidad: 'Villena' });
    await esperarJobs();
    expect(analizarEmpresa).toHaveBeenCalledTimes(2);
    expect(SearchDAO.actualizar).toHaveBeenCalledWith(
      id,
      expect.objectContaining({
        total: 2,
        pendientesFueraLote: 18,
        omitidasCompletadas: 5,
      }),
    );
    expect(SearchDAO.actualizar).toHaveBeenCalledWith(id, {
      procesadas: 2,
      errores: 1,
    });
  });
  it('reanálisis explícito crea un job sin consultar OSM', async () => {
    CompanyDAO.obtener.mockResolvedValue({
      _id: id,
      nombre: 'Prueba',
      perfil: 'daw',
      analisisEstado: 'completado',
    });
    const response = await request(app)
      .post(`/api/companies/${id}/reanalyze`)
      .send({});
    expect(response.status).toBe(202);
    await esperarJobs();
    expect(buscarOsm).not.toHaveBeenCalled();
    expect(analizarEmpresa).toHaveBeenCalledWith(id, expect.any(Object), true);
  });
});
