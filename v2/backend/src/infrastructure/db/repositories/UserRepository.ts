import { prisma, setTenantContext } from '../client';
import { UserMapper } from '../mappers/UserMapper';
import type { IUserRepository } from '@/ports/repositories/IUserRepository';
import type { User } from '@/domain/entities/User';

/**
 * User Repository Implementation
 */
export class UserRepository implements IUserRepository {
  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    // Beim Login setzen wir noch keinen Tenant-Context, da wir den User erst finden müssen
    // RLS wird später aktiviert, wenn der User authentifiziert ist
    // await setTenantContext(tenantId, []);
    
    const row = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        tenantId,
        deletedAt: null
      }
    });
    
    return row ? UserMapper.toDomain(row) : null;
  }
  
  async findById(id: string, tenantId: string): Promise<User | null> {
    // RLS wird später aktiviert, wenn der User authentifiziert ist
    // await setTenantContext(tenantId, []);
    
    const row = await prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null }
    });
    
    return row ? UserMapper.toDomain(row) : null;
  }
  
  async save(user: User): Promise<User> {
    await setTenantContext(user.tenantId as string, []);
    
    const data = UserMapper.toPrisma(user);
    const saved = await prisma.user.upsert({
      where: { id: user.id as string },
      create: data,
      update: data
    });
    
    return UserMapper.toDomain(saved);
  }
}

