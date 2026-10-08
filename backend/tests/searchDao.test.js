import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/models/Search.js', () => ({ Search: { updateMany: vi.fn() } }));
import { Search } from '../src/models/Search.js';
import { SearchDAO } from '../src/dao/SearchDAO.js';

describe('Recuperación de búsquedas al arrancar', () => {
  it('excluye jobs terminados y conserva sus contadores anteriores', async () => {
    await SearchDAO.recuperarInterrumpidas();
    const [filtro, update] = Search.updateMany.mock.calls[0];
    expect(filtro).toEqual({
      estado: { $in: ['en_cola', 'localizando', 'analizando'] },
    });
    expect(update.$set.estado).toBe('interrumpida');
    expect(update.$set.error.code).toBe('JOB_INTERRUPTED');
    expect(update.$set).not.toHaveProperty('procesadas');
  });
});
