import { systemPromptAnalisis } from '../ai/prompts/analisis.js';
import { validarAnalisis } from '../ai/analysisSchema.js';

export async function generarAnalisis(empresa, textoWeb, proveedor) {
  const evidencia = {
    osm: {
      osmId: empresa.osmId,
      nombre: empresa.nombre,
      direccion: empresa.ubicacion?.direccion || '',
      etiquetas: empresa.infoObtenida?.etiquetasOsm || {},
    },
    textoWeb: textoWeb || null,
  };
  const userPrompt = `Analiza exclusivamente esta evidencia para DAW:\n${JSON.stringify(evidencia)}`;
  let respuesta = await proveedor.generateJSON(
    systemPromptAnalisis,
    userPrompt,
  );
  try {
    return validarAnalisis(respuesta, {
      nombre: empresa.nombre,
      tieneWeb: Boolean(textoWeb),
    });
  } catch {
    // Una única corrección; no se reenvía la salida inválida ni se añaden fuentes.
    respuesta = await proveedor.generateJSON(
      systemPromptAnalisis,
      `${userPrompt}\nCORRECCIÓN: La respuesta anterior no cumplía el esquema o las fuentes. Devuelve el objeto JSON exacto, con el nombre OSM y solo las fuentes disponibles. Usa null para booleanos desconocidos y no inventes datos.`,
    );
    return validarAnalisis(respuesta, {
      nombre: empresa.nombre,
      tieneWeb: Boolean(textoWeb),
    });
  }
}
