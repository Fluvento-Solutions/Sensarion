import { prisma } from '../client';
import type { IEncounterRepository } from '@/ports/repositories/IEncounterRepository';

/**
 * Encounter Repository Implementation
 */
export class EncounterRepository implements IEncounterRepository {
  async findByTenant(tenantId: string, _filters?: { includeDeleted?: boolean }): Promise<any[]> {
    // Tenant-Context wird bereits vom tenantContextMiddleware gesetzt
    // await setTenantContext(tenantId, []);
    
    const encounters = await prisma.encounter.findMany({
      where: {
        patient: {
          tenantId
        }
      },
      include: {
        patient: true
      },
      orderBy: { date: 'desc' }
    });
    
    return encounters.map(e => ({
      id: e.id,
      patientId: e.patientId,
      date: e.date.toISOString().split('T')[0],
      location: e.location,
      reason: e.reason,
      summary: e.summary,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString()
    }));
  }
  
  async findById(id: string, tenantId: string): Promise<any | null> {
    // Tenant-Context wird bereits vom tenantContextMiddleware gesetzt
    // await setTenantContext(tenantId, []);
    
    const encounter = await prisma.encounter.findFirst({
      where: {
        id,
        patient: {
          tenantId
        }
      },
      include: {
        patient: true
      }
    });
    
    if (!encounter) return null;
    
    return {
      id: encounter.id,
      patientId: encounter.patientId,
      date: encounter.date.toISOString().split('T')[0],
      location: encounter.location,
      reason: encounter.reason,
      summary: encounter.summary,
      createdAt: encounter.createdAt.toISOString(),
      updatedAt: encounter.updatedAt.toISOString()
    };
  }
  
  async save(encounter: any): Promise<any> {
    // Tenant-Context wird bereits vom tenantContextMiddleware gesetzt
    // await setTenantContext(encounter.tenantId, []);
    
    const saved = await prisma.encounter.upsert({
      where: { id: encounter.id },
      create: {
        id: encounter.id,
        patientId: encounter.patientId,
        date: new Date(encounter.date),
        location: encounter.location,
        reason: encounter.reason,
        summary: encounter.summary
      },
      update: {
        date: new Date(encounter.date),
        location: encounter.location,
        reason: encounter.reason,
        summary: encounter.summary
      }
    });
    
    return {
      id: saved.id,
      patientId: saved.patientId,
      date: saved.date.toISOString().split('T')[0],
      location: saved.location,
      reason: saved.reason,
      summary: saved.summary,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString()
    };
  }
}

