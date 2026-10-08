import Icon from '../components/Icon.jsx';
export default function Welcome({ onStart, onDashboard }) {
  return (
    <div className="welcome">
      <section className="welcome-copy">
        <div className="eyebrow">
          <span className="dot" /> FORMACIÓN PROFESIONAL · VILLENA
        </div>
        <h1>
          El próximo paso <br />
          de tu alumnado <br />
          empieza <em>aquí.</em>
        </h1>
        <p className="lead">
          Encuentra y gestiona empresas para la Formación en Empresa de DAW en
          segundos.
        </p>
        <p className="muted">
          Explora tu entorno, contrasta las candidatas con IA y construye una
          red de oportunidades para tu centro.
        </p>
        <div className="actions">
          <button className="button" onClick={onStart}>
            Comenzar Prospección <Icon name="arrow" />
          </button>
          <button className="button secondary" onClick={onDashboard}>
            Ver empresas guardadas
          </button>
        </div>
        <div className="welcome-foot">
          <Icon name="leaf" /> Datos abiertos. Revisión docente. Sin envíos
          automáticos.
        </div>
      </section>
      <section
        className="welcome-visual"
        aria-label="El recorrido de una prospección"
      >
        <div className="visual-grid" />
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="visual-center">
          <Icon name="pin" size={38} />
          <span>
            Tu entorno,
            <br />
            <strong>nuevas posibilidades.</strong>
          </span>
        </div>
        <div className="visual-label label-one">
          <span className="icon-box">
            <Icon name="search" />
          </span>
          <div>
            <small>01 · EXPLORA</small>
            <strong>Empresas cercanas</strong>
          </div>
        </div>
        <div className="visual-label label-two">
          <span className="icon-box warm">
            <Icon name="spark" />
          </span>
          <div>
            <small>02 · CONTRASTA</small>
            <strong>Evidencia y valoración</strong>
          </div>
        </div>
        <div className="visual-label label-three">
          <span className="icon-box">
            <Icon name="building" />
          </span>
          <div>
            <small>03 · SELECCIONA</small>
            <strong>Una red para tu alumnado</strong>
          </div>
        </div>
        <span className="map-dot map-dot-one" />
        <span className="map-dot map-dot-two" />
        <span className="map-dot map-dot-three" />
        <div className="visual-caption">
          PROSPECTORAI / DEL AULA A LA EMPRESA
        </div>
      </section>
      <section className="principles">
        <div>
          <span>01</span>
          <h2>Busca con contexto</h2>
          <p>Una localidad, un radio y un perfil formativo.</p>
        </div>
        <div>
          <span>02</span>
          <h2>Decide con evidencia</h2>
          <p>Datos OSM y texto de la web, con dudas explícitas.</p>
        </div>
        <div>
          <span>03</span>
          <h2>Mantén el criterio docente</h2>
          <p>Revisa, filtra y guarda tu propia valoración.</p>
        </div>
      </section>
    </div>
  );
}
