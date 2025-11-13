/**
 * Export DTO
 */
export interface ExportDTO {
  id: string;
  tenantId: string;
  format: 'json' | 'ndjson' | 'fhir';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  fileSize?: number;
  createdAt: string;
  completedAt?: string;
}

/**
 * Export DTO Helper
 */
export class ExportDTOHelper {
  static fromDomain(exportRecord: any): ExportDTO {
    return {
      id: exportRecord.id,
      tenantId: exportRecord.tenantId,
      format: exportRecord.format,
      status: exportRecord.status,
      progress: exportRecord.progress,
      error: exportRecord.error || undefined,
      fileSize: exportRecord.fileSize || undefined,
      createdAt: exportRecord.createdAt.toISOString(),
      completedAt: exportRecord.completedAt?.toISOString()
    };
  }
}

