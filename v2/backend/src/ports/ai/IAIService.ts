/**
 * AI Service Interface (Port)
 * 
 * Definiert Interface für AI-Integration (Ollama oder Fallback)
 */
export interface AIGenerateRequest {
  prompt: string;
  systemPrompt?: string;
  context?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIGenerateResponse {
  response: string;
  done: boolean;
}

export interface IAIService {
  /**
   * Generiert AI-Response (Non-Streaming)
   */
  generate(request: AIGenerateRequest): Promise<AIGenerateResponse>;
  
  /**
   * Generiert AI-Response (Streaming)
   */
  generateStream(request: AIGenerateRequest): Promise<ReadableStream<string>>;
}

