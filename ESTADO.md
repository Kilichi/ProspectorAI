# Estado de ProspectorAI

## Fase actual

**Fase 6 implementada; pendiente de validación real con Docker/n8n. Fase 7 de documentación y entrega preparada.** El usuario autorizó continuar entre fases e incluir n8n y toda la aplicación en Docker.

| Fase                                          | Estado                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| 0 — Plan y convenciones                       | Completada                                                                 |
| 1 — Esqueleto Express/React/MongoDB           | Completada                                                                 |
| 2 — Localización, normalización y DAO         | Completada                                                                 |
| 3 — IA, extracción web, cola y jobs           | Completada                                                                 |
| 4 — Dashboard, filtros, mapa y edición        | Completada                                                                 |
| 5 — Correo revisable, contacto y estadísticas | Completada                                                                 |
| 6 — Docker completo y n8n                     | Código/configuración implementados; arranque e integración real pendientes |
| 7 — Entrega                                   | README español, arquitectura, guía y limpieza preparados                   |

## Verificaciones realizadas

- 143 tests backend con Vitest/Supertest y mocks: sin APIs externas. Orquestador de tests aislado del `.env` local.
- Lanzadores macOS con sintaxis Bash comprobada y prueba con Docker simulado: rutas con espacios, arranque repetido, claves conservadas y parada sin borrar volúmenes. Arranque real en macOS pendiente.
- Publicación preparada para `Kilichi/ProspectorAI` mediante `scripts/publish-github.ps1`. Esta sesión no puede escribir en `.git`; no se ha realizado commit ni push.
- Perfil OSM reducido a informática/software y criterio IA de desarrollo reforzado; lista en `ETIQUETAS_DESARROLLO.md`. No se borraron ni reanalizaron empresas existentes.
- 5 pruebas Playwright con Chrome y APIs simuladas: bienvenida/búsqueda/polling, filtros/mapa/edición, errores/vacío, móvil y edición de correo/contacto explícito.
- ESLint y compilación Vite correctos. Formato comprobado con Prettier.
- `npm run docker:check`: Compose válido; no imprime secretos.
- `npm run clean -- --dry-run`: destinos verificados, sin borrar dependencias.
- Auditoría de dependencias de producción: cero vulnerabilidades reportadas en la comprobación.
- Backend real en modo npm: health 200 y estadísticas MongoDB de 128 candidatas reales. Se conserva su historial; no se introdujeron empresas demo.
- Groq: análisis real comprobado anteriormente y generación real de un borrador guardado en MongoDB. El job terminó completado, sin errores, versión 1, contacto todavía Pendiente. No se envió ningún correo.
- Gemini: proveedor comprobado con mocks, sin llamada real en esta entrega.
- Workflow JSON revisado contra documentación/código oficial de n8n y estructura comprobada por tests. No equivale a haberlo ejecutado en n8n.

## Pendiente por acceso al entorno

Diagnóstico confirmado después de activar correctamente el workflow: faltaba `webhookId` en el nodo exportado. n8n registraba la ruta prefijada `/webhook/ProspectorAISearch01/buscar%2520empresas/buscar-empresas`, que respondió 403 sin credencial, mientras `/webhook/buscar-empresas` devolvía 404. Se añadió `webhookId` al JSON y a la migración del workflow existente en la reparación. La prueba de regresión exige ese campo y la espera muestra progreso. Falta ejecutar esta última reparación con acceso a Docker.

Los logs aportados por el usuario reconocen un workflow publicado pero no su webhook. Se revisó el código oficial: `publish:workflow` modifica la base y el arranque nuevo consume el outbox. Se configura `N8N_USE_WORKFLOW_PUBLICATION_SERVICE=false` para registrar al arrancar mediante ActiveWorkflowManager y la reparación recrea n8n para aplicar el entorno, conserva el volumen y comprueba el webhook antes de iniciar la prueba. Esta corrección aún debe ejecutarse desde la terminal del usuario con acceso a Docker.

El usuario ha construido las imágenes e iniciado Docker desde su terminal. Se corrigió el identificador raíz del JSON para el importador CLI. La comprobación HTTP directa confirma n8n health 200, pero el webhook POST devuelve 404 (no registrado); su API administrativa devuelve 401 sin una sesión autenticada. Se añadió `npm run n8n:repair` para respaldar, asignar la credencial, publicar, reiniciar y probar desde una terminal con acceso a Docker. El script se revisó con ESLint y su ejecución en esta sesión sigue bloqueada por el acceso al motor; no se presenta como una reparación ya ejecutada.

La sesión devuelve acceso denegado a `npipe:////./pipe/docker_engine` y al archivo de configuración Docker del usuario. Por ello no se han construido las imágenes ni arrancado los cuatro contenedores desde esta sesión.

Desde una terminal con Docker Desktop abierto:

```powershell
# Detener primero npm run dev con Ctrl+C si sigue activo.
npm run docker:up
docker compose ps
```

Después abre <http://localhost:5173> y <http://localhost:5678>. En n8n crea la cuenta local, la credencial Header Auth con el token de `backend/.env`, importa el workflow, selecciona la credencial en sus tres nodos y publícalo. Cambia a `ORCHESTRATOR=n8n`, recrea backend con `npm run docker:up` y prueba una búsqueda. El procedimiento detallado está en README.md.

El modo `ORCHESTRATOR=backend` funciona sin publicar workflows. Las claves existentes se conservan; se añadió un token aleatorio de orquestación sin mostrarlo. No hace falta proporcionar más API keys.
