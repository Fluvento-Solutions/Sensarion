-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
-- 
-- WICHTIG: Diese Policies müssen nach Prisma-Migrationen manuell erstellt werden
-- Prisma unterstützt RLS-Policies nicht direkt
--
-- Setup:
-- 1. RLS für alle Tabellen aktivieren
-- 2. Policies erstellen (deny by default)
-- 3. Tenant-Isolation Policies
-- 4. Role-Based Policies (optional)
--
-- ============================================================================

-- 1. RLS aktivieren
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Tenant-Isolation Policies (deny by default)
-- ============================================================================

-- Tenants: Nur eigene Tenant-Daten
CREATE POLICY tenant_isolation_tenants ON tenants
  FOR ALL
  USING (id = current_setting('app.tenant_id', true)::uuid);

-- Users: Nur User des eigenen Tenants
CREATE POLICY tenant_isolation_users ON users
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Modules: Alle Module sichtbar (keine Tenant-Isolation)
-- (Module sind global verfügbar)

-- Tenant Modules: Nur Subscriptions des eigenen Tenants
CREATE POLICY tenant_isolation_tenant_modules ON tenant_modules
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Patients: Nur Patienten des eigenen Tenants
CREATE POLICY tenant_isolation_patients ON patients
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Encounters: Nur Encounters von Patienten des eigenen Tenants
CREATE POLICY tenant_isolation_encounters ON encounters
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = encounters.patient_id
      AND patients.tenant_id = current_setting('app.tenant_id', true)::uuid
    )
  );

-- Patient Notes: Nur Notizen von Patienten des eigenen Tenants
CREATE POLICY tenant_isolation_patient_notes ON patient_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_notes.patient_id
      AND patients.tenant_id = current_setting('app.tenant_id', true)::uuid
    )
  );

-- Audit Logs: Nur Logs des eigenen Tenants
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Exports: Nur Exports des eigenen Tenants
CREATE POLICY tenant_isolation_exports ON exports
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- 3. Role-Based Policies (optional)
-- ============================================================================

-- Beispiel: Admin hat vollen Zugriff
CREATE POLICY admin_access_patients ON patients
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND 'admin' = ANY(string_to_array(current_setting('app.user_roles', true), ','))
  );

-- Beispiel: Physician kann Patienten erstellen/bearbeiten
CREATE POLICY physician_access_patients ON patients
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND 'physician' = ANY(string_to_array(current_setting('app.user_roles', true), ','))
  );

-- ============================================================================
-- 4. Soft-Delete Policies
-- ============================================================================

-- Patienten: Nur nicht gelöschte Patienten sichtbar (außer für Admin)
CREATE POLICY patients_not_deleted ON patients
  FOR SELECT
  USING (
    deleted_at IS NULL
    OR 'admin' = ANY(string_to_array(current_setting('app.user_roles', true), ','))
  );

-- ============================================================================
-- 5. Session-Variablen setzen
-- ============================================================================
--
-- Diese Variablen müssen vor jeder Query gesetzt werden:
-- 
-- SET app.tenant_id = 'tenant-uuid'::uuid;
-- SET app.user_roles = 'admin,physician'::text[];
--
-- Siehe: infrastructure/db/client.ts (setTenantContext)
--
-- ============================================================================

