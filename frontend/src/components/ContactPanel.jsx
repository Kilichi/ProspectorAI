import { useState } from 'react';
import {
  cambiarContacto,
  generarBorrador,
  guardarBorrador,
  obtenerEmpresa,
} from '../api/client.js';
import { useJob, jobTerminado } from '../hooks/useJob.js';
import { crearMailto } from '../utils/mailto.js';
import Notice from './Notice.jsx';
import Icon from './Icon.jsx';

export default function ContactPanel({ empresa, onSaved }) {
  const [actual, setActual] = useState(empresa);
  const [asunto, setAsunto] = useState(empresa.borradorEmail?.asunto || '');
  const [cuerpo, setCuerpo] = useState(empresa.borradorEmail?.cuerpo || '');
  const [destinatario, setDestinatario] = useState(empresa.email || '');
  const [ocupada, setOcupada] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [jobId, setJobId] = useState(null);
  const [intento, setIntento] = useState(0);
  const [regenerar, setRegenerar] = useState(false);
  const [estado, setEstado] = useState(empresa.estadoContacto);
  const [nota, setNota] = useState('');
  const { data: job, error: errorJob } = useJob(jobId, intento);
  const generando = Boolean(jobId) && !jobTerminado(job?.estado);
  const mailto = crearMailto(destinatario, asunto, cuerpo);
  async function ejecutar(operacion) {
    setOcupada(true);
    setError('');
    setMensaje('');
    try {
      await operacion();
    } catch (fallo) {
      setError(
        fallo.name === 'TypeError'
          ? 'No se ha podido conectar con el servidor.'
          : fallo.message,
      );
    } finally {
      setOcupada(false);
    }
  }
  async function solicitar(event) {
    event.preventDefault();
    const datos = Object.fromEntries(new FormData(event.currentTarget));
    await ejecutar(async () => {
      const respuesta = await generarBorrador(empresa._id, {
        datosCentro: datos,
        reemplazar: Boolean(actual.borradorEmail?.asunto),
      });
      setJobId(respuesta.searchId);
      setRegenerar(false);
    });
  }
  async function cargar() {
    await ejecutar(async () => {
      const guardada = await obtenerEmpresa(empresa._id);
      setActual(guardada);
      setAsunto(guardada.borradorEmail?.asunto || '');
      setCuerpo(guardada.borradorEmail?.cuerpo || '');
      setJobId(null);
      onSaved();
      setMensaje('Borrador cargado. Revísalo antes de utilizarlo.');
    });
  }
  async function guardar(event) {
    event.preventDefault();
    await ejecutar(async () => {
      const guardada = await guardarBorrador(empresa._id, {
        asunto,
        cuerpo,
        version: actual.borradorVersion || 0,
      });
      setActual(guardada);
      onSaved();
      setMensaje('Borrador guardado como edición manual. No se ha enviado.');
    });
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(`Asunto: ${asunto}\n\n${cuerpo}`);
      setMensaje(
        'Copiado al portapapeles. Revisa el destinatario en tu correo.',
      );
      setError('');
    } catch {
      setError(
        'No se ha podido copiar. Puedes seleccionar el asunto y el texto y copiarlos manualmente.',
      );
    }
  }
  async function actualizarEstado(nuevoEstado) {
    await ejecutar(async () => {
      const guardada = await cambiarContacto(empresa._id, {
        estado: nuevoEstado,
        nota,
      });
      setActual(guardada);
      setEstado(nuevoEstado);
      setNota('');
      onSaved();
      setMensaje(`Estado actualizado: ${nuevoEstado}.`);
    });
  }
  return (
    <div className="contact-panel">
      <div className="eyebrow">PASO 05 / CONTACTO REVISADO POR TI</div>
      <h2>{empresa.nombre}</h2>
      <Notice>
        Los correos son borradores. La aplicación nunca envía correos ni marca
        una empresa como contactada al copiar o abrir tu cliente.
      </Notice>
      {(!actual.borradorEmail?.asunto || regenerar) && (
        <form className="detail-section" onSubmit={solicitar}>
          <h3>Prepara una propuesta de colaboración</h3>
          <p className="small muted">
            Estos datos se usan en el borrador. Si faltan y tampoco están
            configurados en el centro, se mantienen como marcadores para que los
            completes.
          </p>
          <fieldset disabled={ocupada || generando}>
            <label>
              Nombre del centro
              <input
                name="nombreCentro"
                maxLength={200}
                placeholder="Nombre oficial del IES"
              />
            </label>
            <label>
              Profesor o profesora
              <input
                name="profesor"
                maxLength={200}
                placeholder="Nombre y apellidos"
              />
            </label>
            <div className="form-grid">
              <label>
                Email del centro
                <input
                  name="email"
                  type="email"
                  maxLength={254}
                  placeholder="contacto@centro.es"
                />
              </label>
              <label>
                Teléfono del centro
                <input name="telefono" maxLength={50} />
              </label>
            </div>
          </fieldset>
          {regenerar && (
            <Notice>
              La nueva propuesta reemplazará el borrador guardado solo si la
              generación tiene éxito y nadie lo ha editado durante el proceso.
            </Notice>
          )}
          <div className="actions">
            <button className="button" disabled={ocupada || generando}>
              <Icon name="spark" size={17} />
              {ocupada ? 'Creando trabajo…' : 'Generar borrador con IA'}
            </button>
            {regenerar && (
              <button
                type="button"
                className="text-button"
                onClick={() => setRegenerar(false)}
              >
                Conservar borrador actual
              </button>
            )}
          </div>
        </form>
      )}
      {jobId && (
        <div className="draft-job" aria-live="polite">
          <p>
            <strong>
              {job?.estado === 'completada'
                ? 'Tu borrador está listo'
                : job?.estado === 'error' || job?.estado === 'interrumpida'
                  ? 'No se ha podido generar el borrador'
                  : 'Preparando el borrador…'}
            </strong>
          </p>
          <p className="small muted">
            {job?.estado === 'en_cola'
              ? 'Esperando su turno en la cola compartida de IA.'
              : 'El estado se consulta cada 2,5 segundos.'}
          </p>
          {(errorJob || job?.error) && (
            <Notice error>{errorJob || job.error.message}</Notice>
          )}
          {errorJob && (
            <button
              className="button secondary"
              onClick={() => setIntento((valor) => valor + 1)}
            >
              Reintentar consulta
            </button>
          )}
          {job?.estado === 'completada' && (
            <button className="button" disabled={ocupada} onClick={cargar}>
              Cargar borrador
            </button>
          )}
          {['error', 'interrumpida'].includes(job?.estado) && (
            <button className="button secondary" onClick={() => setJobId(null)}>
              Volver al editor
            </button>
          )}
        </div>
      )}
      {actual.borradorEmail?.asunto && (
        <form className="detail-section email-editor" onSubmit={guardar}>
          <h3>Revisa y personaliza el borrador</h3>
          <span className="manual-label">
            {actual.borradorEmail.edicionManual
              ? 'Edición docente guardada'
              : 'Propuesta generada por IA'}
          </span>
          <label>
            Destinatario
            <input
              type="email"
              value={destinatario}
              onChange={(event) => setDestinatario(event.target.value)}
              placeholder="Completa el email o elígelo en tu cliente"
            />
            <small>Se usa al abrir tu correo; no se comparte con la IA.</small>
          </label>
          <label>
            Asunto
            <input
              value={asunto}
              onChange={(event) => setAsunto(event.target.value)}
              required
              maxLength={180}
              disabled={ocupada || generando}
            />
          </label>
          <label>
            Cuerpo del correo
            <textarea
              value={cuerpo}
              onChange={(event) => setCuerpo(event.target.value)}
              rows="14"
              maxLength={12000}
              required
              disabled={ocupada || generando}
            />
          </label>
          <div className="actions">
            <button className="button" disabled={ocupada || generando}>
              Guardar borrador
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={!asunto || !cuerpo}
              onClick={copiar}
            >
              Copiar
            </button>
            <a
              className="button secondary"
              href={mailto || undefined}
              aria-disabled={!mailto}
              onClick={(event) => {
                if (!mailto || !asunto || !cuerpo) {
                  event.preventDefault();
                  setError(
                    'Completa el asunto y cuerpo y revisa el destinatario.',
                  );
                }
              }}
            >
              Abrir en mi correo
            </a>
          </div>
          <p className="small muted">
            Abrir el cliente prepara el mensaje; tú decides si enviarlo. Algunos
            clientes limitan el tamaño de los enlaces mailto: utiliza Copiar si
            el texto se recorta.
          </p>
          <button
            type="button"
            className="text-button"
            disabled={generando || ocupada}
            onClick={() => setRegenerar(true)}
          >
            Solicitar una nueva propuesta IA
          </button>
        </form>
      )}
      {error && <Notice error>{error}</Notice>}
      {mensaje && (
        <p className="save-message" role="status">
          <Icon name="check" size={16} />
          {mensaje}
        </p>
      )}
      <section className="detail-section">
        <h3>Seguimiento del contacto</h3>
        <p className="small muted">
          Estado actual: <strong>{actual.estadoContacto}</strong>. Actualízalo
          cuando hayas realizado el contacto o recibido una respuesta.
        </p>
        <label>
          Nuevo estado
          <select
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
          >
            {[
              'Pendiente',
              'Contactada',
              'Respondió',
              'Interesada',
              'Descartada',
            ].map((valor) => (
              <option key={valor}>{valor}</option>
            ))}
          </select>
        </label>
        <label>
          Nota del seguimiento
          <textarea
            rows="3"
            maxLength={2000}
            value={nota}
            onChange={(event) => setNota(event.target.value)}
            placeholder="Observaciones de este cambio de estado…"
          />
        </label>
        <div className="actions">
          <button
            className="button secondary"
            disabled={ocupada}
            onClick={() => actualizarEstado(estado)}
          >
            Guardar estado
          </button>
          <button
            className="button"
            disabled={ocupada || actual.estadoContacto === 'Contactada'}
            onClick={() => actualizarEstado('Contactada')}
          >
            Marcar como Contactada
          </button>
        </div>
        <h3 className="history-title">Historial</h3>
        {!actual.historialContacto?.length ? (
          <p className="small muted">
            Todavía no hay cambios de estado registrados.
          </p>
        ) : (
          <ol className="contact-history">
            {[...actual.historialContacto].reverse().map((entrada, indice) => (
              <li key={entrada._id || `${entrada.fecha}-${indice}`}>
                <strong>{entrada.estado}</strong>
                <time dateTime={entrada.fecha}>
                  {new Date(entrada.fecha).toLocaleString('es-ES')}
                </time>
                {entrada.nota && <p>{entrada.nota}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
