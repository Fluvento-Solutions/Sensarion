import { prisma } from '../client';
import type { ITenantRepository } from '@/ports/repositories/ITenantRepository';
import { Tenant } from '@/domain/entities/Tenant';

/**
 * Tenant Repository Implementation
 */
export class TenantRepository implements ITenantRepository {
  async findById(id: string): Promise<Tenant | null> {
    const row = await prisma.tenant.findFirst({
      where: { id, deletedAt: null }
    });
    
    if (!row) return null;
    
    return Tenant.reconstitute({
      id: row.id,
      name: row.name,
      code: row.code,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt
    });
  }
  
  async findByCode(code: string): Promise<Tenant | null> {
    const row = await prisma.tenant.findFirst({
      where: { code: code.toLowerCase(), deletedAt: null }
    });
    
    if (!row) return null;
    
    return Tenant.reconstitute({
      id: row.id,
      name: row.name,
      code: row.code,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt
    });
  }
  
  async findAll(): Promise<Tenant[]> {
    const rows = await prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    
    return rows.map(row => Tenant.reconstitute({
      id: row.id,
      name: row.name,
      code: row.code,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt
    }));
  }
  
  async save(tenant: Tenant): Promise<Tenant> {
    const saved = await prisma.tenant.upsert({
      where: { id: tenant.id as string },
      create: {
        id: tenant.id as string,
        name: tenant.name,
        code: tenant.code,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        deletedAt: tenant.deletedAt
      },
      update: {
        name: tenant.name,
        code: tenant.code,
        updatedAt: tenant.updatedAt,
        deletedAt: tenant.deletedAt
      }
    });
    
    return Tenant.reconstitute({
      id: saved.id,
      name: saved.name,
      code: saved.code,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      deletedAt: saved.deletedAt
    });
  }
}

