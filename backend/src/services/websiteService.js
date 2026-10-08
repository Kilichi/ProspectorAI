import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { load } from 'cheerio';
import ipaddr from 'ipaddr.js';
import { env } from '../config/env.js';

const MAX_BYTES = 512 * 1024;
const fallar = (code) => Object.assign(new Error(code), { code });

export function direccionPublica(direccion) {
  try {
    return ipaddr.process(direccion).range() === 'unicast';
  } catch {
    return false;
  }
}

export async function validarDestino(valor, resolver = lookup) {
  let url;
  try {
    url = new URL(valor);
  } catch {
    throw fallar('WEB_INVALID_URL');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !['80', '443'].includes(url.port))
  )
    throw fallar('WEB_BLOCKED_URL');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  )
    throw fallar('WEB_PRIVATE_DESTINATION');
  const direcciones = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await resolver(host, { all: true, verbatim: true });
  if (
    !direcciones.length ||
    direcciones.some(({ address }) => !direccionPublica(address))
  )
    throw fallar('WEB_PRIVATE_DESTINATION');
  return { url, direccion: direcciones[0] };
}

export function extraerTexto(html) {
  const $ = load(html);
  $(
    'script, style, noscript, template, svg, nav, footer, form, [hidden], [aria-hidden="true"], [style*="display:none"], [style*="display: none"]',
  ).remove();
  // Separar bloques evita unir palabras al eliminar etiquetas.
  $('p, div, section, article, h1, h2, h3, li, br').append(' ');
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000);
}

export function descargarHtml({ url, direccion }, signal) {
  return new Promise((resolve, reject) => {
    const transporte = url.protocol === 'https:' ? https : http;
    const peticion = transporte.request(
      url,
      {
        method: 'GET',
        agent: false,
        signal,
        autoSelectFamily: false,
        // Fijar la IP ya validada impide que una segunda resolución haga DNS rebinding.
        lookup: (host, opciones, callback) =>
          callback(null, direccion.address, direccion.family),
        headers: {
          'User-Agent': env.HTTP_USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Encoding': 'identity',
        },
      },
      (response) => {
        response.on('error', reject);
        const status = response.statusCode;
        if ([301, 302, 303, 307, 308].includes(status)) {
          resolve({ redireccion: response.headers.location });
          response.destroy();
          return;
        }
        if (
          status !== 200 ||
          !/^(text\/html|application\/xhtml\+xml)(;|$)/i.test(
            response.headers['content-type'] || '',
          ) ||
          (response.headers['content-encoding'] &&
            response.headers['content-encoding'] !== 'identity')
        ) {
          reject(fallar('WEB_UNSUPPORTED_RESPONSE'));
          response.destroy();
          return;
        }
        if (Number(response.headers['content-length']) > MAX_BYTES) {
          reject(fallar('WEB_TOO_LARGE'));
          response.destroy();
          return;
        }
        let bytes = 0;
        const partes = [];
        response.on('data', (parte) => {
          bytes += parte.length;
          if (bytes > MAX_BYTES) {
            reject(fallar('WEB_TOO_LARGE'));
            response.destroy();
          } else partes.push(parte);
        });
        response.on('end', () =>
          resolve({ html: Buffer.concat(partes).toString('utf8') }),
        );
        response.on('aborted', () => reject(fallar('WEB_INCOMPLETE_RESPONSE')));
      },
    );
    peticion.on('error', reject);
    peticion.end();
  });
}

export async function obtenerTextoWeb(
  web,
  { resolver = lookup, descargar = descargarHtml, timeoutMs = 8000 } = {},
) {
  if (!web)
    return {
      texto: '',
      estado: 'sin_web',
      motivo: 'WEB_NOT_PROVIDED',
      url: null,
    };
  const signal = AbortSignal.timeout(timeoutMs);
  const tarea = async () => {
    const inicial = await validarDestino(web, resolver);
    // Solo la página principal, sin rastrear rutas, consultas o enlaces internos.
    let url = new URL('/', inicial.url).href;
    for (let salto = 0; salto <= 2; salto++) {
      signal.throwIfAborted();
      const destino =
        salto === 0
          ? { ...inicial, url: new URL(url) }
          : await validarDestino(url, resolver);
      const result = await descargar(destino, signal);
      signal.throwIfAborted();
      if (Object.hasOwn(result, 'redireccion')) {
        if (!result.redireccion || salto === 2)
          throw fallar('WEB_REDIRECT_LIMIT');
        const siguiente = new URL(result.redireccion, url);
        if (
          destino.url.protocol === 'https:' &&
          siguiente.protocol !== 'https:'
        )
          throw fallar('WEB_UNSAFE_REDIRECT');
        url = siguiente.href;
        continue;
      }
      if (
        typeof result.html !== 'string' ||
        Buffer.byteLength(result.html) > MAX_BYTES
      )
        throw fallar('WEB_TOO_LARGE');
      const texto = extraerTexto(result.html);
      return {
        texto,
        estado: texto ? 'obtenida' : 'vacia',
        motivo: texto ? null : 'WEB_EMPTY_TEXT',
        url,
      };
    }
  };
  let abortar;
  try {
    // La resolución DNS también cuenta dentro del plazo global de ocho segundos.
    const limite = new Promise((resolve, reject) => {
      abortar = () => reject(fallar('WEB_TIMEOUT'));
      signal.addEventListener('abort', abortar, { once: true });
    });
    return await Promise.race([tarea(), limite]);
  } catch (error) {
    const permitidos = [
      'WEB_INVALID_URL',
      'WEB_BLOCKED_URL',
      'WEB_PRIVATE_DESTINATION',
      'WEB_UNSUPPORTED_RESPONSE',
      'WEB_TOO_LARGE',
      'WEB_INCOMPLETE_RESPONSE',
      'WEB_REDIRECT_LIMIT',
      'WEB_UNSAFE_REDIRECT',
      'WEB_TIMEOUT',
    ];
    return {
      texto: '',
      estado: 'error',
      motivo: signal.aborted
        ? 'WEB_TIMEOUT'
        : permitidos.includes(error.code)
          ? error.code
          : 'WEB_DOWNLOAD_FAILED',
      url: null,
    };
  } finally {
    signal.removeEventListener('abort', abortar);
  }
}
