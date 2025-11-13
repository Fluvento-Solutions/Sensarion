/**
 * Circuit Breaker für AI-Service
 * 
 * Verhindert weitere Requests wenn Service fehlschlägt
 */
export enum CircuitState {
  CLOSED = 'closed',   // Normal
  OPEN = 'open',       // Fehler
  HALF_OPEN = 'half-open' // Test
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  
  private readonly failureThreshold: number = 5;
  private readonly successThreshold: number = 2;
  private readonly timeout: number = 60000; // 60s
  
  /**
   * Prüft ob Circuit Breaker offen ist
   */
  isOpen(): boolean {
    if (this.state === CircuitState.OPEN) {
      // Prüfe ob Timeout abgelaufen (→ Half-Open)
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        return false;
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Zeichnet Erfolg auf
   */
  recordSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }
  
  /**
   * Zeichnet Fehler auf
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }
  
  /**
   * Gibt aktuellen State zurück
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Reset Circuit Breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

