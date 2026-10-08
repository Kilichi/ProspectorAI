import { useState } from 'react';
import { useJob, jobTerminado } from '../hooks/useJob.js';
import Icon from '../components/Icon.jsx';
import Notice from '../components/Notice.jsx';

const estados = {
  en_cola: 'Tu búsqueda está en cola',
  localizando: 'Explorando empresas candidatas',
  analizando: 'Contrastando la evidencia',
  completada: 'La prospección está lista',
  error: 'La búsqueda necesita atención',
  interrumpida: 'La búsqueda se interrumpió',
};
export default function Progress({ id, onResults, onNew }) {
  const [intento, setIntento] = useState(0);
  const { data: job, error } = useJob(id, intento);
  const final = jobTerminado(job?.estado);
  const porcentaje =
    job?.estado === 'completada'
      ? 100
      : job?.total > 0
        ? Math.round((job.procesadas / job.total) * 100)
        : 0;
  return (
    <div className="page-narrow progress-page">
      <div className="eyebrow">PROSPECCIÓN / PASOS 02 Y 03</div>
      <div className={`progress-icon ${!final && !error ? 'pulsing' : ''}`}>
        <Icon
          name={job?.estado === 'completada' ? 'check' : 'spark'}
          size={36}
        />
      </div>
      <h1>{job ? estados[job.estado] : 'Consultando la búsqueda…'}</h1>
      <p className="lead">
        {job?.centro?.nombre ||
          job?.parametros?.localidad ||
          'La investigación se guarda en tu centro.'}
      </p>
      <section className="panel progress-panel" aria-live="polite">
        {error ? (
          <>
            <Notice error>{error}</Notice>
            <button
              className="button secondary"
              onClick={() => setIntento((valor) => valor + 1)}
            >
              Reintentar consulta
            </button>
          </>
        ) : !job ? (
          <p className="muted">Recuperando el estado del trabajo…</p>
        ) : (
          <>
            <div className="row-between">
              <strong>
                {job.estado === 'analizando'
                  ? `Analizando ${Math.min(job.procesadas + 1, job.total)} de ${job.total}…`
                  : job.estado === 'completada'
                    ? 'Proceso finalizado'
                    : 'Preparando la selección…'}
              </strong>
              <span>{porcentaje}%</span>
            </div>
            <progress
              max="100"
              value={porcentaje}
              aria-label="Progreso de la búsqueda"
            />
            <p className="muted">
              {job.empresaActual ||
                (job.estado === 'en_cola'
                  ? 'Esperando a que termine el trabajo anterior.'
                  : 'Las empresas completadas se conservan y no vuelven a analizarse.')}
            </p>
            <div className="progress-counts">
              <div>
                <strong>{job.totalCandidatas}</strong>
                <span>Candidatas</span>
              </div>
              <div>
                <strong>
                  {job.procesadas} / {job.total}
                </strong>
                <span>Procesadas / lote</span>
              </div>
              <div>
                <strong>{job.errores}</strong>
                <span>Errores de análisis</span>
              </div>
            </div>
            {job.error && <Notice error>{job.error.message}</Notice>}
            {job.pendientesFueraLote > 0 && (
              <Notice>
                {job.pendientesFueraLote} candidatas quedan fuera del límite de
                este lote. Repite la búsqueda para continuar con las pendientes.
              </Notice>
            )}
            {job.omitidasCompletadas > 0 && (
              <p className="muted">
                {job.omitidasCompletadas} empresas ya completadas se han
                conservado.
              </p>
            )}
            {job.estado === 'completada' && job.analizar === false && (
              <Notice>
                Se ha realizado solo la localización. Las candidatas nuevas
                quedan pendientes de análisis.
              </Notice>
            )}
            {final && (
              <div className="actions">
                <button className="button" onClick={() => onResults(job)}>
                  Ver resultados <Icon name="arrow" />
                </button>
                <button className="button secondary" onClick={onNew}>
                  Nueva búsqueda
                </button>
              </div>
            )}
          </>
        )}
      </section>
      <p className="small muted">
        Puedes consultar las empresas guardadas mientras continúa el trabajo.
        Cerrar esta pantalla no cancela la búsqueda.
      </p>
      <p className="job-reference">Referencia: {id}</p>
    </div>
  );
}
