import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    osmId: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    ubicacion: {
      direccion: String,
      lat: Number,
      lon: Number,
      location: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: { type: [Number], required: true },
      },
    },
    web: String,
    email: String,
    telefono: String,
    infoObtenida: {
      etiquetasOsm: { type: Map, of: String },
      resumenWeb: String,
      webEstado: String,
      webMotivo: String,
      webUrl: String,
      webConsultadaEn: Date,
    },
    analisis: {
      empresa: String,
      actividad: String,
      interesDAW: Boolean,
      puntuacion: Number,
      tecnologias: [String],
      posibleTeletrabajo: Boolean,
      confianza: String,
      motivo: String,
      fuentesUsadas: [String],
    },
    interesDAW: { type: Boolean, default: null },
    puntuacion: { type: Number, min: 0, max: 100, default: null },
    tecnologias: { type: [String], default: [] },
    posibleTeletrabajo: { type: Boolean, default: null },
    analisisError: { code: String, message: String },
    analizadoEn: Date,
    analisisProveedor: String,
    analisisModelo: String,
    // Los campos marcados conservan el valor docente ante nuevos análisis IA.
    edicionesManuales: { type: Map, of: Date, default: () => ({}) },
    notaInterna: { type: String, default: '' },
    historialContacto: [
      {
        estado: {
          type: String,
          enum: [
            'Pendiente',
            'Contactada',
            'Respondió',
            'Interesada',
            'Descartada',
          ],
        },
        fecha: Date,
        nota: String,
      },
    ],
    borradorEmail: {
      asunto: String,
      cuerpo: String,
      generadoEn: Date,
      editadoEn: Date,
      edicionManual: Boolean,
      originalIA: { asunto: String, cuerpo: String },
    },
    borradorVersion: { type: Number, default: 0 },
    analisisEstado: {
      type: String,
      enum: ['pendiente', 'analizando', 'completado', 'error'],
      default: 'pendiente',
    },
    estadoContacto: {
      type: String,
      enum: [
        'Pendiente',
        'Contactada',
        'Respondió',
        'Interesada',
        'Descartada',
      ],
      default: 'Pendiente',
    },
    perfil: { type: String, required: true },
    searchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Search' }],
  },
  { timestamps: true, bufferCommands: false },
);
companySchema.index({ 'ubicacion.location': '2dsphere' });
export const Company = mongoose.model('Company', companySchema);
