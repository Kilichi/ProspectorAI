import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Notice from './Notice.jsx';

export default function CompanyMap({ empresas, centro, radioKm, onOpen }) {
  const contenedor = useRef(null);
  const [errorTiles, setErrorTiles] = useState(false);
  useEffect(() => {
    const mapa = L.map(contenedor.current, { scrollWheelZoom: false }).setView(
      [centro?.lat ?? 38.635, centro?.lon ?? -0.866],
      10,
    );
    const tiles = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    ).addTo(mapa);
    tiles.on('tileerror', () => setErrorTiles(true));
    const puntos = [];
    for (const empresa of empresas) {
      const { lat, lon } = empresa.ubicacion || {};
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const popup = document.createElement('div');
      const titulo = document.createElement('strong');
      titulo.textContent = empresa.nombre;
      const boton = document.createElement('button');
      boton.textContent = 'Ver detalle';
      boton.className = 'map-popup-button';
      boton.onclick = () => onOpen(empresa._id);
      popup.append(titulo, document.createElement('br'), boton);
      const icon = L.divIcon({
        className: `map-marker ${empresa.interesDAW === true ? 'map-marker-interest' : ''}`,
        html: '<span></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      L.marker([lat, lon], {
        icon,
        title: empresa.nombre,
        alt: empresa.nombre,
        keyboard: true,
      })
        .addTo(mapa)
        .bindPopup(popup);
      puntos.push([lat, lon]);
    }
    if (centro && radioKm)
      L.circle([centro.lat, centro.lon], {
        radius: radioKm * 1000,
        color: '#287361',
        weight: 1,
        fillOpacity: 0.025,
        dashArray: '5 5',
      }).addTo(mapa);
    if (puntos.length)
      mapa.fitBounds(L.latLngBounds(puntos), {
        padding: [45, 45],
        maxZoom: 14,
      });
    const observador = new ResizeObserver(() => mapa.invalidateSize());
    observador.observe(contenedor.current);
    return () => {
      observador.disconnect();
      mapa.remove();
    };
  }, [empresas, centro, radioKm, onOpen]);
  return (
    <section className="map-section">
      <div className="map-caption">
        <strong>{empresas.length} empresas de esta página</strong>
        <span>Selecciona un marcador para abrir el detalle.</span>
      </div>
      {errorTiles && (
        <Notice error>
          No se ha podido cargar parte del mapa. Las empresas siguen disponibles
          en las tarjetas; comprueba tu conexión a Internet.
        </Notice>
      )}
      <div
        className="company-map"
        ref={contenedor}
        aria-label="Mapa de las empresas de la página actual"
      />
      <p className="small muted">
        El mapa respeta los filtros y la paginación. Los marcadores verdes
        indican interés DAW.
      </p>
    </section>
  );
}
