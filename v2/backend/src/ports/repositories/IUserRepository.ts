import type { User } from '@/domain/entities/User';

/**
 * User Repository Interface (Port)
 */
export interface IUserRepository {
  findByEmail(email: string, tenantId: string): Promise<User | null>;
  findById(id: string, tenantId: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

