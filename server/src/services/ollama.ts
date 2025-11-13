import { env } from '../config/env';

type OllamaGenerateRequest = {
  model: string;
  prompt: string;
  context?: string;
  systemPrompt?: string;
  stream?: boolean;
  options?: Record<string, unknown>;
};

/**
 * Normalisiert Markdown-Überschriften, indem alle Überschriften um eine Ebene nach unten verschoben werden.
 * Dadurch wird sichergestellt, dass ## (h2) die höchste Überschrift ist.
 * 
 * @param text Der zu normalisierende Text
 * @returns Text mit normalisierten Überschriften
 */
const normalizeMarkdownHeadings = (text: string): string => {
  if (!text) return text;
  
  // Ersetzt alle Markdown-Überschriften (#, ##, ###, etc.) um eine Ebene nach unten
  // # wird zu ##, ## wird zu ###, etc.
  return text.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
    // Fügt ein zusätzliches # hinzu
    return `${hashes}# ${content}`;
  });
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
    // Normalisiere Prompt und Kontext (falls vorhanden)
    const normalizedPrompt = normalizeMarkdownHeadings(payload.prompt);
    const normalizedContext = payload.context ? normalizeMarkdownHeadings(payload.context) : null;

    // Systemprompt: Verwende spezifischen Systemprompt oder Standard
    const systemPrompt = payload.systemPrompt || 'du bist eine medizinische Schreibkraft, antwortest immer deutsch, sachlich, respektvoll und höflich.';

    // Baue den finalen Prompt zusammen
    let finalPrompt = `# TASK\n\n${normalizedPrompt}\n\n\n# ROLE\n\n${systemPrompt}`;

    // Füge CONTEXT-Sektion hinzu, falls Kontext vorhanden
    if (normalizedContext) {
      finalPrompt += `\n\n\n# CONTEXT\n\n${normalizedContext}`;
    }

    // Standard-Optionen mit niedriger Temperatur (wichtig für medizinischen Kontext)
    const defaultOptions = {
      temperature: 0.1
    };

    // Merge: payload.options überschreibt Standard-Optionen
    const options = {
      ...defaultOptions,
      ...(payload.options || {})
    };

    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stream: false,
        model: payload.model,
        prompt: finalPrompt,
        options
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

/**
 * Generiert Text mit Ollama im Streaming-Modus
 * Gibt einen ReadableStream zurück, der die Chunks liefert
 */
export const generateWithOllamaStream = async (
  payload: OllamaGenerateRequest
): Promise<ReadableStream<string>> => {
  try {
    // Normalisiere Prompt und Kontext (falls vorhanden)
    const normalizedPrompt = normalizeMarkdownHeadings(payload.prompt);
    const normalizedContext = payload.context ? normalizeMarkdownHeadings(payload.context) : null;

    // Systemprompt: Verwende spezifischen Systemprompt oder Standard
    const systemPrompt = payload.systemPrompt || 'du bist eine medizinische Schreibkraft, antwortest immer deutsch, sachlich, respektvoll und höflich.';

    // Baue den finalen Prompt zusammen
    let finalPrompt = `# TASK\n\n${normalizedPrompt}\n\n\n# ROLE\n\n${systemPrompt}`;

    // Füge CONTEXT-Sektion hinzu, falls Kontext vorhanden
    if (normalizedContext) {
      finalPrompt += `\n\n\n# CONTEXT\n\n${normalizedContext}`;
    }

    // Standard-Optionen mit niedriger Temperatur (wichtig für medizinischen Kontext)
    const defaultOptions = {
      temperature: 0.1
    };

    // Merge: payload.options überschreibt Standard-Optionen
    const options = {
      ...defaultOptions,
      ...(payload.options || {})
    };

    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stream: true,
        model: payload.model,
        prompt: finalPrompt,
        options
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama error: ${response.status} ${response.statusText} - ${text}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Erstelle einen ReadableStream, der die Ollama-Response parst
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;
              
              try {
                const json = JSON.parse(line);
                if (json.response) {
                  controller.enqueue(json.response);
                }
                if (json.done) {
                  controller.close();
                  return;
                }
              } catch (e) {
                // Ignore invalid JSON lines
              }
            }
          }
        } catch (error) {
          controller.error(error);
        }
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Ollama nicht erreichbar (${env.OLLAMA_BASE_URL}). Prüfe den lokalen Ollama-Dienst: ${error.message}`
      );
    }

    throw new Error('Unbekannter Fehler beim Zugriff auf Ollama.');
  }
};

