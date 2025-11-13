import { User } from '@/domain/entities/User';

/**
 * User Mapper
 */
export class UserMapper {
  static toDomain(row: any): User {
    return User.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      email: row.email,
      passwordHash: row.passwordHash,
      displayName: row.displayName,
      shortName: row.shortName,
      roles: row.roles || [],
      locale: row.locale || 'de-DE',
      avatarUrl: row.avatarUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    });
  }
  
  static toPrisma(user: User): any {
    return {
      id: user.id as string,
      tenantId: user.tenantId as string,
      email: user.email.value,
      passwordHash: user.passwordHash,
      displayName: user.displayName,
      shortName: user.shortName,
      roles: [...user.roles],
      locale: user.locale,
      avatarUrl: user.avatarUrl
    };
  }
}

