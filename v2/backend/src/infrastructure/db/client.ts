import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 * 
 * Verwendet Connection Pooling für bessere Performance
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn']
    : ['error']
});

/**
 * Setzt Tenant-Context für RLS (Row Level Security)
 * 
 * Muss vor jeder Query aufgerufen werden, um RLS-Policies zu aktivieren
 */
export async function setTenantContext(tenantId: string, _userRoles: string[]): Promise<void> {
  // TODO: RLS Policies aktivieren (siehe DATABASE_SETUP.md)
  // Für jetzt: RLS ist deaktiviert, daher wird manuell gefiltert
  // Die setTenantContext Funktion wird für zukünftige RLS-Aktivierung vorbereitet
  
  // UUID-Format validieren
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    throw new Error(`Invalid tenantId format: ${tenantId}`);
  }
  
  // Für jetzt: Nichts tun, da RLS noch nicht aktiv ist
  // Später: SET app.tenant_id und app.user_roles für RLS Policies
  // await prisma.$executeRawUnsafe(`SET app.tenant_id = '${tenantId}'`);
  // await prisma.$executeRawUnsafe(`SET app.user_roles = '${JSON.stringify(userRoles)}'`);
}

/**
 * Entfernt Tenant-Context (nach Query)
 */
export async function clearTenantContext(): Promise<void> {
  await prisma.$executeRawUnsafe(`RESET app.tenant_id`);
  await prisma.$executeRawUnsafe(`RESET app.user_roles`);
}

/**
 * Graceful Shutdown
 */
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

