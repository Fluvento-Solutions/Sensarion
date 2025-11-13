import type { Tenant } from '@/domain/entities/Tenant';

/**
 * Tenant Repository Interface (Port)
 */
export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findByCode(code: string): Promise<Tenant | null>;
  findAll(): Promise<Tenant[]>;
  save(tenant: Tenant): Promise<Tenant>;
}

