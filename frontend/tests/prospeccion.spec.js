import { expect, test } from '@playwright/test';

const id = '0123456789abcdef01234567';
const empresa = {
  _id: id,
  nombre: 'Empresa de prueba UI',
  perfil: 'daw',
  ubicacion: { direccion: 'Villena', lat: 38.635, lon: -0.866 },
  web: 'https://example.org',
  tecnologias: [],
  interesDAW: null,
  puntuacion: null,
  posibleTeletrabajo: null,
  analisisEstado: 'pendiente',
  estadoContacto: 'Pendiente',
  edicionesManuales: {},
};
test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:5173/api/**', (route) =>
    route.fulfill({
      status: 404,
      json: { error: { message: 'Ruta no simulada en esta prueba.' } },
    }),
  );
  await page.route('**/api/stats?*', (route) =>
    route.fulfill({
      json: {
        total: 1,
        porInteres: [{ interes: null, total: 1 }],
        porEstadoContacto: [{ estado: 'Pendiente', total: 1 }],
        porAnalisis: [],
        tecnologias: [],
      },
    }),
  );
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.route('**/api/health', (route) =>
    route.fulfill({ json: { status: 'ok', database: 'conectada' } }),
  );
  await page.route('**/api/companies?*', (route) =>
    route.fulfill({
      json: { empresas: [empresa], total: 1, pagina: 1, limite: 12 },
    }),
  );
  await page.route(`**/api/companies/${id}`, (route) =>
    route.fulfill({
      json:
        route.request().method() === 'PATCH'
          ? {
              ...empresa,
              ...route.request().postDataJSON(),
              edicionesManuales: { puntuacion: new Date().toISOString() },
            }
          : empresa,
    }),
  );
});

test('bienvenida, búsqueda, polling y resultados sin APIs reales', async ({
  page,
}) => {
  let consultas = 0;
  await page.route('**/api/searches', (route) =>
    route.fulfill({ status: 202, json: { searchId: id } }),
  );
  await page.route(`**/api/searches/${id}`, (route) => {
    consultas++;
    return route.fulfill({
      json: {
        _id: id,
        tipo: 'busqueda',
        estado: consultas <= 2 ? 'analizando' : 'completada',
        parametros: { localidad: 'Villena, Alicante', radioKm: 30 },
        centro: { lat: 38.635, lon: -0.866, nombre: 'Villena, Alicante' },
        totalCandidatas: 1,
        total: 1,
        procesadas: consultas <= 2 ? 0 : 1,
        errores: 0,
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Comenzar Prospección' }).click();
  await expect(
    page.getByRole('heading', { name: '¿Dónde buscamos?' }),
  ).toBeVisible();
  await expect(page.getByLabel('Localidad y provincia')).toHaveValue(
    'Villena, Alicante',
  );
  await page
    .getByRole('button', { name: 'Buscar Empresas Candidatas' })
    .click();
  await expect(page.getByText('Analizando 1 de 1…')).toBeVisible();
  await page.getByRole('button', { name: 'Ver resultados' }).click();
  await expect(
    page.getByRole('heading', { name: 'Tu red de empresas.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: empresa.nombre }),
  ).toBeVisible();
});

test('filtros, mapa y guardado marcan solo los campos modificados', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ver empresas guardadas' }).click();
  await page
    .getByRole('combobox', { name: 'Interés DAW', exact: true })
    .selectOption('desconocido');
  const peticionFiltro = page.waitForRequest(
    (request) =>
      request.url().includes('/api/companies?') &&
      request.url().includes('interesDAW=desconocido'),
  );
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await peticionFiltro;
  await page.getByRole('button', { name: 'Mapa', exact: true }).click();
  await expect(
    page.getByLabel('Mapa de las empresas de la página actual'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tarjetas', exact: true }).click();
  await page.getByRole('button', { name: 'Ver detalle' }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();
  await dialogo.getByLabel('Puntuación / 100').fill('75');
  const guardado = page.waitForRequest(
    (request) => request.method() === 'PATCH',
  );
  await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
  expect((await guardado).postDataJSON()).toEqual({ puntuacion: 75 });
  await expect(
    dialogo.getByText('Cambios guardados.', { exact: false }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialogo).not.toBeVisible();
});

test('muestra error recuperable y vacío, sin conservar empresas de un filtro anterior', async ({
  page,
}) => {
  await page.route('**/api/companies?*', (route) =>
    route.fulfill({
      status: 500,
      json: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error de prueba controlado.',
        },
      },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Ver empresas guardadas' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Error de prueba controlado.',
  );
  await page.route('**/api/companies?*', (route) =>
    route.fulfill({ json: { empresas: [], total: 0 } }),
  );
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No hay empresas en esta selección' }),
  ).toBeVisible();
});

test('móvil sin desbordamiento horizontal y formulario por coordenadas', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Comenzar Prospección' }).click();
  await page.getByRole('button', { name: 'Coordenadas', exact: true }).click();
  await expect(page.getByLabel('Latitud', { exact: true })).toHaveValue(
    '38.635',
  );
  await expect(page.getByLabel('Longitud', { exact: true })).toHaveValue(
    '-0.866',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('edita el borrador y registra contacto solo por acción explícita', async ({
  page,
}) => {
  let actual = {
    ...empresa,
    email: 'empresa@example.org',
    borradorVersion: 1,
    borradorEmail: {
      asunto: 'Propuesta FCT',
      cuerpo: 'Texto revisable de prueba.',
      edicionManual: false,
    },
    historialContacto: [],
  };
  const peticionesContacto = [];
  await page.route(`**/api/companies/${id}`, (route) =>
    route.fulfill({ json: actual }),
  );
  await page.route(`**/api/companies/${id}/email-draft`, (route) => {
    const datos = route.request().postDataJSON();
    expect(datos.version).toBe(1);
    actual = {
      ...actual,
      borradorVersion: 2,
      borradorEmail: { ...datos, edicionManual: true },
    };
    return route.fulfill({ json: actual });
  });
  await page.route(`**/api/companies/${id}/contact-status`, (route) => {
    const datos = route.request().postDataJSON();
    peticionesContacto.push(datos);
    actual = {
      ...actual,
      estadoContacto: datos.estado,
      historialContacto: [{ ...datos, fecha: new Date().toISOString() }],
    };
    return route.fulfill({ json: actual });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ver empresas guardadas' }).click();
  await page.getByRole('button', { name: 'Ver detalle' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByRole('button', { name: 'Contacto', exact: true }).click();
  await dialogo
    .getByLabel('Asunto', { exact: true })
    .fill('Propuesta revisada');
  await dialogo
    .getByRole('button', { name: 'Guardar borrador', exact: true })
    .click();
  await expect(
    dialogo.getByText(
      'Borrador guardado como edición manual. No se ha enviado.',
    ),
  ).toBeVisible();
  const enlace = dialogo.getByRole('link', { name: 'Abrir en mi correo' });
  await expect(enlace).toHaveAttribute(
    'href',
    /mailto:empresa%40example.org\?subject=Propuesta%20revisada/,
  );
  expect(peticionesContacto).toHaveLength(0);
  await dialogo
    .getByLabel('Nota del seguimiento')
    .fill('Contacto realizado manualmente.');
  await dialogo.getByRole('button', { name: 'Marcar como Contactada' }).click();
  await expect(
    dialogo.getByText('Estado actualizado: Contactada.'),
  ).toBeVisible();
  expect(peticionesContacto).toEqual([
    { estado: 'Contactada', nota: 'Contacto realizado manualmente.' },
  ]);
  await expect(
    dialogo.getByText('Contacto realizado manualmente.', { exact: true }),
  ).toBeVisible();
});
