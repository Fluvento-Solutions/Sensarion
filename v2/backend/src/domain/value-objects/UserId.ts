/**
 * UserId Value Object
 * 
 * Branded Type für Type-Safety
 */
export type UserId = string & { readonly __brand: 'UserId' };

export const UserId = {
  /**
   * Erstellt UserId aus String
   * 
   * @throws Error wenn Format ungültig
   */
  fromString(value: string): UserId {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error(`Invalid UserId format: ${value}`);
    }
    return value as UserId;
  },
  
  /**
   * Generiert neue UserId (UUID)
   */
  generate(): UserId {
    return crypto.randomUUID() as UserId;
  }
};

