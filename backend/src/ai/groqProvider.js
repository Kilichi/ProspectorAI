import { solicitarIA } from './client.js';
import { AppError } from '../utils/AppError.js';

export function crearGroqProvider({ apiKey, model, solicitar = solicitarIA }) {
  return {
    async generateJSON(systemPrompt, userPrompt) {
      const response = await solicitar(
        'https://api.groq.com/openai/v1/chat/completions',
        { Authorization: `Bearer ${apiKey}` },
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          max_completion_tokens: 2500,
        },
      );
      const texto = response.choices?.[0]?.message?.content;
      if (typeof texto !== 'string')
        throw new AppError(
          502,
          'AI_EMPTY_RESPONSE',
          'La IA no ha devuelto texto analizable.',
        );
      return texto;
    },
  };
}
