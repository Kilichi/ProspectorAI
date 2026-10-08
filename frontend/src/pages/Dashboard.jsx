import { useCallback, useState } from 'react';
import { listarEmpresas } from '../api/client.js';
import { useRecurso } from '../hooks/useRecurso.js';
import CompanyCard from '../components/CompanyCard.jsx';
import CompanyMap from '../components/CompanyMap.jsx';
import CompanyDetail from '../components/CompanyDetail.jsx';
import Notice from '../components/Notice.jsx';
import Icon from '../components/Icon.jsx';
import StatsPanel from '../components/StatsPanel.jsx';

const filtrosVacios = {
  texto: '',
  interesDAW: '',
  tecnologia: '',
  estadoContacto: '',
  minPuntuacion: '',
  teletrabajo: '',
  analisisEstado: '',
};
export default function Dashboard({ busqueda, onNew, onJob }) {
  const [soloBusqueda, setSoloBusqueda] = useState(Boolean(busqueda));
  const [filtros, setFiltros] = useState(filtrosVacios);
  const [borradorFiltros, setBorradorFiltros] = useState(filtrosVacios);
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState('puntuacion:desc');
  const [vista, setVista] = useState('tarjetas');
  const [seleccionada, setSeleccionada] = useState(null);
  const [revision, setRevision] = useState(0);
  const [campoOrden, direccion] = orden.split(':');
  const consulta = JSON.stringify({
    ...filtros,
    pagina,
    limite: 12,
    orden: campoOrden,
    direccion,
    searchId: soloBusqueda ? busqueda?._id : '',
  });
  const { data, loading, error } = useRecurso(
    listarEmpresas,
    consulta,
    revision,
  );
  const abrir = useCallback((id) => setSeleccionada(id), []);
  const filtrosActivos = Object.values(filtros).filter(
    (valor) => valor !== '',
  ).length;
  function cambiarFiltro(event) {
    setBorradorFiltros({
      ...borradorFiltros,
      [event.target.name]: event.target.value,
    });
  }
  function limpiar() {
    setFiltros(filtrosVacios);
    setBorradorFiltros(filtrosVacios);
    setPagina(1);
  }
  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">ESPACIO DE PROSPECCIÓN / PASO 04</div>
          <h1>
            Tu red de empresas<span className="heading-dot">.</span>
          </h1>
          <p className="muted">
            Explora las candidatas. La última palabra sigue siendo tuya.
          </p>
        </div>
        <button className="button" onClick={onNew}>
          <Icon name="plus" />
          Nueva prospección
        </button>
      </div>
      <Notice>
        OSM ofrece candidatas, no un censo completo. Una valoración IA no
        confirma la disponibilidad de prácticas ni el teletrabajo.
      </Notice>
      <StatsPanel
        searchId={soloBusqueda ? busqueda?._id : null}
        revision={revision}
      />
      <div className="dashboard-context">
        <div>
          <strong>{loading ? '…' : (data?.total ?? '—')}</strong>
          <span>
            empresas {filtrosActivos ? 'con estos filtros' : 'candidatas'}
          </span>
        </div>
        <div className="scope-controls">
          {busqueda && (
            <select
              aria-label="Ámbito del listado"
              value={soloBusqueda ? 'busqueda' : 'todas'}
              onChange={(event) => {
                setSoloBusqueda(event.target.value === 'busqueda');
                setPagina(1);
                setOrden('puntuacion:desc');
              }}
            >
              <option value="busqueda">
                Esta búsqueda ·{' '}
                {busqueda.parametros?.localidad || 'Coordenadas'}
              </option>
              <option value="todas">Todas las guardadas</option>
            </select>
          )}
          <button
            className="icon-button"
            aria-label="Actualizar empresas"
            onClick={() => setRevision((valor) => valor + 1)}
          >
            <Icon name="refresh" />
          </button>
        </div>
      </div>
      {soloBusqueda && busqueda?.centro && (
        <p className="search-location">
          <Icon name="pin" size={16} />
          {busqueda.centro.nombre ||
            `${busqueda.centro.lat}, ${busqueda.centro.lon}`}{' '}
          · {busqueda.parametros.radioKm} km
        </p>
      )}
      <form
        className="panel filters"
        onSubmit={(event) => {
          event.preventDefault();
          setFiltros(borradorFiltros);
          setPagina(1);
        }}
      >
        <div className="filters-title">
          <Icon name="sliders" />
          <strong>Afina tu selección</strong>
          {filtrosActivos > 0 && (
            <span className="status-pill">{filtrosActivos} activos</span>
          )}
        </div>
        <div className="filters-grid">
          <label className="filter-text">
            Buscar
            <input
              name="texto"
              placeholder="Nombre, actividad o dirección"
              maxLength={150}
              value={borradorFiltros.texto}
              onChange={cambiarFiltro}
            />
          </label>
          <label>
            Interés DAW
            <select
              name="interesDAW"
              value={borradorFiltros.interesDAW}
              onChange={cambiarFiltro}
            >
              <option value="">Todos</option>
              <option value="true">Con interés</option>
              <option value="false">Interés bajo</option>
              <option value="desconocido">Por determinar</option>
            </select>
          </label>
          <label>
            Tecnología
            <input
              name="tecnologia"
              placeholder="Ej. JavaScript"
              maxLength={100}
              value={borradorFiltros.tecnologia}
              onChange={cambiarFiltro}
            />
          </label>
          <label>
            Puntuación mínima
            <input
              type="number"
              name="minPuntuacion"
              placeholder="0–100"
              min="0"
              max="100"
              value={borradorFiltros.minPuntuacion}
              onChange={cambiarFiltro}
            />
          </label>
          <label>
            Teletrabajo
            <select
              name="teletrabajo"
              value={borradorFiltros.teletrabajo}
              onChange={cambiarFiltro}
            >
              <option value="">Todos</option>
              <option value="true">Posible</option>
              <option value="false">Sin opción remota</option>
              <option value="desconocido">Desconocido</option>
            </select>
          </label>
          <label>
            Estado del análisis
            <select
              name="analisisEstado"
              value={borradorFiltros.analisisEstado}
              onChange={cambiarFiltro}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="analizando">Analizando</option>
              <option value="completado">Completado</option>
              <option value="error">Error</option>
            </select>
          </label>
          <label>
            Estado de contacto
            <select
              name="estadoContacto"
              value={borradorFiltros.estadoContacto}
              onChange={cambiarFiltro}
            >
              <option value="">Todos</option>
              {[
                'Pendiente',
                'Contactada',
                'Respondió',
                'Interesada',
                'Descartada',
              ].map((estado) => (
                <option key={estado}>{estado}</option>
              ))}
            </select>
          </label>
          <div className="filter-actions">
            <button className="button small-button" type="submit">
              Aplicar filtros
            </button>
            <button className="text-button" type="button" onClick={limpiar}>
              Limpiar
            </button>
          </div>
        </div>
      </form>
      <div className="results-toolbar">
        <div className="segmented">
          <button
            className={vista === 'tarjetas' ? 'active' : ''}
            aria-pressed={vista === 'tarjetas'}
            onClick={() => setVista('tarjetas')}
          >
            <Icon name="grid" size={16} />
            Tarjetas
          </button>
          <button
            className={vista === 'mapa' ? 'active' : ''}
            aria-pressed={vista === 'mapa'}
            onClick={() => setVista('mapa')}
          >
            <Icon name="pin" size={16} />
            Mapa
          </button>
        </div>
        <label className="sort-label">
          Ordenar por
          <select
            value={orden}
            onChange={(event) => {
              setOrden(event.target.value);
              setPagina(1);
            }}
          >
            <option value="puntuacion:desc">Mayor puntuación</option>
            <option value="puntuacion:asc">Menor puntuación</option>
            <option value="nombre:asc">Nombre A–Z</option>
            {soloBusqueda && busqueda?.centro && (
              <option value="distancia:asc">Más cercanas</option>
            )}
          </select>
        </label>
      </div>
      {loading ? (
        <div className="loading-results" role="status">
          <span className="spinner" />
          Cargando empresas…
        </div>
      ) : error ? (
        <div className="panel">
          <Notice error>{error}</Notice>
          <button
            className="button secondary"
            onClick={() => setRevision((valor) => valor + 1)}
          >
            Reintentar
          </button>
        </div>
      ) : !data?.empresas.length ? (
        <div className="panel empty-state">
          <Icon name="search" size={36} />
          <h2>No hay empresas en esta selección</h2>
          <p className="muted">
            Prueba a ampliar los filtros o inicia una nueva prospección.
          </p>
          <div className="actions">
            <button className="button secondary" onClick={limpiar}>
              Limpiar filtros
            </button>
            <button className="button" onClick={onNew}>
              Nueva prospección
            </button>
          </div>
        </div>
      ) : (
        <>
          {vista === 'mapa' ? (
            <CompanyMap
              empresas={data.empresas}
              centro={soloBusqueda ? busqueda?.centro : null}
              radioKm={soloBusqueda ? busqueda?.parametros?.radioKm : null}
              onOpen={abrir}
            />
          ) : (
            <div className="company-grid">
              {data.empresas.map((empresa) => (
                <CompanyCard
                  key={empresa._id}
                  empresa={empresa}
                  onOpen={abrir}
                />
              ))}
            </div>
          )}
        </>
      )}
      {data?.total > 0 && (
        <nav className="pagination" aria-label="Páginas de empresas">
          <span>
            {(pagina - 1) * 12 + 1}–{Math.min(pagina * 12, data.total)} de{' '}
            {data.total} empresas
          </span>
          <div>
            <button
              className="button secondary small-button"
              disabled={pagina === 1}
              onClick={() => setPagina((valor) => valor - 1)}
            >
              Anterior
            </button>
            <span>
              Página {pagina} de {Math.ceil(data.total / 12)}
            </span>
            <button
              className="button secondary small-button"
              disabled={pagina * 12 >= data.total}
              onClick={() => setPagina((valor) => valor + 1)}
            >
              Siguiente
            </button>
          </div>
        </nav>
      )}
      {seleccionada && (
        <CompanyDetail
          id={seleccionada}
          onClose={() => setSeleccionada(null)}
          onSaved={() => setRevision((valor) => valor + 1)}
          onJob={onJob}
        />
      )}
    </div>
  );
}
