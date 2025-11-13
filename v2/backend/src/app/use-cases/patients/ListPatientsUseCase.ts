import type { IPatientRepository } from '@/ports/repositories/IPatientRepository';
import type { AuthenticatedUser } from '@/infrastructure/http/middleware/auth';
import { AuthZGuard } from '@/app/policies/AuthZGuard';
import { FeatureGate } from '@/app/policies/FeatureGate';
import type { PatientDTO } from '@/app/dto/PatientDTO';
import { PatientDTO as PatientDTOClass } from '@/app/dto/PatientDTO';

/**
 * List Patients Use Case
 * 
 * Gibt Liste der Patienten zurück
 */
export class ListPatientsUseCase {
  constructor(
    private patientRepository: IPatientRepository,
    private authzGuard: AuthZGuard,
    private featureGate: FeatureGate
  ) {}
  
  /**
   * Listet Patienten
   * 
   * @param tenantId - Tenant-ID
   * @param user - Authentifizierter Benutzer
   * @param filters - Filter (Suche, Pagination)
   */
  async execute(
    tenantId: string,
    user: AuthenticatedUser,
    filters?: { search?: string; limit?: number; offset?: number }
  ): Promise<{ patients: PatientDTO[]; total: number }> {
    // Authorization
    await this.authzGuard.check(user, 'patients:read');
    
    // Feature Gate
    await this.featureGate.checkModule(tenantId, 'patients');
    
    // Fetch from Repository
    const { patients, total } = await this.patientRepository.findByTenant(tenantId, filters);
    
    // Transform to DTOs
    return {
      patients: patients.map(PatientDTOClass.fromDomain),
      total
    };
  }
}

