import { solicitarIA } from './client.js';
import { AppError } from '../utils/AppError.js';

export function crearGeminiProvider({
  apiKey,
  model,
  solicitar = solicitarIA,
}) {
  return {
    async generateJSON(systemPrompt, userPrompt) {
      const id = model.replace(/^models\//, '');
      const response = await solicitar(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(id)}:generateContent`,
        { 'x-goog-api-key': apiKey },
        {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 2500,
          },
        },
      );
      const texto = response.candidates?.[0]?.content?.parts
        ?.filter((part) => !part.thought && typeof part.text === 'string')
        .map((part) => part.text)
        .join('');
      if (!texto)
        throw new AppError(
          502,
          'AI_EMPTY_RESPONSE',
          'La IA no ha devuelto texto analizable.',
        );
      return texto;
    },
  };
}
