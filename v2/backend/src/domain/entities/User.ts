import { UserId } from '../value-objects/UserId';
import { TenantId } from '../value-objects/TenantId';
import { Email } from '../value-objects/Email';

/**
 * Create User Domain DTO
 */
export interface CreateUserDomainDTO {
  tenantId: TenantId;
  email: Email;
  passwordHash: string;
  displayName: string;
  shortName?: string;
  roles: string[];
  locale?: string;
  avatarUrl?: string;
}

/**
 * User Entity
 */
export class User {
  private constructor(
    public readonly id: UserId,
    public readonly tenantId: TenantId,
    public readonly email: Email,
    public readonly passwordHash: string,
    public displayName: string,
    public shortName: string | null,
    public roles: readonly string[],
    public locale: string,
    public avatarUrl: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}
  
  /**
   * Factory-Methode: Erstellt neuen User
   */
  static create(dto: CreateUserDomainDTO): User {
    return new User(
      UserId.generate(),
      dto.tenantId,
      dto.email,
      dto.passwordHash,
      dto.displayName,
      dto.shortName || null,
      Object.freeze([...dto.roles]),
      dto.locale || 'de-DE',
      dto.avatarUrl || null,
      new Date(),
      new Date()
    );
  }
  
  /**
   * Rekonstituiert User aus Persistence
   */
  static reconstitute(data: {
    id: string;
    tenantId: string;
    email: string;
    passwordHash: string;
    displayName: string;
    shortName: string | null;
    roles: string[];
    locale: string;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      UserId.fromString(data.id),
      TenantId.fromString(data.tenantId),
      Email.create(data.email),
      data.passwordHash,
      data.displayName,
      data.shortName,
      Object.freeze([...data.roles]),
      data.locale,
      data.avatarUrl,
      data.createdAt,
      data.updatedAt
    );
  }
  
  /**
   * Prüft ob User eine bestimmte Role hat
   */
  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }
  
  /**
   * Prüft ob User Admin ist
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }
}

