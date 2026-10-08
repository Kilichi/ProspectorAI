import mongoose from 'mongoose';

const searchSchema = new mongoose.Schema(
  {
    parametros: {
      localidad: String,
      lat: Number,
      lon: Number,
      radioKm: Number,
      perfil: String,
    },
    centro: { lat: Number, lon: Number, nombre: String },
    estado: {
      type: String,
      enum: [
        'en_cola',
        'localizando',
        'analizando',
        'completada',
        'error',
        'interrumpida',
      ],
      default: 'en_cola',
    },
    total: { type: Number, default: 0 },
    procesadas: { type: Number, default: 0 },
    errores: { type: Number, default: 0 },
    totalCandidatas: { type: Number, default: 0 },
    omitidasCompletadas: { type: Number, default: 0 },
    pendientesFueraLote: { type: Number, default: 0 },
    empresaActual: String,
    tipo: {
      type: String,
      enum: ['busqueda', 'reanalisis', 'email'],
      default: 'busqueda',
    },
    empresaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' }],
    analizar: { type: Boolean, default: true },
    orquestador: { type: String, enum: ['backend', 'n8n'], default: 'backend' },
    atendidasIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' }],
    error: { code: String, message: String },
    finalizadaEn: Date,
  },
  { timestamps: true, bufferCommands: false },
);
export const Search = mongoose.model('Search', searchSchema);
