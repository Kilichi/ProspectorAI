import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/dao/CompanyDAO.js', () => ({
  CompanyDAO: {
    obtener: vi.fn(),
    guardarBorradorGenerado: vi.fn(),
    guardarBorradorManual: vi.fn(),
  },
}));
vi.mock('../src/dao/SearchDAO.js', () => ({
  SearchDAO: { crear: vi.fn(), actualizar: vi.fn() },
}));
vi.mock('../src/ai/provider.js', () => ({ obtenerProveedor: vi.fn() }));
import {
  generarTextoEmail,
  guardarBorradorEmail,
  crearBorradorEmail,
} from '../src/services/emailDraftService.js';
import { CompanyDAO } from '../src/dao/CompanyDAO.js';
import { SearchDAO } from '../src/dao/SearchDAO.js';
import { obtenerProveedor } from '../src/ai/provider.js';
import { esperarJobs } from '../src/services/jobService.js';
import { env } from '../src/config/env.js';
import { crearMailto } from '../../frontend/src/utils/mailto.js';

const centroAnterior = {
  SCHOOL_NAME: env.SCHOOL_NAME,
  TEACHER_NAME: env.TEACHER_NAME,
  SCHOOL_EMAIL: env.SCHOOL_EMAIL,
  SCHOOL_PHONE: env.SCHOOL_PHONE,
};
const empresa = {
  _id: 'id',
  nombre: 'Empresa de prueba',
  perfil: 'daw',
  notaInterna: 'NO COMPARTIR',
  historialContacto: [{ nota: 'NO COMPARTIR' }],
  infoObtenida: { etiquetasOsm: { name: 'Empresa de prueba' } },
};
const borrador = {
  asunto: 'Propuesta de colaboración',
  cuerpo:
    'Hola: [NOMBRE DEL CENTRO] [NOMBRE DEL PROFESOR] [EMAIL DEL CENTRO] [TELÉFONO DEL CENTRO]',
};
afterEach(async () => {
  await esperarJobs();
  Object.assign(env, centroAnterior);
  vi.resetAllMocks();
});
describe('Borrador de correo sin envío', () => {
  it('conserva marcadores y no comparte notas internas', async () => {
    Object.assign(env, {
      SCHOOL_NAME: '',
      TEACHER_NAME: '',
      SCHOOL_EMAIL: '',
      SCHOOL_PHONE: '',
    });
    const provider = {
      generateJSON: vi.fn().mockResolvedValue(JSON.stringify(borrador)),
    };
    expect(await generarTextoEmail(empresa, {}, provider)).toEqual(borrador);
    expect(provider.generateJSON.mock.calls[0][1]).not.toContain(
      'NO COMPARTIR',
    );
  });
  it('corrige una vez si falta un marcador y rechaza JSON inválido tras dos intentos', async () => {
    Object.assign(env, {
      SCHOOL_NAME: '',
      TEACHER_NAME: '',
      SCHOOL_EMAIL: '',
      SCHOOL_PHONE: '',
    });
    const provider = { generateJSON: vi.fn().mockResolvedValue('{}') };
    await expect(
      generarTextoEmail(empresa, {}, provider),
    ).rejects.toMatchObject({ code: 'EMAIL_INVALID_JSON' });
    expect(provider.generateJSON).toHaveBeenCalledTimes(2);
    provider.generateJSON
      .mockReset()
      .mockResolvedValueOnce(
        JSON.stringify({ ...borrador, cuerpo: 'No incluye marcadores' }),
      )
      .mockResolvedValueOnce(JSON.stringify(borrador));
    expect(await generarTextoEmail(empresa, {}, provider)).toEqual(borrador);
  });
  it('no sustituye un borrador existente sin solicitud explícita', async () => {
    CompanyDAO.obtener.mockResolvedValue({
      ...empresa,
      borradorEmail: borrador,
    });
    await expect(crearBorradorEmail('id', {})).rejects.toMatchObject({
      code: 'DRAFT_EXISTS',
    });
    expect(obtenerProveedor).not.toHaveBeenCalled();
  });
  it('detecta edición concurrente durante la generación y conserva el borrador guardado', async () => {
    Object.assign(env, {
      SCHOOL_NAME: '',
      TEACHER_NAME: '',
      SCHOOL_EMAIL: '',
      SCHOOL_PHONE: '',
    });
    CompanyDAO.obtener.mockResolvedValue(empresa);
    SearchDAO.crear.mockResolvedValue({ _id: 'job' });
    obtenerProveedor.mockReturnValue({
      generateJSON: vi.fn().mockResolvedValue(JSON.stringify(borrador)),
    });
    CompanyDAO.guardarBorradorGenerado.mockResolvedValue(null);
    expect(await crearBorradorEmail('id', {})).toEqual({ searchId: 'job' });
    await esperarJobs();
    expect(SearchDAO.actualizar).toHaveBeenLastCalledWith(
      'job',
      expect.objectContaining({
        estado: 'error',
        error: expect.objectContaining({ code: 'DRAFT_CHANGED' }),
      }),
    );
  });
  it('guardar manualmente usa versión y devuelve conflicto sin sobrescribir', async () => {
    CompanyDAO.guardarBorradorManual.mockResolvedValue(null);
    CompanyDAO.obtener.mockResolvedValue(empresa);
    await expect(
      guardarBorradorEmail('id', { ...borrador, version: 2 }),
    ).rejects.toMatchObject({ code: 'DRAFT_CHANGED' });
  });
  it('mailto codifica asunto y cuerpo y bloquea inyección en destinatario', () => {
    const enlace = crearMailto(
      'docencia@example.org',
      'Prácticas & colaboración',
      'Hola\n¿Qué tal?',
    );
    expect(enlace).toContain('docencia%40example.org');
    expect(enlace).toContain(
      'subject=Pr%C3%A1cticas%20%26%20colaboraci%C3%B3n',
    );
    expect(enlace).toContain('%0A');
    expect(
      crearMailto('a@example.org?bcc=otro@example.org', 'Asunto', 'Cuerpo'),
    ).toBe(null);
  });
});
