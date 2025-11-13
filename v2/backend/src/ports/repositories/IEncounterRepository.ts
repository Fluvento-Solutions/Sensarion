/**
 * Encounter Repository Interface (Port)
 */
export interface IEncounterRepository {
  findByTenant(tenantId: string, filters?: { includeDeleted?: boolean }): Promise<any[]>;
  findById(id: string, tenantId: string): Promise<any | null>;
  save(encounter: any): Promise<any>;
}

