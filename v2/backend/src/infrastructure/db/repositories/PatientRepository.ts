import { prisma } from '../client';
import { PatientMapper } from '../mappers/PatientMapper';
import type { IPatientRepository, FindByTenantFilters } from '@/ports/repositories/IPatientRepository';
import type { Patient } from '@/domain/entities/Patient';

/**
 * Patient Repository Implementation
 * 
 * Implementiert IPatientRepository mit Prisma
 */
export class PatientRepository implements IPatientRepository {
  async findByTenant(
    tenantId: string,
    filters?: FindByTenantFilters
  ): Promise<{ patients: Patient[]; total: number }> {
    // Tenant-Context wird bereits vom tenantContextMiddleware gesetzt
    // await setTenantContext(tenantId, []);
    
    const where: any = {
      tenantId,
      deletedAt: null
    };
    
    // TODO: Full-Text-Search wenn filters.search vorhanden
    // Für jetzt: In-Memory-Filterung (wird später optimiert)
    
    const [rows, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.patient.count({ where })
    ]);
    
    let patients = rows.map(PatientMapper.toDomain);
    
    // In-Memory-Suche (temporär, wird später durch DB-Suche ersetzt)
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      patients = patients.filter(p => {
        const name = p.name.getFullName().toLowerCase();
        const tags = p.tags.join(' ').toLowerCase();
        return name.includes(searchTerm) || tags.includes(searchTerm);
      });
    }
    
    return { patients, total };
  }
  
  async findById(id: string, tenantId: string): Promise<Patient | null> {
    // Tenant-Context wird bereits vom tenantContextMiddleware gesetzt
    // await setTenantContext(tenantId, []);
    
    const row = await prisma.patient.findFirst({
      where: { id, tenantId, deletedAt: null }
    });
    
    return row ? PatientMapper.toDomain(row) : null;
  }
  
  async save(patient: Patient): Promise<Patient> {
    // Tenant-Context wird bereits vom tenantContextMiddleware gesetzt
    // await setTenantContext(patient.tenantId as string, []);
    
    const data = PatientMapper.toPrisma(patient);
    const saved = await prisma.patient.upsert({
      where: { id: patient.id as string },
      create: data,
      update: data
    });
    
    return PatientMapper.toDomain(saved);
  }
  
  async delete(id: string, _tenantId: string, reason: string): Promise<void> {
    // Tenant-Context wird bereits vom tenantContextMiddleware gesetzt
    // await setTenantContext(tenantId, []);
    
    await prisma.patient.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deleteReason: reason,
        version: { increment: 1 }
      }
    });
  }
}

