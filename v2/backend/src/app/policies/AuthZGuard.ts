import type { AuthenticatedUser } from '@/infrastructure/http/middleware/auth';

/**
 * Authorization Guard
 * 
 * Prüft Permissions (RBAC/ABAC)
 */
export class AuthZGuard {
  /**
   * Prüft ob User eine Permission hat
   * 
   * @throws Error wenn Permission fehlt
   */
  async check(user: AuthenticatedUser, permission: string): Promise<void> {
    // Admin hat alle Permissions
    if (user.roles.includes('admin')) {
      return;
    }
    
    // Prüfe spezifische Permission
    if (!this.hasPermission(user, permission)) {
      throw new Error(`User ${user.userId} does not have permission ${permission}`);
    }
  }
  
  /**
   * Prüft ob User eine Permission hat (RBAC/ABAC Logic)
   */
  private hasPermission(user: AuthenticatedUser, permission: string): boolean {
    // Permission-Format: "resource:action" (z.B. "patients:create")
    // const [resource, action] = permission.split(':'); // TODO: Use for ABAC
    
    // Role-basierte Permissions
    const rolePermissions: Record<string, string[]> = {
      physician: ['patients:read', 'patients:create', 'patients:update', 'patients:delete'],
      mfa: ['patients:read', 'patients:create', 'patients:update'],
      administration: ['patients:read']
    };
    
    for (const role of user.roles) {
      const permissions = rolePermissions[role] || [];
      if (permissions.includes(permission)) {
        return true;
      }
    }
    
    return false;
  }
}

