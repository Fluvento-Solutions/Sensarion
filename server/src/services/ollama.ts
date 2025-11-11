import { env } from '../config/env';

type OllamaGenerateRequest = {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: Record<string, unknown>;
};

type OllamaGenerateResponse = {
  response: string;
  done: boolean;
  [key: string]: unknown;
};

export const generateWithOllama = async (
  payload: OllamaGenerateRequest
): Promise<OllamaGenerateResponse> => {
  try {
  const response = await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      stream: false,
      ...payload
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error: ${response.status} ${response.statusText} - ${text}`);
  }

    const data = (await response.json()) as OllamaGenerateResponse;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Ollama nicht erreichbar (${env.OLLAMA_BASE_URL}). Prüfe den lokalen Ollama-Dienst: ${error.message}`
      );
    }

    throw new Error('Unbekannter Fehler beim Zugriff auf Ollama.');
  }
};

