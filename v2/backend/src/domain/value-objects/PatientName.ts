/**
 * PatientName Value Object
 * 
 * Immutable Name mit Validierung
 */
export class PatientName {
  private constructor(
    public readonly given: readonly string[],
    public readonly family: string
  ) {
    // Invariants
    if (given.length === 0) {
      throw new Error('Given names cannot be empty');
    }
    if (!family || family.trim().length === 0) {
      throw new Error('Family name is required');
    }
  }
  
  /**
   * Erstellt PatientName
   * 
   * @throws Error wenn Invariants verletzt
   */
  static create(given: string[], family: string): PatientName {
    return new PatientName(
      Object.freeze([...given.map(n => n.trim()).filter(n => n.length > 0)]),
      family.trim()
    );
  }
  
  /**
   * Erstellt PatientName aus DTO
   */
  static fromDTO(dto: { given: string[]; family: string }): PatientName {
    return PatientName.create(dto.given, dto.family);
  }
  
  /**
   * Konvertiert zu JSON
   */
  toJSON(): { given: string[]; family: string } {
    return {
      given: [...this.given],
      family: this.family
    };
  }
  
  /**
   * Gibt vollständigen Namen zurück
   */
  getFullName(): string {
    return `${this.given.join(' ')} ${this.family}`;
  }
  
  /**
   * Prüft Gleichheit
   */
  equals(other: PatientName): boolean {
    return (
      this.family === other.family &&
      this.given.length === other.given.length &&
      this.given.every((name, i) => name === other.given[i])
    );
  }
}

