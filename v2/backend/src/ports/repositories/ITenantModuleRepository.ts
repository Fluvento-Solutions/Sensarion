/**
 * Tenant Module Repository Interface (Port)
 */
export interface TenantModule {
  id: string;
  tenantId: string;
  moduleId: string;
  moduleCode: string;
  plan: string;
  status: 'active' | 'suspended' | 'cancelled';
  validFrom: Date;
  validTo: Date | null;
}

export interface ITenantModuleRepository {
  findActive(tenantId: string, moduleCode: string): Promise<TenantModule | null>;
  findByTenant(tenantId: string): Promise<TenantModule[]>;
  save(tenantModule: TenantModule): Promise<TenantModule>;
}

