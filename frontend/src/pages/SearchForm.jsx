import { useState } from 'react';
import { crearBusqueda } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import Notice from '../components/Notice.jsx';

export default function SearchForm({ onJob }) {
  const [modo, setModo] = useState('localidad');
  const [radio, setRadio] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function enviar(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const campos = new FormData(event.currentTarget);
    const parametros = {
      radioKm: radio,
      perfil: 'daw',
      analizar: campos.get('analizar') === 'on',
      ...(modo === 'localidad'
        ? { localidad: campos.get('localidad').trim() }
        : { lat: Number(campos.get('lat')), lon: Number(campos.get('lon')) }),
    };
    try {
      onJob((await crearBusqueda(parametros)).searchId);
    } catch (fallo) {
      setError(
        fallo.name === 'TypeError'
          ? 'No se puede conectar con el backend.'
          : fallo.message,
      );
      setLoading(false);
    }
  }
  return (
    <div className="page-narrow">
      <div className="eyebrow">NUEVA PROSPECCIÓN / PASO 01</div>
      <h1>¿Dónde buscamos?</h1>
      <p className="lead">
        Empieza por un lugar. Amplía el horizonte de tu alumnado.
      </p>
      <form className="panel search-form" onSubmit={enviar}>
        <fieldset disabled={loading}>
          <legend>Ubicación de la búsqueda</legend>
          <div className="segmented">
            <button
              type="button"
              aria-pressed={modo === 'localidad'}
              className={modo === 'localidad' ? 'active' : ''}
              onClick={() => setModo('localidad')}
            >
              Localidad
            </button>
            <button
              type="button"
              aria-pressed={modo === 'coordenadas'}
              className={modo === 'coordenadas' ? 'active' : ''}
              onClick={() => setModo('coordenadas')}
            >
              Coordenadas
            </button>
          </div>
          {modo === 'localidad' ? (
            <label>
              Localidad y provincia
              <input
                name="localidad"
                placeholder="Villena, Alicante"
                defaultValue="Villena, Alicante"
                minLength={2}
                maxLength={150}
                required
              />
              <small>La búsqueda de localidades está limitada a España.</small>
            </label>
          ) : (
            <div className="form-grid">
              <label>
                Latitud
                <input
                  name="lat"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  defaultValue="38.635"
                  required
                />
              </label>
              <label>
                Longitud
                <input
                  name="lon"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  defaultValue="-0.866"
                  required
                />
              </label>
            </div>
          )}
          <label className="range-label">
            Radio de búsqueda{' '}
            <output>
              {radio} <small>km</small>
            </output>
            <input
              aria-label="Radio de búsqueda en kilómetros"
              type="range"
              min="1"
              max="100"
              value={radio}
              onChange={(event) => setRadio(Number(event.target.value))}
            />
            <span className="range-extremes">
              <small>1 km · Cerca del centro</small>
              <small>100 km · Amplía la zona</small>
            </span>
          </label>
          <label>
            Perfil del ciclo
            <select name="perfil" defaultValue="daw">
              <option value="daw">DAW · Desarrollo de Aplicaciones Web</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" name="analizar" defaultChecked />
            <span>
              <strong>Analizar las candidatas con IA</strong>
              <small>
                Se procesan una a una, hasta el límite configurado. Desmarca
                para localizar sin IA.
              </small>
            </span>
          </label>
        </fieldset>
        {error && <Notice error>{error}</Notice>}
        <button className="button full" disabled={loading}>
          {loading ? 'Creando búsqueda…' : 'Buscar Empresas Candidatas'}
          <Icon name="arrow" />
        </button>
      </form>
      <Notice>
        OpenStreetMap ofrece candidatas: no recoge todas las empresas ni
        garantiza su clasificación. La disponibilidad de prácticas siempre debe
        confirmarse.
      </Notice>
    </div>
  );
}
