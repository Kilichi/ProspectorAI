import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/dao/SearchDAO.js', () => ({
  SearchDAO: { recuperarInterrumpidas: vi.fn() },
}));
vi.mock('../src/dao/CompanyDAO.js', () => ({
  CompanyDAO: { recuperarInterrumpidas: vi.fn() },
}));
import {
  programarJob,
  esperarJobs,
  recuperarJobs,
} from '../src/services/jobService.js';
import { SearchDAO } from '../src/dao/SearchDAO.js';
import { CompanyDAO } from '../src/dao/CompanyDAO.js';
import { env } from '../src/config/env.js';

describe('Ciclo de vida de jobs', () => {
  it('limita trabajos admitidos y libera capacidad al terminar', async () => {
    let liberar;
    const espera = new Promise((resolve) => {
      liberar = resolve;
    });
    const crear = vi.fn().mockResolvedValue({ _id: 'job-prueba' });
    const ejecutar = vi.fn(() => espera);
    try {
      for (let i = 0; i < env.MAX_PENDING_JOBS; i++)
        await programarJob(crear, ejecutar);
      await expect(programarJob(crear, ejecutar)).rejects.toMatchObject({
        code: 'JOB_QUEUE_FULL',
      });
      expect(crear).toHaveBeenCalledTimes(env.MAX_PENDING_JOBS);
    } finally {
      liberar();
      await esperarJobs();
    }
    expect(await programarJob(crear, ejecutar)).toEqual({
      searchId: 'job-prueba',
    });
    await esperarJobs();
  });
  it('libera la reserva si no se puede persistir el job', async () => {
    await expect(
      programarJob(async () => {
        throw new Error('simulado');
      }, vi.fn()),
    ).rejects.toThrow('simulado');
    await programarJob(
      async () => ({ _id: 'siguiente' }),
      async () => {},
    );
    await esperarJobs();
  });
  it('marca búsquedas interrumpidas y devuelve empresas en curso a pendientes', async () => {
    await recuperarJobs();
    expect(SearchDAO.recuperarInterrumpidas).toHaveBeenCalledTimes(1);
    expect(CompanyDAO.recuperarInterrumpidas).toHaveBeenCalledTimes(1);
  });
});
