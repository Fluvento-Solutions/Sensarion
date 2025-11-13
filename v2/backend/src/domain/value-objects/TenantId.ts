/**
 * TenantId Value Object
 * 
 * Branded Type für Type-Safety
 */
export type TenantId = string & { readonly __brand: 'TenantId' };

export const TenantId = {
  /**
   * Erstellt TenantId aus String
   * 
   * @throws Error wenn Format ungültig
   */
  fromString(value: string): TenantId {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error(`Invalid TenantId format: ${value}`);
    }
    return value as TenantId;
  },
  
  /**
   * Generiert neue TenantId (UUID)
   */
  generate(): TenantId {
    return crypto.randomUUID() as TenantId;
  }
};

