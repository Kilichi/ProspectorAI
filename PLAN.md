# ProspectorAI — Plan acordado de implementación

La raíz es `ProyectoClase`, sin una carpeta contenedora adicional. Este documento corresponde a la Fase 0. La carpeta contiene un esqueleto previo de Fase 1 que se conserva; su estado histórico figura en `ESTADO.md` y no constituye una verificación nueva.

## Fases y criterios de cierre

0. **Plan:** convenciones en `AGENTS.md`, estructura, dependencias y decisiones. No instalar ni implementar funciones nuevas.
1. **Esqueleto:** workspaces npm, MongoDB 7 en Docker, Express, configuración validada, errores uniformes, health y React consultándolo. Comprobar tests HTTP, lint, formato, build y conexión real cuando Docker esté disponible.
2. **Localización:** perfil DAW, Nominatim con caché y separación mínima de un segundo, Overpass con una consulta por búsqueda y reintentos limitados, normalización, Haversine, modelos y DAO. Buscar y persistir sin IA. Probar normalización, distancia y DAO con mocks.
3. **IA:** proveedores intercambiables, descarga segura de la página principal, prompts, esquema Zod, una corrección de JSON y cola secuencial compartida. Jobs asíncronos con progreso persistido; no repetir análisis completados sin solicitud. Probar validación, errores, límites y recuperación de jobs sin APIs reales.
4. **Frontend:** bienvenida, parámetros, progreso, dashboard, filtros, paginación, mapa, detalle y ediciones manuales protegidas. Verificar carga, vacío, error y uso responsive.
5. **Contacto:** borradores revisables, editor, copiar, mailto, estados, historial y estadísticas. Nunca enviar correos automáticamente. Comprobar conservación de cambios y validación con mocks.
6. **n8n opcional:** decidir su inclusión antes de implementarlo. Si se acuerda, añadir contenedor, endpoints necesarios y workflows exportados; conservar el funcionamiento independiente del backend.
7. **Entrega:** README completo, guía Villena 30 km, diagrama Mermaid, límites y decisiones, configuración gratuita y script de limpieza con rutas verificadas. Ejecutar todos los checks disponibles y documentar los pendientes.

Al cerrar cada fase: resumir cambios, resultados de comprobación y pasos para probar; detenerse hasta recibir confirmación.

## Estructura definitiva prevista

```text
ProyectoClase/
├── AGENTS.md
├── PLAN.md
├── ESTADO.md
├── README.md
├── package.json
├── package-lock.json
├── docker-compose.yml
├── .gitignore
├── eslint.config.js
├── .prettierrc.json
├── .prettierignore
├── scripts/
│   └── clean.js
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tests/
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── ai/
│       │   ├── providers/
│       │   └── prompts/
│       ├── dao/
│       ├── models/
│       ├── middlewares/
│       ├── schemas/
│       ├── utils/
│       └── profiles/
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── styles/
└── n8n/                         # Solo si se acuerda la Fase 6
    └── workflows/
```

Los directorios y archivos futuros se crearán en su fase, no por adelantado.

## Dependencias previstas y motivo

| Ámbito     | Paquetes                                                                            | Motivo                                       | Fase |
| ---------- | ----------------------------------------------------------------------------------- | -------------------------------------------- | ---- |
| Backend    | express, zod, dotenv                                                                | HTTP, validación y entorno                   | 1    |
| Backend    | mongoose                                                                            | Modelos, DAO y conexión MongoDB              | 1–2  |
| Backend    | cors, helmet                                                                        | Origen permitido y cabeceras de seguridad    | 1    |
| Backend    | cheerio                                                                             | Extraer texto visible de la página principal | 3    |
| Backend    | express-rate-limit                                                                  | Limitar operaciones que consumen IA          | 3    |
| Frontend   | react, react-dom                                                                    | Interfaz y componentes                       | 1    |
| Frontend   | leaflet                                                                             | Mapa con atribución OSM                      | 4    |
| Desarrollo | vite, @vitejs/plugin-react                                                          | Desarrollo y compilación frontend            | 1    |
| Desarrollo | concurrently                                                                        | Arrancar ambos workspaces                    | 1    |
| Calidad    | eslint, @eslint/js, globals, eslint-plugin-react-hooks, eslint-plugin-react-refresh | Reglas JS y React                            | 1    |
| Calidad    | prettier                                                                            | Formato uniforme                             | 1    |
| Pruebas    | vitest, supertest                                                                   | Tests con mocks y pruebas HTTP               | 1    |

Se usarán `fetch` nativo y utilidades de Node para HTTP, reintentos y cola, sin SDK de IA ni biblioteca adicional de colas. Las versiones y compatibilidad se verificarán al instalar cada fase y se conservarán en el lockfile.

## Decisiones y detalles a concretar

- CSS propio: reduce herramientas y facilita explicar el diseño en clase.
- Rutas → controladores → servicios → DAO → modelos. Mongoose solo en modelos, DAO y conexión de infraestructura.
- Localidad o pareja completa de coordenadas; radio por defecto 30 km, permitido de 1 a 100. Se rechazará una entrada ambigua con ambas modalidades.
- El contrato de análisis admitirá `null` en valoraciones booleanas cuando falte evidencia; el ejemplo con `false` no debe convertir desconocimiento en una negación. La UI distinguirá sí, no y desconocido.
- Guardar el análisis original separado de los campos editados y sus marcas manuales. Reanalizar no debe borrar correcciones del profesorado.
- Cola en memoria para una instancia local, progreso persistido y recuperación explícita de trabajos interrumpidos. Documentar que no coordina varias instancias.
- Las claves y modelos se configurarán al llegar a IA. Verificar entonces documentación oficial y acceso gratuito sin tarjeta; no asumir disponibilidad permanente de un modelo o plan.
- Datos del centro y docente opcionales: usar marcadores si faltan. No se necesitan para comenzar.
- n8n queda pendiente de decisión en su fase; no bloquea el resto.

## Comprobación de la Fase 0

Revisión documental de alcance, estructura, dependencias y convenciones. No se realizan llamadas externas ni se instalan paquetes. Los resultados históricos de Fase 1 no se presentan como checks ejecutados en esta fase.
