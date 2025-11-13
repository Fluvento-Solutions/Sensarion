import { FastifyRequest, FastifyReply } from 'fastify';
import { setTenantContext } from '@/infrastructure/db/client';
import type { AuthenticatedUser } from './auth';

/**
 * Middleware: Setzt Tenant-Context für PostgreSQL RLS
 * 
 * Setzt `app.tenant_id` und `app.user_roles` als PostgreSQL Session-Variablen
 * für Row Level Security (RLS) Policies.
 * 
 * Wird nach authMiddleware ausgeführt (benötigt request.user)
 */
export async function tenantContextMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const user = request.user as AuthenticatedUser | undefined;
  
  if (!user) {
    // Sollte nicht passieren wenn authMiddleware vorher läuft
    return;
  }
  
  // Setze PostgreSQL Session-Variablen für RLS
  await setTenantContext(user.tenantId, user.roles);
  
  // Setze auch in Request-Context (für Repository-Verwendung)
  (request as any).tenantId = user.tenantId;
  (request as any).userRoles = user.roles;
}
