import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/dao/CompanyDAO.js', () => ({
  CompanyDAO: {
    reclamar: vi.fn(),
    guardarAnalisis: vi.fn(),
    marcarError: vi.fn(),
  },
}));
vi.mock('../src/services/websiteService.js', () => ({
  obtenerTextoWeb: vi.fn(),
}));
vi.mock('../src/services/aiService.js', () => ({ generarAnalisis: vi.fn() }));
import { CompanyDAO } from '../src/dao/CompanyDAO.js';
import { obtenerTextoWeb } from '../src/services/websiteService.js';
import { generarAnalisis } from '../src/services/aiService.js';
import { analizarEmpresa } from '../src/services/analysisService.js';
import { AppError } from '../src/utils/AppError.js';

describe('Orquestación del análisis por empresa', () => {
  beforeEach(() => vi.resetAllMocks());
  it('no vuelve a analizar una empresa no reclamable', async () => {
    CompanyDAO.reclamar.mockResolvedValue(null);
    expect(await analizarEmpresa('id', {})).toEqual({
      omitida: true,
      error: false,
    });
    expect(obtenerTextoWeb).not.toHaveBeenCalled();
    expect(generarAnalisis).not.toHaveBeenCalled();
  });
  it('continúa sin texto cuando falla la web y registra el motivo', async () => {
    const empresa = { _id: 'id', nombre: 'Prueba', web: 'https://example.org' };
    const web = {
      texto: '',
      estado: 'error',
      motivo: 'WEB_TIMEOUT',
      url: null,
    };
    CompanyDAO.reclamar.mockResolvedValue(empresa);
    obtenerTextoWeb.mockResolvedValue(web);
    generarAnalisis.mockResolvedValue({ empresa: 'Prueba' });
    expect(await analizarEmpresa('id', {})).toEqual({
      omitida: false,
      error: false,
    });
    expect(generarAnalisis).toHaveBeenCalledWith(empresa, '', {});
    expect(CompanyDAO.guardarAnalisis).toHaveBeenCalledWith(
      empresa,
      { empresa: 'Prueba' },
      web,
      expect.any(Object),
    );
  });
  it('guarda error tras JSON inválido y no guarda un análisis completado', async () => {
    CompanyDAO.reclamar.mockResolvedValue({ _id: 'id' });
    obtenerTextoWeb.mockResolvedValue({ texto: '', estado: 'sin_web' });
    generarAnalisis.mockRejectedValue(
      new AppError(502, 'AI_INVALID_JSON', 'Formato inválido.'),
    );
    expect((await analizarEmpresa('id', {})).error).toBe(true);
    expect(CompanyDAO.marcarError).toHaveBeenCalledWith(
      'id',
      { code: 'AI_INVALID_JSON', message: 'Formato inválido.' },
      expect.any(Object),
    );
    expect(CompanyDAO.guardarAnalisis).not.toHaveBeenCalled();
  });
});
