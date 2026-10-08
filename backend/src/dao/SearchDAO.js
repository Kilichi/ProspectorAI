import { Search } from '../models/Search.js';

export const SearchDAO = {
  crear(parametros, opciones = {}) {
    return Search.create({ parametros, ...opciones });
  },
  actualizar(id, cambios) {
    return Search.findByIdAndUpdate(
      id,
      { $set: cambios },
      { new: true, runValidators: true },
    ).lean();
  },
  obtener(id) {
    return Search.findById(id).lean();
  },
  reclamarPreparacion(id) {
    return Search.findOneAndUpdate(
      { _id: id, estado: 'en_cola', orquestador: 'n8n' },
      { $set: { estado: 'localizando' } },
      { new: true },
    ).lean();
  },
  registrarAnalizada(id, empresaId, error) {
    return Search.findOneAndUpdate(
      {
        _id: id,
        estado: 'analizando',
        empresaIds: empresaId,
        atendidasIds: { $ne: empresaId },
      },
      {
        $addToSet: { atendidasIds: empresaId },
        $inc: { procesadas: 1, errores: error ? 1 : 0 },
      },
      { new: true },
    ).lean();
  },
  recuperarInterrumpidas() {
    return Search.updateMany(
      { estado: { $in: ['en_cola', 'localizando', 'analizando'] } },
      {
        $set: {
          estado: 'interrumpida',
          finalizadaEn: new Date(),
          error: {
            code: 'JOB_INTERRUPTED',
            message:
              'El servidor se reinició durante la operación. Repite la búsqueda o solicita el reanálisis.',
          },
        },
      },
    );
  },
};
