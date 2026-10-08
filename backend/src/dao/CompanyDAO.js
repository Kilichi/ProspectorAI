import { Company } from '../models/Company.js';
import mongoose from 'mongoose';
import { construirFiltroEmpresas } from '../utils/companyFilters.js';

export const CompanyDAO = {
  async guardarCandidatas(empresas, searchId, perfil) {
    if (!empresas.length) return;
    await Company.bulkWrite(
      empresas.map((empresa) => ({
        updateOne: {
          filter: { osmId: empresa.osmId },
          // Un hallazgo posterior solo añade la búsqueda: conserva análisis y ediciones.
          update: {
            $setOnInsert: {
              osmId: empresa.osmId,
              nombre: empresa.nombre,
              ubicacion: {
                direccion: empresa.direccion,
                lat: empresa.lat,
                lon: empresa.lon,
                location: {
                  type: 'Point',
                  coordinates: [empresa.lon, empresa.lat],
                },
              },
              web: empresa.web,
              email: empresa.email,
              telefono: empresa.telefono,
              infoObtenida: { etiquetasOsm: empresa.etiquetasOsm },
              perfil,
              analisisEstado: 'pendiente',
              estadoContacto: 'Pendiente',
            },
            $addToSet: { searchIds: searchId },
          },
          upsert: true,
        },
      })),
    );
  },
  async listar(parametros, centro) {
    const { pagina, limite, orden = 'nombre', direccion = 'asc' } = parametros;
    const filtro = construirFiltroEmpresas(parametros);
    const sentido = direccion === 'desc' ? -1 : 1;
    let consulta;
    if (orden === 'distancia') {
      // Las agregaciones no convierten ObjectId automáticamente como find().
      if (filtro.searchIds)
        filtro.searchIds = new mongoose.Types.ObjectId(filtro.searchIds);
      consulta = Company.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [centro.lon, centro.lat] },
            key: 'ubicacion.location',
            spherical: true,
            distanceField: 'distanciaKm',
            distanceMultiplier: 0.001,
            query: filtro,
          },
        },
        { $sort: { distanciaKm: sentido, _id: 1 } },
        { $skip: (pagina - 1) * limite },
        { $limit: limite },
      ]);
    } else
      consulta = Company.find(filtro)
        .sort({ [orden]: sentido, _id: 1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .lean();
    const [empresas, total] = await Promise.all([
      consulta,
      Company.countDocuments(filtro),
    ]);
    return { empresas, total, pagina, limite };
  },
  obtener(id) {
    return Company.findById(id).lean();
  },
  editar(id, cambios) {
    const actualizacion = { ...cambios };
    for (const campo of Object.keys(cambios))
      actualizacion[`edicionesManuales.${campo}`] = new Date();
    return Company.findByIdAndUpdate(
      id,
      { $set: actualizacion },
      { new: true, runValidators: true },
    ).lean();
  },
  guardarBorradorGenerado(id, borrador, version) {
    const filtro = {
      _id: id,
      ...(version === 0
        ? {
            $or: [
              { borradorVersion: 0 },
              { borradorVersion: { $exists: false } },
            ],
          }
        : { borradorVersion: version }),
    };
    return Company.findOneAndUpdate(
      filtro,
      {
        $set: {
          borradorEmail: {
            ...borrador,
            originalIA: borrador,
            generadoEn: new Date(),
            edicionManual: false,
          },
        },
        $inc: { borradorVersion: 1 },
      },
      { new: true, runValidators: true },
    ).lean();
  },
  guardarBorradorManual(id, borrador, version) {
    return Company.findOneAndUpdate(
      {
        _id: id,
        borradorVersion: version,
        'borradorEmail.asunto': { $exists: true },
      },
      {
        $set: {
          'borradorEmail.asunto': borrador.asunto,
          'borradorEmail.cuerpo': borrador.cuerpo,
          'borradorEmail.editadoEn': new Date(),
          'borradorEmail.edicionManual': true,
        },
        $inc: { borradorVersion: 1 },
      },
      { new: true, runValidators: true },
    ).lean();
  },
  cambiarEstadoContacto(id, { estado, nota }) {
    return Company.findByIdAndUpdate(
      id,
      {
        $set: { estadoContacto: estado },
        $push: {
          historialContacto: { estado, fecha: new Date(), nota: nota || '' },
        },
      },
      { new: true, runValidators: true },
    ).lean();
  },
  async estadisticas(searchId) {
    const resultado = await Company.aggregate([
      ...(searchId
        ? [{ $match: { searchIds: new mongoose.Types.ObjectId(searchId) } }]
        : []),
      {
        $facet: {
          total: [{ $count: 'valor' }],
          porEstadoContacto: [
            { $group: { _id: '$estadoContacto', total: { $sum: 1 } } },
          ],
          porInteres: [
            {
              $group: {
                _id: { $ifNull: ['$interesDAW', null] },
                total: { $sum: 1 },
              },
            },
          ],
          porAnalisis: [
            { $group: { _id: '$analisisEstado', total: { $sum: 1 } } },
          ],
          tecnologias: [
            { $unwind: '$tecnologias' },
            {
              $group: {
                _id: {
                  empresa: '$_id',
                  tecnologia: {
                    $toLower: { $trim: { input: '$tecnologias' } },
                  },
                },
              },
            },
            { $group: { _id: '$_id.tecnologia', total: { $sum: 1 } } },
            { $sort: { total: -1, _id: 1 } },
            { $limit: 10 },
          ],
        },
      },
    ]);
    const datos = resultado[0];
    return {
      total: datos.total[0]?.valor || 0,
      porEstadoContacto: datos.porEstadoContacto.map(({ _id, total }) => ({
        estado: _id,
        total,
      })),
      porInteres: datos.porInteres.map(({ _id, total }) => ({
        interes: _id,
        total,
      })),
      porAnalisis: datos.porAnalisis.map(({ _id, total }) => ({
        estado: _id,
        total,
      })),
      tecnologias: datos.tecnologias.map(({ _id, total }) => ({
        tecnologia: _id,
        total,
      })),
    };
  },
  async seleccionarParaAnalisis(searchId, limite) {
    const filtro = {
      searchIds: searchId,
      analisisEstado: { $in: ['pendiente', 'error'] },
    };
    const [empresas, pendientes, completadas] = await Promise.all([
      // Priorizar pendientes evita que errores persistentes bloqueen lotes siguientes.
      Company.find(filtro)
        .sort({ analisisEstado: -1, _id: 1 })
        .limit(limite)
        .lean(),
      Company.countDocuments(filtro),
      Company.countDocuments({
        searchIds: searchId,
        analisisEstado: 'completado',
      }),
    ]);
    return { empresas, pendientes, completadas };
  },
  reclamar(id, reanalizar = false) {
    const estados = reanalizar
      ? ['pendiente', 'error', 'completado']
      : ['pendiente', 'error'];
    return Company.findOneAndUpdate(
      { _id: id, analisisEstado: { $in: estados } },
      { $set: { analisisEstado: 'analizando' }, $unset: { analisisError: 1 } },
      { new: true },
    ).lean();
  },
  async guardarAnalisis(empresa, analisis, web, { proveedor, modelo }) {
    const cambios = {
      analisis,
      analisisEstado: 'completado',
      analizadoEn: new Date(),
      analisisProveedor: proveedor,
      analisisModelo: modelo,
      'infoObtenida.resumenWeb': web.texto,
      'infoObtenida.webEstado': web.estado,
      'infoObtenida.webMotivo': web.motivo,
      'infoObtenida.webUrl': web.url,
      'infoObtenida.webConsultadaEn': new Date(),
    };
    await Company.bulkWrite(
      ['interesDAW', 'puntuacion', 'tecnologias', 'posibleTeletrabajo'].map(
        (campo) => ({
          updateOne: {
            // Comprobar en MongoDB, no solo en la instantánea anterior a la llamada IA.
            filter: {
              _id: empresa._id,
              [`edicionesManuales.${campo}`]: { $exists: false },
            },
            update: { $set: { [campo]: analisis[campo] } },
          },
        }),
      ),
    );
    return Company.findByIdAndUpdate(
      empresa._id,
      { $set: cambios, $unset: { analisisError: 1 } },
      { new: true, runValidators: true },
    ).lean();
  },
  marcarError(id, error, web) {
    const cambios = { analisisEstado: 'error', analisisError: error };
    if (web)
      Object.assign(cambios, {
        'infoObtenida.resumenWeb': web.texto,
        'infoObtenida.webEstado': web.estado,
        'infoObtenida.webMotivo': web.motivo,
        'infoObtenida.webUrl': web.url,
        'infoObtenida.webConsultadaEn': new Date(),
      });
    return Company.findByIdAndUpdate(
      id,
      { $set: cambios },
      { runValidators: true },
    ).lean();
  },
  recuperarInterrumpidas() {
    return Company.updateMany(
      { analisisEstado: 'analizando' },
      { $set: { analisisEstado: 'pendiente' } },
    );
  },
};
