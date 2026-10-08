# Selección de empresas de desarrollo — DAW y DAM

El objetivo es encontrar empresas que programan aplicaciones. Las palabras de
esta lista sirven para interpretar evidencia de actividad; no son etiquetas OSM
inventadas ni tecnologías que puedan atribuirse automáticamente a una empresa.

## Etiquetas utilizadas en la consulta OSM

| Etiqueta                       | Uso y limitación                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `office=it`                    | Oficinas informáticas. También puede incluir hardware o soporte; requiere comprobar desarrollo.               |
| `company=software_development` | Variante existente relacionada con desarrollo de software.                                                    |
| `company=software`             | Variante existente de empresa de software. Puede tratarse de comercialización; requiere comprobar desarrollo. |
| `consulting=software`          | Consultoría de software. No garantiza programación propia.                                                    |

La [documentación de office=it](https://wiki.openstreetmap.org/wiki/Tag:office%3Dit)
describe su alcance y `consulting=software`, y recoge las variantes `company=software`
y `company=software_development` como posibles errores de etiquetado. Se consultan
para recuperar candidatas ya existentes, sin recomendarlas para editar OSM.

Se eliminan los selectores generales `office=company`, `office=consulting`,
`office=estate_agent`, `office=advertising_agency`, `office=telecommunication`,
`shop=computer`, `shop=electronics`, `craft=*` e `industrial=*`. Una tienda, agencia
o industria podría desarrollar software, pero su categoría genérica no lo acredita.

## Actividades que sí interesa buscar en la evidencia

| Área                 | Expresiones en español e inglés                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Desarrollo web       | desarrollo web, aplicaciones web, programación web, web development, web applications                        |
| Frontend             | frontend, interfaces web, aplicaciones SPA, aplicaciones PWA, frontend development                           |
| Backend              | backend, lógica de servidor, servicios web, backend development                                              |
| Aplicaciones móviles | desarrollo de apps, aplicaciones móviles, Android, iOS, mobile app development                               |
| Multiplataforma      | aplicaciones multiplataforma, aplicaciones híbridas, cross-platform development                              |
| Software a medida    | software a medida, programación a medida, custom software, bespoke software                                  |
| Productos propios    | desarrollo de producto software, plataforma SaaS, software product development                               |
| APIs e integraciones | desarrollo de APIs, integración de sistemas mediante programación, API development                           |
| Software empresarial | desarrollo o personalización programada de ERP/CRM, módulos propios, business software                       |
| Comercio electrónico | desarrollo de tiendas online, módulos y pasarelas a medida, e-commerce development                           |
| Calidad de software  | pruebas automatizadas de aplicaciones, QA automation, software testing; valorar su relación con programación |
| Automatización       | scripts, automatización mediante código, integración continua; exigir evidencia de desarrollo                |

Estas expresiones orientan a la IA. No se hace un filtro automático por palabras:
«no desarrollamos aplicaciones» contiene palabras relevantes pero es evidencia negativa.

## Tecnologías relacionadas, solo cuando constan en la evidencia

- Lenguajes: JavaScript, TypeScript, PHP, Python, Java, C#, Kotlin, Swift, Dart, SQL.
- Web: HTML, CSS, React, Vue, Angular, Svelte, Next.js, Node.js, Express, Laravel,
  Symfony, Django, FastAPI, Spring Boot, ASP.NET Core.
- Móvil y multiplataforma: Flutter, React Native, Ionic, .NET MAUI, Kotlin
  Multiplatform, Electron, Tauri.
- Datos: PostgreSQL, MySQL, MariaDB, MongoDB, Redis.
- Desarrollo y pruebas: Git, Docker, CI/CD, Playwright, Cypress, Selenium,
  JUnit, PHPUnit, Vitest.

La lista no acredita que una empresa use ninguna tecnología. Por ejemplo, vender
equipos con Windows, instalar un ERP o tener una web con JavaScript no demuestra
que la empresa programe. Desarrollar aplicaciones nativas puede ser pertinente
para DAM y requiere justificar su relación con DAW.

## Criterio para recomendar

1. OSM aporta candidatas informáticas dentro del radio, con una consulta por búsqueda.
2. La IA revisa sus datos y, si está disponible, el texto de la página principal.
3. Solo recomienda cuando hay evidencia de desarrollo relacionada con la formación.
   Actividad claramente ajena: `interesDAW=false`. Evidencia insuficiente: `null`.
4. En el dashboard, el filtro **Interés DAW → Con interés** muestra las recomendadas.
   **Todos** permite revisar también candidatas pendientes, desconocidas o descartadas.

No se borran empresas guardadas ni se reanalizan automáticamente. Las búsquedas
nuevas usan el perfil reducido; para actualizar una valoración anterior hay que
solicitar reanálisis. Habrá menos resultados y pueden faltar empresas reales:
OSM es incompleto y la página principal puede no describir todos sus servicios.
