import { prisma } from '../client';
import type { ITenantModuleRepository, TenantModule } from '@/ports/repositories/ITenantModuleRepository';

/**
 * Tenant Module Repository Implementation
 */
export class TenantModuleRepository implements ITenantModuleRepository {
  async findActive(tenantId: string, moduleCode: string): Promise<TenantModule | null> {
    // Tenant-Context wird bereits vom tenantContextMiddleware gesetzt
    // await setTenantContext(tenantId, []);
    
    const row = await prisma.tenantModule.findFirst({
      where: {
        tenantId,
        module: { code: moduleCode },
        status: 'active',
        validFrom: { lte: new Date() },
        OR: [
          { validTo: null },
          { validTo: { gte: new Date() } }
        ]
      },
      include: { module: true }
    });
    
    if (!row) return null;
    
    return {
      id: row.id,
      tenantId: row.tenantId,
      moduleId: row.moduleId,
      moduleCode: row.module.code,
      plan: row.plan,
      status: row.status as 'active' | 'suspended' | 'cancelled',
      validFrom: row.validFrom,
      validTo: row.validTo
    };
  }
  
  async findByTenant(tenantId: string): Promise<TenantModule[]> {
    // Tenant-Context wird bereits vom tenantContextMiddleware gesetzt
    // await setTenantContext(tenantId, []);
    
    const rows = await prisma.tenantModule.findMany({
      where: { tenantId },
      include: { module: true },
      orderBy: { createdAt: 'desc' }
    });
    
    return rows.map(row => ({
      id: row.id,
      tenantId: row.tenantId,
      moduleId: row.moduleId,
      moduleCode: row.module.code,
      plan: row.plan,
      status: row.status as 'active' | 'suspended' | 'cancelled',
      validFrom: row.validFrom,
      validTo: row.validTo
    }));
  }
  
  async save(tenantModule: TenantModule): Promise<TenantModule> {
    // Tenant-Context wird bereits vom tenantContextMiddleware gesetzt
    // await setTenantContext(tenantModule.tenantId, []);
    
    const saved = await prisma.tenantModule.upsert({
      where: { id: tenantModule.id },
      create: {
        id: tenantModule.id,
        tenantId: tenantModule.tenantId,
        moduleId: tenantModule.moduleId,
        plan: tenantModule.plan,
        status: tenantModule.status,
        validFrom: tenantModule.validFrom,
        validTo: tenantModule.validTo
      },
      update: {
        plan: tenantModule.plan,
        status: tenantModule.status,
        validFrom: tenantModule.validFrom,
        validTo: tenantModule.validTo
      }
    });
    
    // Module laden für moduleCode
    const module = await prisma.module.findUnique({
      where: { id: saved.moduleId }
    });
    
    return {
      id: saved.id,
      tenantId: saved.tenantId,
      moduleId: saved.moduleId,
      moduleCode: module!.code,
      plan: saved.plan,
      status: saved.status as 'active' | 'suspended' | 'cancelled',
      validFrom: saved.validFrom,
      validTo: saved.validTo
    };
  }
}

