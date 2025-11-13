/**
 * Vue Query Cache Keys
 * 
 * Strukturierte Keys für bessere Cache-Verwaltung und Invalidation
 */
export const queryKeys = {
  // Patienten
  patients: (tenantId: string, search?: string) => 
    search ? ['patients', tenantId, search] as const : ['patients', tenantId] as const,
  patient: (id: string, tenantId: string) => ['patient', id, tenantId] as const,
  
  // Module
  modules: () => ['modules'] as const,
  tenantModules: (tenantId: string) => ['tenant-modules', tenantId] as const,
  
  // Exports
  exports: (tenantId: string) => ['exports', tenantId] as const,
  export: (id: string, tenantId: string) => ['export', id, tenantId] as const,
  
  // Auth
  user: (userId: string) => ['user', userId] as const
} as const;

