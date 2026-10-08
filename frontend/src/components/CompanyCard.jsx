import Icon from './Icon.jsx';
import {
  textoInteres,
  textoRemoto,
  formatoDistancia,
} from '../utils/presentation.js';

export default function CompanyCard({ empresa, onOpen }) {
  const distancia = formatoDistancia(empresa.distanciaKm);
  const manual = Object.keys(empresa.edicionesManuales || {}).length > 0;
  return (
    <article className="company-card">
      <div className="card-top">
        <span className="company-avatar">
          {empresa.nombre.slice(0, 2).toUpperCase()}
        </span>
        <span
          className={`status-pill ${empresa.analisisEstado === 'completado' ? 'status-done' : ''}`}
        >
          {empresa.analisisEstado === 'completado'
            ? 'Analizada'
            : empresa.analisisEstado === 'error'
              ? 'Error de análisis'
              : empresa.analisisEstado === 'analizando'
                ? 'Analizando'
                : 'Pendiente de análisis'}
        </span>
      </div>
      <h2>
        <button className="text-button" onClick={() => onOpen(empresa._id)}>
          {empresa.nombre}
        </button>
      </h2>
      <p className="card-address">
        <Icon name="pin" size={15} />
        <span>
          {empresa.ubicacion?.direccion || 'Dirección no disponible'}
          {distancia && <strong> · {distancia}</strong>}
        </span>
      </p>
      <p className="card-activity">
        {empresa.analisis?.actividad &&
        empresa.analisis.actividad !== 'desconocido'
          ? empresa.analisis.actividad
          : 'Actividad pendiente de contrastar con evidencia.'}
      </p>
      <div className="chips">
        {(empresa.tecnologias || []).slice(0, 4).map((tecnologia) => (
          <span className="chip" key={tecnologia}>
            {tecnologia}
          </span>
        ))}
        {empresa.tecnologias?.length > 4 && (
          <span className="chip">+{empresa.tecnologias.length - 4}</span>
        )}
        {!empresa.tecnologias?.length && (
          <span className="empty-chip">Sin tecnologías identificadas</span>
        )}
      </div>
      <div className="card-evaluation">
        <span
          className={`interest ${empresa.interesDAW === true ? 'positive' : ''}`}
        >
          {textoInteres(empresa.interesDAW)}
        </span>
        <span className="score">
          {empresa.puntuacion ?? '—'}
          <small> / 100</small>
        </span>
      </div>
      <div className="card-badges">
        <span>
          <Icon name="globe" size={14} />
          {textoRemoto(empresa.posibleTeletrabajo)}
        </span>
        <span>Confianza {empresa.analisis?.confianza || 'sin valorar'}</span>
        {manual && <span className="manual-label">Edición docente</span>}
      </div>
      <div className="card-bottom">
        <span>
          <span className="dot muted-dot" />
          {empresa.estadoContacto}
        </span>
        <button
          className="text-button open-detail"
          onClick={() => onOpen(empresa._id)}
        >
          Ver detalle <Icon name="arrow" size={17} />
        </button>
      </div>
    </article>
  );
}
