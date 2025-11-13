import { Patient } from '@/domain/entities/Patient';
import type { Prisma } from '@prisma/client';

/**
 * Patient Mapper
 * 
 * Mappt zwischen Domain (Patient) und Prisma (DB-Rows)
 */
export class PatientMapper {
  /**
   * Mappt Prisma-Row zu Domain-Entity
   */
  static toDomain(row: any): Patient {
    return Patient.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name as { given: string[]; family: string },
      birthDate: row.birthDate,
      gender: row.gender,
      tags: row.tags || [],
      version: row.version,
      deceased: row.deceased,
      deceasedDate: row.deceasedDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      vitalsLatest: row.vitalsLatest,
      vitalsHistory: (row.vitalsHistory as any[]) || [],
      allergies: (row.allergies as any[]) || [],
      medications: (row.medications as any[]) || [],
      diagnoses: (row.diagnoses as any[]) || [],
      findings: (row.findings as any[]) || [],
      address: row.address,
      contact: row.contact,
      insurance: row.insurance
    });
  }
  
  /**
   * Mappt Domain-Entity zu Prisma-Input
   */
  static toPrisma(patient: Patient): Prisma.PatientCreateInput {
    return {
      id: patient.id as string,
      tenant: {
        connect: { id: patient.tenantId as string }
      },
      name: patient.name.toJSON(),
      birthDate: patient.birthDate,
      gender: patient.gender,
      tags: [...patient.tags],
      version: patient.version,
      deceased: patient.deceased,
      deceasedDate: patient.deceasedDate,
      vitalsLatest: patient.vitalsLatest,
      vitalsHistory: patient.vitalsHistory as any,
      allergies: patient.allergies as any,
      medications: patient.medications as any,
      diagnoses: patient.diagnoses as any,
      findings: patient.findings as any,
      address: patient.address as any,
      contact: patient.contact as any,
      insurance: patient.insurance as any
    };
  }
}

