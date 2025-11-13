import type { Patient } from '@/domain/entities/Patient';

/**
 * Patient Repository Interface (Port)
 */
export interface FindByTenantFilters {
  search?: string;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}

export interface IPatientRepository {
  findByTenant(tenantId: string, filters?: FindByTenantFilters): Promise<{ patients: Patient[]; total: number }>;
  findById(id: string, tenantId: string): Promise<Patient | null>;
  save(patient: Patient): Promise<Patient>;
  delete(id: string, tenantId: string, reason: string): Promise<void>;
}

