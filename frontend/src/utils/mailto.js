export function crearMailto(destinatario, asunto, cuerpo) {
  const email = destinatario.trim();
  if (email && !/^[^\s@<>;,?&#]+@[^\s@<>;,?&#]+\.[^\s@<>;,?&#]+$/.test(email))
    return null;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
