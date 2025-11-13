/**
 * Export Repository Interface (Port)
 */
export interface CreateExportDTO {
  tenantId: string;
  format: 'json' | 'ndjson' | 'fhir';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
}

export interface IExportRepository {
  create(dto: CreateExportDTO): Promise<any>;
  findById(id: string, tenantId: string): Promise<any | null>;
  findByTenant(tenantId: string): Promise<any[]>;
  updateStatus(id: string, status: 'pending' | 'processing' | 'completed' | 'failed', error?: string): Promise<void>;
  updateProgress(id: string, progress: number): Promise<void>;
  complete(id: string, filePath: string, fileSize: number): Promise<void>;
}

