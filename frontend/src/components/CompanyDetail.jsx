import { useEffect, useRef, useState } from 'react';
import {
  obtenerEmpresa,
  editarEmpresa,
  reanalizarEmpresa,
} from '../api/client.js';
import { useRecurso } from '../hooks/useRecurso.js';
import { textoRemoto, urlWebSegura } from '../utils/presentation.js';
import Icon from './Icon.jsx';
import Notice from './Notice.jsx';
import ContactPanel from './ContactPanel.jsx';

function DetailForm({ empresa, onSaved, onJob }) {
  const [guardando, setGuardando] = useState(false);
  const [reanalizando, setReanalizando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [manuales, setManuales] = useState(empresa.edicionesManuales || {});
  const [valores, setValores] = useState({
    tecnologias: (empresa.tecnologias || []).join(', '),
    notaInterna: empresa.notaInterna || '',
    interesDAW:
      empresa.interesDAW === true
        ? 'true'
        : empresa.interesDAW === false
          ? 'false'
          : 'desconocido',
    puntuacion: empresa.puntuacion ?? '',
  });
  const inicial = useRef(valores);
  function cambiar(event) {
    setValores({ ...valores, [event.target.name]: event.target.value });
    setMensaje('');
  }
  async function guardar(event) {
    event.preventDefault();
    setError('');
    setMensaje('');
    const cambios = {};
    for (const campo of Object.keys(valores)) {
      if (String(valores[campo]) === String(inicial.current[campo])) continue;
      cambios[campo] =
        campo === 'tecnologias'
          ? valores[campo]
              .split(',')
              .map((valor) => valor.trim())
              .filter(Boolean)
          : campo === 'puntuacion'
            ? valores[campo] === ''
              ? null
              : Number(valores[campo])
            : campo === 'interesDAW'
              ? valores[campo] === 'desconocido'
                ? null
                : valores[campo] === 'true'
              : valores[campo];
    }
    if (!Object.keys(cambios).length) {
      setMensaje('No hay cambios que guardar.');
      return;
    }
    setGuardando(true);
    try {
      const guardada = await editarEmpresa(empresa._id, cambios);
      inicial.current = { ...valores };
      setManuales(guardada.edicionesManuales || {});
      setMensaje(
        'Cambios guardados. Tu valoración se conservará ante nuevos análisis.',
      );
      onSaved();
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setGuardando(false);
    }
  }
  async function reanalizar() {
    setReanalizando(true);
    setError('');
    try {
      onJob((await reanalizarEmpresa(empresa._id)).searchId);
    } catch (fallo) {
      setError(fallo.message);
      setReanalizando(false);
    }
  }
  const web = urlWebSegura(empresa.web);
  return (
    <>
      <div className="detail-heading">
        <span className="company-avatar large-avatar">
          {empresa.nombre.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <div className="eyebrow">
            {empresa.perfil.toUpperCase()} · {empresa.analisisEstado}
          </div>
          <h2>{empresa.nombre}</h2>
          <p className="muted">
            {empresa.ubicacion?.direccion || 'Dirección no disponible'}
          </p>
        </div>
      </div>
      <div className="detail-links">
        {web && (
          <a href={web} target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={16} />
            Web de la empresa
          </a>
        )}
        <span>{empresa.email || 'Email no disponible'}</span>
        <span>{empresa.telefono || 'Teléfono no disponible'}</span>
      </div>
      <section className="detail-section">
        <h3>Lo que sabemos</h3>
        <p>
          {empresa.analisis?.actividad || 'Actividad todavía sin analizar.'}
        </p>
        <p className="muted">
          {empresa.analisis?.motivo ||
            'La IA aún no ha contrastado esta candidata.'}
        </p>
        <div className="chips">
          <span className="chip">
            Confianza {empresa.analisis?.confianza || 'sin valorar'}
          </span>
          <span className="chip">
            {textoRemoto(empresa.posibleTeletrabajo)}
          </span>
          {(empresa.analisis?.fuentesUsadas || []).map((fuente) => (
            <span className="chip" key={fuente}>
              Fuente: {fuente.toUpperCase()}
            </span>
          ))}
        </div>
        {empresa.analisisError && (
          <Notice error>{empresa.analisisError.message}</Notice>
        )}
        {empresa.infoObtenida?.webMotivo && (
          <p className="small muted">
            La web no aportó texto utilizable ({empresa.infoObtenida.webMotivo}
            ). El análisis puede basarse únicamente en OSM.
          </p>
        )}
        {empresa.infoObtenida?.resumenWeb && (
          <details className="evidence">
            <summary>Consultar texto de la página principal</summary>
            <p>{empresa.infoObtenida.resumenWeb}</p>
          </details>
        )}
        <a
          className="source-link"
          href={`https://www.openstreetmap.org/${empresa.osmId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver registro original en OpenStreetMap{' '}
          <Icon name="external" size={14} />
        </a>
      </section>
      <form className="detail-section" onSubmit={guardar}>
        <h3>Tu valoración docente</h3>
        <p className="small muted">
          Los campos modificados se marcan como edición manual. La valoración
          original de IA se conserva por separado.
        </p>
        <fieldset disabled={guardando || reanalizando}>
          <div className="form-grid">
            <label>
              Interés para DAW{' '}
              {manuales.interesDAW && (
                <small className="manual-label">Edición docente</small>
              )}
              <select
                name="interesDAW"
                value={valores.interesDAW}
                onChange={cambiar}
              >
                <option value="desconocido">Por determinar</option>
                <option value="true">Con interés</option>
                <option value="false">Interés bajo</option>
              </select>
            </label>
            <label>
              Puntuación / 100{' '}
              {manuales.puntuacion && (
                <small className="manual-label">Edición docente</small>
              )}
              <input
                name="puntuacion"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="Sin valorar"
                value={valores.puntuacion}
                onChange={cambiar}
              />
            </label>
          </div>
          <label>
            Tecnologías{' '}
            {manuales.tecnologias && (
              <small className="manual-label">Edición docente</small>
            )}
            <input
              name="tecnologias"
              value={valores.tecnologias}
              onChange={cambiar}
              maxLength={3000}
              placeholder="JavaScript, PHP, React…"
            />
            <small>
              Separadas por comas. Añade únicamente las que hayas contrastado.
            </small>
          </label>
          <label>
            Nota interna{' '}
            {manuales.notaInterna && (
              <small className="manual-label">Edición docente</small>
            )}
            <textarea
              name="notaInterna"
              rows="4"
              maxLength={5000}
              placeholder="Observaciones para el equipo docente…"
              value={valores.notaInterna}
              onChange={cambiar}
            />
            <small>La nota no se comparte con la IA.</small>
          </label>
        </fieldset>
        {error && <Notice error>{error}</Notice>}
        {mensaje && (
          <p className="save-message" role="status">
            <Icon name="check" size={16} />
            {mensaje}
          </p>
        )}
        <button className="button full" disabled={guardando || reanalizando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
          <Icon name="check" size={18} />
        </button>
      </form>
      <section className="detail-section reanalyze-section">
        <h3>Actualizar el análisis IA</h3>
        <p className="small muted">
          Solo se vuelve a analizar por solicitud explícita. Se consulta la
          página principal actual y se conservan tus ediciones guardadas.
        </p>
        {confirmar ? (
          <>
            <Notice>
              Guarda antes los cambios del formulario que quieras conservar.
              ¿Quieres consumir una nueva operación de IA para esta empresa?
            </Notice>
            <div className="actions">
              <button
                className="button"
                onClick={reanalizar}
                disabled={reanalizando || guardando}
              >
                {reanalizando ? 'Creando trabajo…' : 'Confirmar reanálisis'}
              </button>
              <button
                className="button secondary"
                onClick={() => setConfirmar(false)}
                disabled={reanalizando}
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <button
            className="button secondary"
            onClick={() => setConfirmar(true)}
            disabled={empresa.analisisEstado === 'analizando' || guardando}
          >
            <Icon name="refresh" size={17} />
            Solicitar reanálisis
          </button>
        )}
      </section>
    </>
  );
}

export default function CompanyDetail({ id, onClose, onSaved, onJob }) {
  const dialogo = useRef(null);
  const [revision, setRevision] = useState(0);
  const [pestana, setPestana] = useState('ficha');
  const { data, loading, error } = useRecurso(obtenerEmpresa, id, revision);
  useEffect(() => {
    const elemento = dialogo.current;
    const previo = document.activeElement;
    elemento.showModal();
    return () => {
      elemento.close();
      previo?.focus();
    };
  }, []);
  return (
    <dialog
      className="detail-dialog"
      ref={dialogo}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label="Detalle y edición de empresa"
    >
      <div className="detail-topbar">
        <span>FICHA DE EMPRESA</span>
        <button
          className="icon-button"
          autoFocus
          aria-label="Cerrar detalle"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="detail-content">
        <div className="segmented detail-tabs">
          <button
            className={pestana === 'ficha' ? 'active' : ''}
            aria-pressed={pestana === 'ficha'}
            onClick={() => setPestana('ficha')}
          >
            Valoración y evidencia
          </button>
          <button
            className={pestana === 'contacto' ? 'active' : ''}
            aria-pressed={pestana === 'contacto'}
            onClick={() => setPestana('contacto')}
          >
            Contacto
          </button>
        </div>
        {loading ? (
          <p role="status">Cargando ficha…</p>
        ) : error ? (
          <>
            <Notice error>{error}</Notice>
            <button
              className="button secondary"
              onClick={() => setRevision((valor) => valor + 1)}
            >
              Reintentar
            </button>
          </>
        ) : (
          data && (
            <>
              <div hidden={pestana !== 'ficha'}>
                <DetailForm
                  key={data._id}
                  empresa={data}
                  onSaved={onSaved}
                  onJob={onJob}
                />
              </div>
              <div hidden={pestana !== 'contacto'}>
                <ContactPanel empresa={data} onSaved={onSaved} />
              </div>
            </>
          )
        )}
      </div>
    </dialog>
  );
}
