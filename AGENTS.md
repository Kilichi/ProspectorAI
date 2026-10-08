# ProspectorAI — Convenciones del proyecto

## Alcance y fases

- La raíz del proyecto es esta carpeta, `ProyectoClase`; no crear otra carpeta contenedora.
- Aplicación docente de DWES para gestionar candidatas a Formación en Empresa FCT/Dual.
- Seguir las fases 0 a 7 acordadas con el usuario. Al terminar cada fase, verificar lo implementado, resumir cómo probarlo y detenerse hasta recibir confirmación.
- No implementar fases posteriores por adelantado. n8n es opcional y requiere acordar su inclusión.
- Autorización posterior del usuario: continuar al acabar cada fase e incluir n8n y el arranque completo con Docker. Prevalece sobre la pausa inicial.
- Código, documentación y comentarios útiles en español. Identificadores coherentes y fáciles de explicar.

## Arquitectura

- Backend Node.js LTS, JavaScript ES Modules, Express y validación con Zod.
- Frontend React con Vite, CSS propio y Leaflet para el mapa.
- MongoDB 7 local en Docker; Mongoose solo se utiliza en `models/`, `dao/` y la conexión de infraestructura en `config/`.
- Rutas → controladores → servicios → DAO → modelos. Ningún controlador o servicio consulta Mongoose directamente.
- Proveedores de IA intercambiables con `generateJSON(systemPrompt, userPrompt)` y modelo configurado por entorno.
- Perfiles de ciclo en `backend/src/profiles/`; DAW es el perfil inicial.
- Cliente HTTP centralizado en `frontend/src/api/`.

## Comandos previstos

Comandos disponibles desde la raíz. Docker requiere acceso al motor local.

- `npm install`: instalar los workspaces backend y frontend desde la raíz.
- `docker compose up -d mongodb`: iniciar MongoDB local.
- `npm run dev`: iniciar backend y frontend.
- `npm test`: ejecutar pruebas sin APIs externas.
- `npm run lint`: comprobar ESLint.
- `npm run format:check`: comprobar Prettier.
- `npm run build`: compilar el frontend.
- `npm run test:ui`: Playwright con APIs simuladas y Chrome instalado.
- `npm run docker:prepare`: preparar entorno y token conservando claves.
- `npm run docker:up`: construir y arrancar los cuatro servicios.
- `npm run docker:check`: validar Compose sin imprimir secretos.
- `npm run docker:down`: detener conservando volúmenes.
- `npm run n8n:repair`: respaldar/configurar/publicar workflow y probar búsqueda sin IA; requiere motor Docker accesible.
- `npm run clean`: eliminar únicamente los node_modules del proyecto, con rutas verificadas.

## Servicios gratuitos y límites

- No utilizar servicios que exijan tarjeta bancaria o contratación de planes de pago.
- API keys solo en `backend/.env`; nunca en frontend, repositorio, respuestas HTTP o logs.
- Proveedor y modelo configurables mediante AI_PROVIDER y AI_MODEL, sin modelos codificados en los servicios.
- Nominatim: User-Agent identificativo, caché y máximo una petición por segundo.
- Overpass: una consulta por búsqueda, timeout de 60 segundos y reintentos limitados con backoff ante 429/504.
- IA: cola secuencial compartida por las operaciones que consumen IA, pausa AI_DELAY_MS, límite MAX_COMPANIES_PER_RUN y backoff limitado ante 429.
- Verificar formatos externos en documentación oficial cuando exista incertidumbre; no inventar endpoints.

## Evidencia e IA

- OSM ofrece candidatas, no un censo completo ni una clasificación garantizada.
- La IA solo recibe datos OSM y texto disponible de la página principal de la empresa.
- No inventar actividad, tecnologías, contactos, condiciones de prácticas o teletrabajo. Expresar desconocimiento y confianza en el resultado.
- Validar el JSON con Zod; permitir una corrección y registrar error si sigue siendo inválido.
- No reanalizar empresas ya completadas salvo solicitud explícita.
- Marcar y conservar las ediciones manuales del profesorado.
- Los correos son borradores revisables. La aplicación nunca envía correos automáticamente.

## Seguridad y calidad

- Validar parámetros, consultas, cuerpos y variables de entorno con Zod.
- Errores públicos uniformes: `{ error: { code, message } }`; sin trazas internas.
- CORS restringido, Helmet y rate limit en operaciones que consumen IA.
- Descarga web: solo HTTP/HTTPS, bloquear destinos internos/privados y redirecciones inseguras; timeout de 8 segundos, límite de bytes y extracción de texto con Cheerio.
- No registrar secretos ni el contenido completo de correos.
- Pruebas con mocks para normalización OSM, Haversine, validación IA y DAO. No llamar a APIs reales en tests.
- No introducir datos demo en producción; cualquier seed debe estar separado y claramente etiquetado.
- Documentar límites de la cola en memoria y recuperación de jobs interrumpidos al reiniciar.
- Al cerrar cada fase, ejecutar los checks disponibles y comunicar cualquier comprobación que no se haya podido realizar.
