import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const archivoEntorno = new URL('../backend/.env', import.meta.url);
const contenido = await readFile(archivoEntorno, 'utf8');
const configuracion = dotenv.parse(contenido);
const token = configuracion.ORCHESTRATOR_TOKEN || '';
if (token.length < 32)
  throw new Error(
    'Ejecuta primero npm run docker:prepare para generar el token.',
  );

function docker(argumentos, entrada) {
  const resultado = spawnSync('docker', ['compose', ...argumentos], {
    cwd: raiz,
    input: entrada,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 120000,
    maxBuffer: 2 * 1024 * 1024,
  });
  // El secreto viaja por stdin, nunca por argumentos ni mensajes de diagnóstico.
  const salida =
    `${resultado.stdout || ''}${resultado.stderr || ''}`.replaceAll(
      token,
      '[TOKEN OCULTO]',
    );
  if (resultado.error || resultado.status !== 0) {
    throw new Error(
      `Docker no pudo completar la reparación.\n${salida.slice(-3000)}`,
    );
  }
  return salida;
}

// Comprobar acceso antes de modificar el entorno o los datos de n8n.
docker(['exec', '-T', 'n8n', 'node', '-e', 'process.exit(0)']);
console.log(
  'Configurando n8n. Se conservará una copia del workflow anterior en su volumen.',
);
const programa = `
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const token = ${JSON.stringify(token)};
const directorio = fs.mkdtempSync(path.join(os.tmpdir(), 'prospectorai-'));
fs.chmodSync(directorio, 0o700);
function ejecutar(args, obligatorio = true) {
  const r = spawnSync('n8n', args, {encoding:'utf8', timeout:90000, maxBuffer:2*1024*1024});
  const salida = ((r.stdout || '') + (r.stderr || '')).replaceAll(token, '[TOKEN OCULTO]');
  if (r.error || r.status !== 0 || /An error occurred|SQLITE_CONSTRAINT|Error updating database|Error publishing/i.test(salida)) {
    if (!obligatorio) return false;
    throw new Error(salida.slice(-2000) || 'Falló el comando de n8n.');
  }
  return true;
}
try {
  const actual = path.join(directorio, 'actual.json');
  ejecutar(['export:workflow','--id=ProspectorAISearch01','--output='+actual], false);
  let workflow;
  if (fs.existsSync(actual)) {
    const datos = JSON.parse(fs.readFileSync(actual,'utf8'));
    workflow = Array.isArray(datos) ? datos[0] : datos;
    if (workflow) {
      const copias = '/home/node/.n8n/prospectorai-backups';
      fs.mkdirSync(copias, {recursive:true, mode:0o700});
      fs.copyFileSync(actual, path.join(copias, 'workflow-'+Date.now()+'.json'));
    }
  }
  workflow ||= JSON.parse(fs.readFileSync('/workflows/buscar-empresas.json','utf8'));
  const credencialId = 'ProspectorAIAuth01';
  const nombre = 'ProspectorAI backend (gestionada)';
  for (const nombreNodo of ['Buscar empresas','Preparar candidatas','Analizar empresa']) {
    const nodo = workflow.nodes.find(n => n.name === nombreNodo);
    if (!nodo) throw new Error('Falta el nodo '+nombreNodo+'. Se conserva el workflow sin importar cambios.');
    nodo.credentials = {...nodo.credentials, httpHeaderAuth:{id:credencialId,name:nombre}};
    if (nombreNodo === 'Buscar empresas') {
      // Sin webhookId n8n prefija la ruta con workflowId y nombre del nodo.
      nodo.webhookId ||= randomUUID();
      nodo.disabled = false;
      nodo.parameters.authentication = 'headerAuth';
      nodo.parameters.httpMethod = 'POST';
      nodo.parameters.path = 'buscar-empresas';
      nodo.parameters.responseMode = 'onReceived';
    } else {
      nodo.parameters.authentication = 'genericCredentialType';
      nodo.parameters.genericAuthType = 'httpHeaderAuth';
    }
  }
  const preparar = workflow.nodes.find(n => n.name === 'Preparar candidatas');
  preparar.parameters.url = 'http://backend:3001/api/orchestration/prepare';
  const analizar = workflow.nodes.find(n => n.name === 'Analizar empresa');
  analizar.parameters.url = '=http://backend:3001/api/orchestration/searches/{{ $json.searchId }}/companies/{{ $json.empresas.id }}/analyze';
  workflow.id = 'ProspectorAISearch01';
  workflow.active = false;
  workflow.activeVersionId = null;
  workflow.versionId = randomUUID();
  const credenciales = path.join(directorio,'credencial.json');
  const archivoWorkflow = path.join(directorio,'workflow.json');
  fs.writeFileSync(credenciales, JSON.stringify([{id:credencialId,name:nombre,type:'httpHeaderAuth',data:{name:'X-Orchestrator-Token',value:token}}]),{mode:0o600});
  fs.writeFileSync(archivoWorkflow,JSON.stringify(workflow),{mode:0o600});
  ejecutar(['import:credentials','--input='+credenciales]);
  ejecutar(['import:workflow','--input='+archivoWorkflow]);
  ejecutar(['publish:workflow','--id=ProspectorAISearch01']);
  const publicado = path.join(directorio,'publicado.json');
  ejecutar(['export:workflow','--id=ProspectorAISearch01','--output='+publicado]);
  const exportado = JSON.parse(fs.readFileSync(publicado,'utf8'));
  const comprobado = Array.isArray(exportado) ? exportado[0] : exportado;
  if (!comprobado?.active || !comprobado.activeVersionId) {
    throw new Error('n8n no confirmó la publicación en su base de datos. Revisa la salida de publish:workflow y sus logs.');
  }
  console.log('Credencial asignada y publicación confirmada en la base de datos.');
} finally {
  fs.rmSync(directorio,{recursive:true,force:true});
}
`;
console.log(
  docker(['exec', '-T', 'n8n', 'node', '--input-type=module'], programa).trim(),
);
const actualizado = /^ORCHESTRATOR=/m.test(contenido)
  ? contenido.replace(/^ORCHESTRATOR=.*$/m, 'ORCHESTRATOR=n8n')
  : `${contenido.trimEnd()}\nORCHESTRATOR=n8n\n`;
await writeFile(archivoEntorno, actualizado, { mode: 0o600 });
// restart no recarga variables de Compose; recrear conserva el volumen de n8n.
docker(['up', '-d', '--force-recreate', 'n8n']);
docker(['up', '-d', 'backend']);
console.log('Esperando a n8n y al backend…');

async function esperarServicio(url) {
  const limite = Date.now() + 120000;
  while (Date.now() < limite) {
    try {
      const respuesta = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (respuesta.ok) return;
    } catch {
      /* El contenedor puede seguir arrancando. */
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(
    'El servicio no está disponible: ' +
      url +
      '. Consulta docker compose logs --tail 80.',
  );
}
await esperarServicio('http://127.0.0.1:5678/healthz');
await esperarServicio('http://127.0.0.1:3001/api/health');

// Health 200 no demuestra que n8n haya podido registrar los webhooks.
// Sin credencial, un webhook Header Auth registrado responde 401/403 sin ejecutar nada.
console.log('Comprobando el registro del webhook de producción…');
const limiteRegistro = Date.now() + 120000;
let webhookRegistrado = false;
let ultimoCodigo;
let siguienteAviso = Date.now();
while (Date.now() < limiteRegistro) {
  try {
    const prueba = await fetch(
      'http://127.0.0.1:5678/webhook/buscar-empresas',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(5000),
        redirect: 'manual',
      },
    );
    ultimoCodigo = prueba.status;
    if (Date.now() >= siguienteAviso) {
      console.log(
        'Webhook HTTP ' +
          prueba.status +
          '; esperando registro (máximo 120 segundos)…',
      );
      siguienteAviso = Date.now() + 10000;
    }
    if ([401, 403].includes(prueba.status)) {
      webhookRegistrado = true;
      break;
    }
    if (prueba.ok)
      throw new Error(
        'El webhook acepta peticiones sin credencial. Revisa Header Auth antes de continuar.',
      );
  } catch (error) {
    if (error.message.includes('sin credencial')) throw error;
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
if (!webhookRegistrado) {
  console.error(
    'n8n no registró el webhook. HTTP: ' + (ultimoCodigo || 'sin respuesta'),
  );
  console.error(docker(['logs', '--tail', '80', 'n8n']).trim());
  throw new Error(
    'No se crea otra búsqueda hasta resolver el registro del webhook. Consulta los logs anteriores.',
  );
}
console.log('Webhook registrado y protegido con autenticación.');

// Una búsqueda real sin IA comprueba backend → webhook → preparación → MongoDB.
// Una única consulta OSM pequeña; no modifica contactos ni envía correos.
const respuesta = await fetch('http://127.0.0.1:3001/api/searches', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lat: 38.635,
    lon: -0.866,
    radioKm: 1,
    perfil: 'daw',
    analizar: false,
  }),
  signal: AbortSignal.timeout(15000),
});
const inicio = await respuesta.json();
if (!respuesta.ok)
  throw new Error(
    inicio.error?.message || 'No se pudo iniciar la búsqueda de prueba.',
  );
console.log(
  'Prueba iniciada: ' + inicio.searchId + ' (Villena, 1 km, sin IA).',
);
const limite = Date.now() + 240000;
let ultimoEstado;
while (Date.now() < limite) {
  const consulta = await fetch(
    'http://127.0.0.1:3001/api/searches/' + inicio.searchId,
    { signal: AbortSignal.timeout(10000) },
  );
  const job = await consulta.json();
  if (!consulta.ok)
    throw new Error(job.error?.message || 'No se puede consultar el job.');
  if (job.estado !== ultimoEstado) {
    console.log('Estado: ' + job.estado);
    ultimoEstado = job.estado;
  }
  if (job.estado === 'completada') {
    console.log(
      'Integración correcta. Candidatas: ' +
        job.totalCandidatas +
        '. Ya puedes buscar desde la aplicación.',
    );
    process.exit(0);
  }
  if (['error', 'interrumpida'].includes(job.estado))
    throw new Error(job.error?.message || 'La prueba no se completó.');
  await new Promise((resolve) => setTimeout(resolve, 2500));
}
throw new Error(
  'La prueba sigue pendiente. Consulta su id en la aplicación y las ejecuciones de n8n.',
);
