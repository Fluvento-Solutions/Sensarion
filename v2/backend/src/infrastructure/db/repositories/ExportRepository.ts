import { prisma } from '../client';
import type { IExportRepository, CreateExportDTO } from '@/ports/repositories/IExportRepository';

/**
 * Export Repository Implementation
 */
export class ExportRepository implements IExportRepository {
  async create(dto: CreateExportDTO): Promise<any> {
    // Tenant-Context wird bereits vom tenantContextMiddleware gesetzt
    // await setTenantContext(dto.tenantId, []);
    
    const exportRecord = await prisma.export.create({
      data: {
        tenantId: dto.tenantId,
        format: dto.format,
        status: dto.status,
        progress: dto.progress
      }
    });
    
    return exportRecord;
  }
  
  async findById(id: string, tenantId: string): Promise<any | null> {
    // Tenant-Context wird bereits vom tenantContextMiddleware gesetzt
    // await setTenantContext(tenantId, []);
    
    return prisma.export.findFirst({
      where: { id, tenantId }
    });
  }
  
  async findByTenant(tenantId: string): Promise<any[]> {
    // Tenant-Context wird bereits vom tenantContextMiddleware gesetzt
    // await setTenantContext(tenantId, []);
    
    return prisma.export.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }
  
  async updateStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    await prisma.export.update({
      where: { id },
      data: {
        status,
        error: error || null,
        ...(status === 'failed' && { completedAt: new Date() })
      }
    });
  }
  
  async updateProgress(id: string, progress: number): Promise<void> {
    await prisma.export.update({
      where: { id },
      data: { progress }
    });
  }
  
  async complete(id: string, filePath: string, fileSize: number): Promise<void> {
    await prisma.export.update({
      where: { id },
      data: {
        status: 'completed',
        filePath,
        fileSize,
        progress: 100,
        completedAt: new Date()
      }
    });
  }
}

