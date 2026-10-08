import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { readFile } from 'node:fs/promises';

vi.mock('../src/dao/SearchDAO.js', () => ({
  SearchDAO: {
    obtener: vi.fn(),
    actualizar: vi.fn(),
    reclamarPreparacion: vi.fn(),
    registrarAnalizada: vi.fn(),
  },
}));
vi.mock('../src/services/analysisService.js', () => ({
  analizarEmpresa: vi.fn(),
  errorPublico: (error) => ({
    code: error.code || 'FAILED',
    message: 'Error controlado.',
  }),
}));
vi.mock('../src/services/searchService.js', () => ({
  prepararCandidatas: vi.fn(),
  crearBusqueda: vi.fn(),
}));
vi.mock('../src/ai/provider.js', () => ({
  obtenerProveedor: vi.fn(() => ({})),
}));
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { SearchDAO } from '../src/dao/SearchDAO.js';
import {
  prepararCandidatas,
  crearBusqueda,
} from '../src/services/searchService.js';
import { analizarEmpresa } from '../src/services/analysisService.js';
import {
  prepararWorkflow,
  analizarDesdeWorkflow,
} from '../src/services/n8nService.js';

const searchId = '0123456789abcdef01234567';
const empresaId = 'abcdef0123456789abcdef01';
const tokenAnterior = env.ORCHESTRATOR_TOKEN;
beforeEach(() => {
  vi.clearAllMocks();
  env.ORCHESTRATOR_TOKEN = 't'.repeat(64);
});
afterEach(() => {
  env.ORCHESTRATOR_TOKEN = tokenAnterior;
});

describe('Orquestación protegida de n8n', () => {
  it('rechaza llamadas sin token antes de acceder a la base de datos', async () => {
    const respuesta = await request(app)
      .post('/api/orchestration/prepare')
      .send({ searchId });
    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.code).toBe('ORCHESTRATOR_UNAUTHORIZED');
    expect(SearchDAO.reclamarPreparacion).not.toHaveBeenCalled();
  });
  it('valida parámetros incluso con token correcto', async () => {
    const respuesta = await request(app)
      .post('/api/orchestration/prepare')
      .set('X-Orchestrator-Token', env.ORCHESTRATOR_TOKEN)
      .send({ localidad: 'Villena', radioKm: 101 });
    expect(respuesta.status).toBe(400);
  });
  it('prepara un job y entrega solo los identificadores del lote', async () => {
    SearchDAO.reclamarPreparacion.mockResolvedValue({
      _id: searchId,
      parametros: { localidad: 'Villena' },
      analizar: true,
    });
    prepararCandidatas.mockResolvedValue([
      { _id: empresaId, nombre: 'Prueba', web: 'https://example.org' },
    ]);
    const resultado = await prepararWorkflow({ searchId });
    expect(resultado.empresas).toEqual([{ id: empresaId, nombre: 'Prueba' }]);
    expect(SearchDAO.actualizar).toHaveBeenLastCalledWith(searchId, {
      estado: 'analizando',
    });
  });
  it('acepta parámetros directamente desde el webhook y termina lotes vacíos', async () => {
    crearBusqueda.mockResolvedValue({ searchId });
    SearchDAO.reclamarPreparacion.mockResolvedValue({
      _id: searchId,
      parametros: {},
      analizar: false,
    });
    prepararCandidatas.mockResolvedValue([]);
    await prepararWorkflow({ localidad: 'Villena', analizar: false });
    expect(crearBusqueda).toHaveBeenCalledWith(
      { localidad: 'Villena', analizar: false },
      true,
    );
    expect(SearchDAO.actualizar).toHaveBeenLastCalledWith(
      searchId,
      expect.objectContaining({ estado: 'completada' }),
    );
  });
  it('no repite empresas atendidas aunque n8n reintente el HTTP', async () => {
    SearchDAO.obtener.mockResolvedValue({
      orquestador: 'n8n',
      estado: 'completada',
      empresaIds: [empresaId],
      atendidasIds: [empresaId],
    });
    expect(await analizarDesdeWorkflow(searchId, empresaId)).toMatchObject({
      omitida: true,
    });
    expect(analizarEmpresa).not.toHaveBeenCalled();
  });
  it('registra un fallo de IA y completa el lote sin detener el bucle', async () => {
    SearchDAO.obtener.mockResolvedValue({
      orquestador: 'n8n',
      estado: 'analizando',
      empresaIds: [empresaId],
      atendidasIds: [],
    });
    analizarEmpresa.mockResolvedValue({ error: true, omitida: false });
    SearchDAO.registrarAnalizada.mockResolvedValue({ procesadas: 1, total: 1 });
    await analizarDesdeWorkflow(searchId, empresaId);
    expect(SearchDAO.registrarAnalizada).toHaveBeenCalledWith(
      searchId,
      empresaId,
      true,
    );
    expect(SearchDAO.actualizar).toHaveBeenLastCalledWith(
      searchId,
      expect.objectContaining({ estado: 'completada' }),
    );
  });
  it('impide analizar empresas ajenas al job', async () => {
    SearchDAO.obtener.mockResolvedValue({
      orquestador: 'n8n',
      estado: 'analizando',
      empresaIds: [],
      atendidasIds: [],
    });
    await expect(
      analizarDesdeWorkflow(searchId, empresaId),
    ).rejects.toMatchObject({ code: 'JOB_COMPANY_NOT_FOUND' });
    expect(analizarEmpresa).not.toHaveBeenCalled();
  });
  it('el workflow exportado conecta lote de uno, análisis y espera, sin nodos de envío', async () => {
    const archivo = new URL(
      '../../n8n/workflows/buscar-empresas.json',
      import.meta.url,
    );
    const workflow = JSON.parse(await readFile(archivo, 'utf8'));
    // El importador CLI necesita un id raíz, además de los ids de los nodos.
    expect(workflow.id).toBe('ProspectorAISearch01');
    expect(workflow.versionId).toMatch(/^[a-f\d-]{36}$/i);
    expect(workflow.active).toBe(false);
    // Contrato n8n: sin webhookId la URL recibe un prefijo inesperado.
    const webhook = workflow.nodes.find((node) =>
      node.type.endsWith('.webhook'),
    );
    expect(webhook.webhookId).toMatch(/^[a-f\d-]{36}$/i);
    expect(webhook.parameters.path).toBe('buscar-empresas');
    expect(webhook.parameters.httpMethod).toBe('POST');
    const bucle = workflow.nodes.find((node) =>
      node.type.endsWith('.splitInBatches'),
    );
    expect(bucle.parameters.batchSize).toBe(1);
    expect(workflow.connections[bucle.name].main[1][0].node).toBe(
      'Analizar empresa',
    );
    expect(workflow.connections['Respetar pausa'].main[0][0].node).toBe(
      bucle.name,
    );
    expect(
      workflow.nodes.some((node) => /smtp|emailSend|gmail/i.test(node.type)),
    ).toBe(false);
    expect(
      workflow.nodes
        .filter((node) => node.type.endsWith('.httpRequest'))
        .every(
          (node) => node.parameters.authentication === 'genericCredentialType',
        ),
    ).toBe(true);
  });
});
