import { TenantId } from '../value-objects/TenantId';

/**
 * Create Tenant Domain DTO
 */
export interface CreateTenantDomainDTO {
  name: string;
  code: string;
}

/**
 * Tenant Entity
 */
export class Tenant {
  private constructor(
    public readonly id: TenantId,
    public name: string,
    public code: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public deletedAt: Date | null
  ) {}
  
  /**
   * Factory-Methode: Erstellt neuen Tenant
   */
  static create(dto: CreateTenantDomainDTO): Tenant {
    // Business Rule: Code muss lowercase und alphanumerisch sein
    const code = dto.code.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    return new Tenant(
      TenantId.generate(),
      dto.name,
      code,
      new Date(),
      new Date(),
      null
    );
  }
  
  /**
   * Rekonstituiert Tenant aus Persistence
   */
  static reconstitute(data: {
    id: string;
    name: string;
    code: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): Tenant {
    return new Tenant(
      TenantId.fromString(data.id),
      data.name,
      data.code,
      data.createdAt,
      data.updatedAt,
      data.deletedAt
    );
  }
  
  /**
   * Soft-Delete
   */
  softDelete(): void {
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }
}

