import { env } from '@/config/env';
import type { IAIService, AIGenerateRequest, AIGenerateResponse } from '@/ports/ai/IAIService';
import { PromptCache } from './Cache';
import { CircuitBreaker } from './CircuitBreaker';

/**
 * OllamaAdapter
 * 
 * Implementiert IAIService für lokale Ollama-Integration
 * 
 * Features:
 * - Streaming Support
 * - Timeouts (15-30s)
 * - Exponential Backoff Retries
 * - Circuit Breaker
 * - Prompt-Template-Caching
 * - Warm-up auf Startup
 */
export class OllamaAdapter implements IAIService {
  constructor(
    private cache: PromptCache = new PromptCache(),
    private circuitBreaker: CircuitBreaker = new CircuitBreaker()
  ) {}
  
  /**
   * Generiert AI-Response (Non-Streaming)
   */
  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    // Check Cache
    const fingerprint = this.cache.generateFingerprint(
      request.prompt,
      request.systemPrompt || '',
      {
        temperature: request.temperature,
        model: request.model
      }
    );
    
    const cached = await this.cache.get(fingerprint);
    if (cached) {
      return { response: cached, done: true };
    }
    
    // Check Circuit Breaker
    if (this.circuitBreaker.isOpen()) {
      throw new Error('AI service unavailable (circuit breaker open)');
    }
    
    // Request with Retry
    const response = await this.requestWithRetry({
      ...request,
      stream: false
    });
    
    // Cache Response
    if (response.response) {
      await this.cache.set(fingerprint, response.response);
    }
    
    return response;
  }
  
  /**
   * Generiert AI-Response (Streaming)
   */
  async generateStream(request: AIGenerateRequest): Promise<ReadableStream<string>> {
    // Check Circuit Breaker
    if (this.circuitBreaker.isOpen()) {
      throw new Error('AI service unavailable (circuit breaker open)');
    }
    
    // Request with Retry
    return this.requestWithRetry({
      ...request,
      stream: true
    });
  }
  
  /**
   * Request mit Retry-Logic (Exponential Backoff)
   */
  private async requestWithRetry(request: AIGenerateRequest): Promise<any> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.requestWithTimeout(request);
        this.circuitBreaker.recordSuccess();
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Exponential Backoff (außer beim letzten Versuch)
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await this.sleep(delay);
        }
        
        // Update Circuit Breaker
        this.circuitBreaker.recordFailure();
      }
    }
    
    throw new Error(`AI request failed after ${maxRetries} attempts: ${lastError?.message}`);
  }
  
  /**
   * Request mit Timeout
   */
  private async requestWithTimeout(request: AIGenerateRequest): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);
    
    try {
      const response = await fetch(`${env.OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model || env.AI_MODEL,
          prompt: this.buildPrompt(request),
          stream: request.stream || false,
          options: {
            temperature: request.temperature ?? env.AI_TEMPERATURE,
            num_predict: request.maxTokens || env.AI_MAX_TOKENS
          }
        }),
        signal: controller.signal
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ollama error: ${response.status} ${response.statusText} - ${text}`);
      }
      
      if (request.stream) {
        return this.createStream(response);
      }
      
      const data = await response.json();
      return { response: data.response, done: data.done };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${env.AI_REQUEST_TIMEOUT_MS}ms`);
      }
      
      if (error instanceof Error) {
        throw new Error(`Ollama not reachable at ${env.OLLAMA_URL}: ${error.message}`);
      }
      
      throw new Error('Unknown error during AI request');
    } finally {
      clearTimeout(timeout);
    }
  }
  
  /**
   * Baut finalen Prompt zusammen
   */
  private buildPrompt(request: AIGenerateRequest): string {
    let prompt = `# TASK\n\n${request.prompt}\n\n\n# ROLE\n\n${request.systemPrompt || 'Du bist eine medizinische Schreibkraft, antwortest immer deutsch, sachlich, respektvoll und höflich.'}`;
    
    if (request.context) {
      prompt += `\n\n\n# CONTEXT\n\n${request.context}`;
    }
    
    return prompt;
  }
  
  /**
   * Erstellt ReadableStream aus Ollama-Response
   */
  private createStream(response: Response): ReadableStream<string> {
    if (!response.body) {
      throw new Error('Response body is null');
    }
    
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
              } catch {
                // Ignore invalid JSON lines
              }
            }
          }
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }
  
  /**
   * Sleep-Helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Warm-up: Lädt Modell auf Startup
   * 
   * Führt einen kleinen Test-Request aus, um Modell zu laden
   */
  async warmup(): Promise<void> {
    try {
      await this.generate({
        prompt: 'Test',
        systemPrompt: 'Test',
        maxTokens: 10,
        stream: false
      });
      console.log('✅ Ollama warm-up successful');
    } catch (error) {
      console.warn('⚠️ Ollama warm-up failed:', error instanceof Error ? error.message : error);
    }
  }
}

