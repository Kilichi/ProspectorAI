import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/models/Company.js', () => ({
  Company: {
    bulkWrite: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn(),
  },
}));
import { Company } from '../src/models/Company.js';
import { CompanyDAO } from '../src/dao/CompanyDAO.js';

describe('CompanyDAO con modelo simulado', () => {
  beforeEach(() => vi.clearAllMocks());
  it('hace upsert por osmId, usa GeoJSON lon/lat y conserva datos existentes', async () => {
    const empresa = {
      osmId: 'node/1',
      nombre: 'Prueba',
      direccion: 'Villena',
      lat: 38.635,
      lon: -0.866,
      etiquetasOsm: { name: 'Prueba' },
    };
    await CompanyDAO.guardarCandidatas(
      [empresa],
      '0123456789abcdef01234567',
      'daw',
    );
    const operacion = Company.bulkWrite.mock.calls[0][0][0].updateOne;
    expect(operacion.filter).toEqual({ osmId: 'node/1' });
    expect(operacion.upsert).toBe(true);
    expect(operacion.update.$setOnInsert.ubicacion.location).toEqual({
      type: 'Point',
      coordinates: [-0.866, 38.635],
    });
    expect(operacion.update.$addToSet).toEqual({
      searchIds: '0123456789abcdef01234567',
    });
    expect(operacion.update).not.toHaveProperty('$set');
  });
  it('no realiza escrituras para un resultado vacío', async () => {
    await CompanyDAO.guardarCandidatas([], 'id', 'daw');
    expect(Company.bulkWrite).not.toHaveBeenCalled();
  });
  it('comprueba los marcadores manuales al escribir y no pisa esos campos', async () => {
    Company.findByIdAndUpdate.mockReturnValue({ lean: vi.fn() });
    const analisis = {
      interesDAW: true,
      puntuacion: 80,
      tecnologias: ['JavaScript'],
      posibleTeletrabajo: null,
    };
    await CompanyDAO.guardarAnalisis(
      { _id: 'id' },
      analisis,
      { texto: '', estado: 'sin_web', motivo: 'WEB_NOT_PROVIDED', url: null },
      { proveedor: 'groq', modelo: 'modelo-prueba' },
    );
    const operaciones = Company.bulkWrite.mock.calls[0][0];
    expect(operaciones).toHaveLength(4);
    expect(operaciones[0].updateOne.filter).toEqual({
      _id: 'id',
      'edicionesManuales.interesDAW': { $exists: false },
    });
    const cambios = Company.findByIdAndUpdate.mock.calls[0][1].$set;
    expect(cambios).toMatchObject({ analisisEstado: 'completado', analisis });
    expect(cambios).not.toHaveProperty('interesDAW');
  });
  it('reclamación normal excluye completadas, reanálisis explícito las permite', async () => {
    Company.findOneAndUpdate.mockReturnValue({ lean: vi.fn() });
    await CompanyDAO.reclamar('id');
    expect(
      Company.findOneAndUpdate.mock.calls[0][0].analisisEstado.$in,
    ).toEqual(['pendiente', 'error']);
    await CompanyDAO.reclamar('id', true);
    expect(
      Company.findOneAndUpdate.mock.calls[1][0].analisisEstado.$in,
    ).toContain('completado');
  });
  it('recupera únicamente empresas que quedaron analizando', async () => {
    await CompanyDAO.recuperarInterrumpidas();
    expect(Company.updateMany).toHaveBeenCalledWith(
      { analisisEstado: 'analizando' },
      { $set: { analisisEstado: 'pendiente' } },
    );
  });
  it('marca únicamente los campos editados, en la misma escritura', async () => {
    Company.findByIdAndUpdate.mockReturnValue({ lean: vi.fn() });
    await CompanyDAO.editar('id', { puntuacion: 75, notaInterna: 'Revisada' });
    expect(Company.findByIdAndUpdate.mock.calls[0][1].$set).toEqual({
      puntuacion: 75,
      notaInterna: 'Revisada',
      'edicionesManuales.puntuacion': expect.any(Date),
      'edicionesManuales.notaInterna': expect.any(Date),
    });
  });
});
