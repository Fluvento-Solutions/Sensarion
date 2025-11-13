import type { IPatientRepository } from '@/ports/repositories/IPatientRepository';
import type { AuthenticatedUser } from '@/infrastructure/http/middleware/auth';
import { TenantId } from '@/domain/value-objects/TenantId';
import { PatientName } from '@/domain/value-objects/PatientName';
import { Patient } from '@/domain/entities/Patient';
import { AuthZGuard } from '@/app/policies/AuthZGuard';
import { FeatureGate } from '@/app/policies/FeatureGate';
import type { CreatePatientDTO } from '@/app/dto/CreatePatientDTO';
import type { PatientDTO } from '@/app/dto/PatientDTO';
import { PatientDTO as PatientDTOClass } from '@/app/dto/PatientDTO';

/**
 * Create Patient Use Case
 * 
 * Erstellt einen neuen Patienten
 */
export class CreatePatientUseCase {
  constructor(
    private patientRepository: IPatientRepository,
    private authzGuard: AuthZGuard,
    private featureGate: FeatureGate
  ) {}
  
  /**
   * Erstellt Patient
   * 
   * @throws Error wenn Authorization fehlt, Modul nicht verfügbar oder Business-Rules verletzt
   */
  async execute(dto: CreatePatientDTO, user: AuthenticatedUser): Promise<PatientDTO> {
    // Authorization
    await this.authzGuard.check(user, 'patients:create');
    
    // Feature Gate
    await this.featureGate.checkModule(user.tenantId, 'patients');
    
    // Domain Logic
    const patient = Patient.create({
      tenantId: TenantId.fromString(user.tenantId),
      name: PatientName.fromDTO(dto.name),
      birthDate: new Date(dto.birthDate),
      gender: dto.gender,
      tags: dto.tags || [],
      address: dto.address,
      contact: dto.contact,
      insurance: dto.insurance
    });
    
    // Persist
    const saved = await this.patientRepository.save(patient);
    
    // Transform to DTO
    return PatientDTOClass.fromDomain(saved);
  }
}

