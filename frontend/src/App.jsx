import { useState } from 'react';
import { useHealth } from './hooks/useHealth.js';
import Welcome from './pages/Welcome.jsx';
import SearchForm from './pages/SearchForm.jsx';
import Progress from './pages/Progress.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Icon from './components/Icon.jsx';

function leerJob() {
  try {
    const id = sessionStorage.getItem('prospectorai.job');
    return /^[a-f\d]{24}$/i.test(id || '') ? id : null;
  } catch {
    return null;
  }
}
export default function App() {
  const [jobId, setJobId] = useState(leerJob);
  const [vista, setVista] = useState(() =>
    leerJob() ? 'progreso' : 'bienvenida',
  );
  const [busqueda, setBusqueda] = useState(null);
  const [dashboardVersion, setDashboardVersion] = useState(0);
  const { loading, data, error, retry } = useHealth();
  function iniciarJob(id) {
    setJobId(id);
    setVista('progreso');
    try {
      sessionStorage.setItem('prospectorai.job', id);
    } catch {
      /* La aplicación también funciona sin almacenamiento del navegador. */
    }
  }
  function mostrarResultados(job) {
    setBusqueda(job.tipo === 'reanalisis' ? null : job);
    setDashboardVersion((valor) => valor + 1);
    setVista('dashboard');
    setJobId(null);
    try {
      sessionStorage.removeItem('prospectorai.job');
    } catch {
      /* No impide consultar resultados. */
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => setVista('bienvenida')}
          aria-label="ProspectorAI, inicio"
        >
          <span className="brand-icon">
            <Icon name="leaf" size={23} />
          </span>
          <span>
            Prospector<span className="brand-ai">AI</span>
            <small>DEL AULA A LA EMPRESA</small>
          </span>
        </button>
        <div className="workspace-label">TU ESPACIO DE TRABAJO</div>
        <nav className="main-nav" aria-label="Navegación principal">
          <button
            className={vista === 'bienvenida' ? 'active' : ''}
            onClick={() => setVista('bienvenida')}
          >
            <Icon name="leaf" />
            Inicio
          </button>
          <button
            className={vista === 'formulario' ? 'active' : ''}
            onClick={() => setVista('formulario')}
          >
            <Icon name="search" />
            Nueva prospección
          </button>
          <button
            className={vista === 'dashboard' ? 'active' : ''}
            onClick={() => setVista('dashboard')}
          >
            <Icon name="grid" />
            Empresas guardadas
          </button>
          {jobId && (
            <button
              className={vista === 'progreso' ? 'active' : ''}
              onClick={() => setVista('progreso')}
            >
              <Icon name="clock" />
              Consultar progreso
              <span className="nav-dot" />
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="school-note">
            <span className="icon-box">
              <Icon name="building" />
            </span>
            <div>
              <strong>Formación Profesional</strong>
              <span>Villena · Alicante</span>
            </div>
          </div>
          <div className="connection" role="status">
            <span
              className={`dot ${data?.status === 'ok' ? '' : 'warning-dot'}`}
            />
            {loading
              ? 'Comprobando conexión'
              : data?.status === 'ok'
                ? 'Sistema conectado'
                : 'Conexión pendiente'}
            <button
              className="icon-button"
              onClick={retry}
              disabled={loading}
              aria-label="Comprobar conexión"
            >
              <Icon name="refresh" size={14} />
            </button>
          </div>
          {error && <p className="small error">{error}</p>}
          <p className="sidebar-caption">Proyecto educativo · DWES</p>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="topbar-dot" />
            PROSPECCIÓN CON CRITERIO DOCENTE
          </div>
          <span className="profile-pill">
            DAW <span>·</span> FCT / Dual
          </span>
        </header>
        <main id="contenido">
          {vista === 'bienvenida' && (
            <Welcome
              onStart={() => setVista('formulario')}
              onDashboard={() => setVista('dashboard')}
            />
          )}
          {vista === 'formulario' && <SearchForm onJob={iniciarJob} />}
          {vista === 'progreso' && jobId && (
            <Progress
              key={jobId}
              id={jobId}
              onResults={mostrarResultados}
              onNew={() => setVista('formulario')}
            />
          )}
          {vista === 'dashboard' && (
            <Dashboard
              key={dashboardVersion}
              busqueda={busqueda}
              onNew={() => setVista('formulario')}
              onJob={iniciarJob}
            />
          )}
        </main>
        <footer className="app-footer">
          <span>
            ProspectorAI <span className="muted">/</span> Conecta el talento con
            su entorno.
          </span>
          <span>
            Datos ©{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenStreetMap contributors
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}
