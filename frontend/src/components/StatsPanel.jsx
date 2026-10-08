import { useState } from 'react';
import { useRecurso } from '../hooks/useRecurso.js';
import { obtenerEstadisticas } from '../api/client.js';
import Notice from './Notice.jsx';

export default function StatsPanel({ searchId, revision }) {
  const [intento, setIntento] = useState(0);
  const { data, loading, error } = useRecurso(
    obtenerEstadisticas,
    JSON.stringify(searchId ? { searchId } : {}),
    `${revision}:${intento}`,
  );
  if (loading)
    return (
      <p className="small muted" role="status">
        Cargando resumen…
      </p>
    );
  if (error)
    return (
      <Notice error>
        {error}{' '}
        <button
          className="text-button"
          onClick={() => setIntento((valor) => valor + 1)}
        >
          Reintentar resumen
        </button>
      </Notice>
    );
  const interes = (valor) =>
    data.porInteres.find((fila) => fila.interes === valor)?.total || 0;
  return (
    <section className="stats-panel" aria-label="Resumen de prospección">
      <div className="stats-grid">
        <div>
          <span>Total guardadas</span>
          <strong>{data.total}</strong>
        </div>
        <div>
          <span>Con interés DAW</span>
          <strong>{interes(true)}</strong>
        </div>
        <div>
          <span>Interés por determinar</span>
          <strong>{interes(null)}</strong>
        </div>
        <div>
          <span>Interés bajo</span>
          <strong>{interes(false)}</strong>
        </div>
      </div>
      <details className="stats-details">
        <summary>Estados de contacto y tecnologías más frecuentes</summary>
        <div className="stats-breakdown">
          <div>
            <h3>Seguimiento</h3>
            {[
              'Pendiente',
              'Contactada',
              'Respondió',
              'Interesada',
              'Descartada',
            ].map((estado) => (
              <div className="stat-row" key={estado}>
                <span>{estado}</span>
                <strong>
                  {data.porEstadoContacto.find((fila) => fila.estado === estado)
                    ?.total || 0}
                </strong>
              </div>
            ))}
          </div>
          <div>
            <h3>Tecnologías</h3>
            {!data.tecnologias.length ? (
              <p className="small muted">
                Todavía no hay tecnologías identificadas.
              </p>
            ) : (
              data.tecnologias.map((fila) => (
                <div className="stat-row" key={fila.tecnologia}>
                  <span>{fila.tecnologia}</span>
                  <strong>{fila.total}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </details>
      <p className="stats-scope">
        Resumen de {searchId ? 'esta búsqueda' : 'todas las empresas guardadas'}
        ; los filtros del listado no se aplican al resumen.
      </p>
    </section>
  );
}
