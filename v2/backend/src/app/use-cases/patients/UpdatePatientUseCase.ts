import type { IPatientRepository } from '@/ports/repositories/IPatientRepository';
import type { AuthenticatedUser } from '@/infrastructure/http/middleware/auth';
import { PatientName } from '@/domain/value-objects/PatientName';
import { AuthZGuard } from '@/app/policies/AuthZGuard';
import { FeatureGate } from '@/app/policies/FeatureGate';
import type { UpdatePatientDTO } from '@/app/dto/UpdatePatientDTO';
import type { PatientDTO } from '@/app/dto/PatientDTO';
import { PatientDTO as PatientDTOClass } from '@/app/dto/PatientDTO';

/**
 * Update Patient Use Case
 * 
 * Aktualisiert einen Patienten (mit Optimistic Locking)
 */
export class UpdatePatientUseCase {
  constructor(
    private patientRepository: IPatientRepository,
    private authzGuard: AuthZGuard,
    private featureGate: FeatureGate
  ) {}
  
  /**
   * Aktualisiert Patient
   * 
   * @param patientId - Patient-ID
   * @param dto - Update-Daten
   * @param user - Authentifizierter Benutzer
   * @param expectedVersion - Erwartete Version (für Optimistic Locking)
   * @throws Error wenn Version nicht übereinstimmt oder Authorization fehlt
   */
  async execute(
    patientId: string,
    dto: UpdatePatientDTO,
    user: AuthenticatedUser,
    expectedVersion: number
  ): Promise<PatientDTO> {
    // Authorization
    await this.authzGuard.check(user, 'patients:update');
    
    // Feature Gate
    await this.featureGate.checkModule(user.tenantId, 'patients');
    
    // Find Patient
    const patient = await this.patientRepository.findById(patientId, user.tenantId);
    if (!patient) {
      throw new Error(`Patient ${patientId} not found in tenant ${user.tenantId}`);
    }
    
    // Update Domain Entity
    patient.update(
      {
        name: dto.name ? PatientName.fromDTO(dto.name) : undefined,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        gender: dto.gender,
        tags: dto.tags,
        address: dto.address,
        contact: dto.contact,
        insurance: dto.insurance
      },
      expectedVersion
    );
    
    // Persist
    const saved = await this.patientRepository.save(patient);
    
    // Transform to DTO
    return PatientDTOClass.fromDomain(saved);
  }
}

