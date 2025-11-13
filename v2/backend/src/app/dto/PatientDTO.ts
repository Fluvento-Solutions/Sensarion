import type { Patient } from '@/domain/entities/Patient';

/**
 * Patient DTO
 * 
 * Data Transfer Object für Patient-API-Responses
 */
export interface PatientDTO {
  id: string;
  tenantId: string;
  version: number;
  name: {
    given: string[];
    family: string;
  };
  birthDate: string; // ISO Date
  gender?: 'm' | 'w' | 'd';
  tags: string[];
  address?: {
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    mobile?: string;
  };
  insurance?: {
    number?: string;
    type?: string;
    provider?: string;
  };
  vitalsLatest?: any;
  vitalsHistory: any[];
  allergies: any[];
  medications: any[];
  diagnoses: any[];
  findings: any[];
  deceased: boolean;
  deceasedDate?: string; // ISO Date
  createdAt: string; // ISO DateTime
  updatedAt: string; // ISO DateTime
}

export class PatientDTO {
  /**
   * Konvertiert Domain-Entity zu DTO
   */
  static fromDomain(patient: Patient): PatientDTO {
    return {
      id: patient.id as string,
      tenantId: patient.tenantId as string,
      version: patient.version,
      name: patient.name.toJSON(),
      birthDate: patient.birthDate.toISOString().split('T')[0],
      gender: patient.gender || undefined,
      tags: [...patient.tags],
      address: patient.address || undefined,
      contact: patient.contact || undefined,
      insurance: patient.insurance || undefined,
      vitalsLatest: patient.vitalsLatest || undefined,
      vitalsHistory: [...patient.vitalsHistory],
      allergies: [...patient.allergies],
      medications: [...patient.medications],
      diagnoses: [...patient.diagnoses],
      findings: [...patient.findings],
      deceased: patient.deceased,
      deceasedDate: patient.deceasedDate?.toISOString().split('T')[0],
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString()
    };
  }
}

