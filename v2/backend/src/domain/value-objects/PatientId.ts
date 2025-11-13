/**
 * PatientId Value Object
 * 
 * Branded Type für Type-Safety
 */
export type PatientId = string & { readonly __brand: 'PatientId' };

export const PatientId = {
  /**
   * Erstellt PatientId aus String
   * 
   * @throws Error wenn Format ungültig
   */
  fromString(value: string): PatientId {
    // UUID-Format validieren
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error(`Invalid PatientId format: ${value}`);
    }
    return value as PatientId;
  },
  
  /**
   * Generiert neue PatientId (UUID)
   */
  generate(): PatientId {
    return crypto.randomUUID() as PatientId;
  }
};

