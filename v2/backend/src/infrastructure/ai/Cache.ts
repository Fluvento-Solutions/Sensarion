/**
 * Prompt-Template-Cache
 * 
 * Cached deterministische AI-Responses basierend auf Prompt-Fingerprint
 */
import { createHash } from 'crypto';
// import type { AIGenerateRequest } from '@/ports/ai/IAIService'; // TODO: Use when implementing cache key generation

export class PromptCache {
  private cache: Map<string, string> = new Map();
  
  /**
   * Generiert Fingerprint für Prompt (Hash)
   */
  generateFingerprint(
    prompt: string,
    systemPrompt: string,
    options: { temperature?: number; model?: string }
  ): string {
    const input = JSON.stringify({
      prompt,
      systemPrompt,
      temperature: options.temperature || 0.2,
      model: options.model || 'llama3-8b-instruct'
    });
    
    return createHash('sha256').update(input).digest('hex');
  }
  
  /**
   * Holt gecachte Response
   */
  async get(fingerprint: string): Promise<string | null> {
    return this.cache.get(fingerprint) || null;
  }
  
  /**
   * Speichert Response im Cache
   */
  async set(fingerprint: string, response: string): Promise<void> {
    // TODO: Implementiere TTL und On-Disk-Cache für Production
    this.cache.set(fingerprint, response);
  }
  
  /**
   * Löscht Cache-Eintrag
   */
  async delete(fingerprint: string): Promise<void> {
    this.cache.delete(fingerprint);
  }
  
  /**
   * Löscht gesamten Cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }
}

