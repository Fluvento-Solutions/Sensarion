import type { ITenantModuleRepository } from '@/ports/repositories/ITenantModuleRepository';

/**
 * Feature Gate
 * 
 * Prüft ob Tenant Zugriff auf ein Modul hat
 */
export class FeatureGate {
  constructor(
    private tenantModuleRepository: ITenantModuleRepository
  ) {}
  
  /**
   * Prüft ob Tenant aktives Modul hat
   * 
   * @throws Error wenn Modul nicht verfügbar
   */
  async checkModule(tenantId: string, moduleCode: string): Promise<void> {
    const subscription = await this.tenantModuleRepository.findActive(tenantId, moduleCode);
    
    if (!subscription) {
      throw new Error(`Tenant ${tenantId} does not have subscription for module ${moduleCode}`);
    }
    
    if (subscription.status !== 'active') {
      throw new Error(`Module ${moduleCode} is ${subscription.status} for tenant ${tenantId}`);
    }
    
    const now = new Date();
    if (subscription.validTo && subscription.validTo < now) {
      throw new Error(`Module ${moduleCode} subscription expired for tenant ${tenantId}`);
    }
    
    if (subscription.validFrom > now) {
      throw new Error(`Module ${moduleCode} subscription not yet valid for tenant ${tenantId}`);
    }
  }
  
  /**
   * Prüft mehrere Module (alle müssen verfügbar sein)
   */
  async checkModules(tenantId: string, moduleCodes: string[]): Promise<void> {
    await Promise.all(
      moduleCodes.map(code => this.checkModule(tenantId, code))
    );
  }
}

