/**
 * Email Value Object
 * 
 * Immutable Email mit Validierung
 */
export class Email {
  private constructor(public readonly value: string) {
    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error(`Invalid email format: ${value}`);
    }
  }
  
  /**
   * Erstellt Email aus String
   * 
   * @throws Error wenn Format ungültig
   */
  static create(value: string): Email {
    return new Email(value.toLowerCase().trim());
  }
  
  /**
   * Prüft Gleichheit
   */
  equals(other: Email): boolean {
    return this.value === other.value;
  }
  
  /**
   * Gibt String zurück
   */
  toString(): string {
    return this.value;
  }
}

