# CHANGELOG v2 Initial Release

## Übersicht

Dieses Dokument listet alle erstellten Artefakte für Sensarion v2 auf.

## Erstellte Artefakte

### Dokumentation

#### Basis-Dokumentation
- ✅ `README.md` - Setup, Commands, Flags
- ✅ `docs/architecture.md` - Layer-Übersicht, Flows
- ✅ `docs/CONTRIBUTING.md` - Code-Stil-Richtlinien

#### C4-Diagramme
- ✅ `docs/c4/context.md` - System Context
- ✅ `docs/c4/container.md` - Container Diagram
- ✅ `docs/c4/component.md` - Component Diagram

#### ADR
- ✅ `docs/adr/ADR-0001-architecture-principle.md` - Clean Architecture

#### Export-Schemas
- ✅ `docs/exports/v1.0.0.schema.json` - Versioned JSON Schema
- ✅ `docs/exports/fhir-notes.md` - FHIR Mapping Notes

#### Layer-Dokumentation
- ✅ `docs/layers/presentation.md` - Frontend-Architektur
- ✅ `docs/layers/application.md` - Use Cases, Policies, DTOs
- ✅ `docs/layers/domain.md` - Entities, Value Objects, Domain Services
- ✅ `docs/layers/infrastructure.md` - HTTP, DB, AI, Payment

#### Komponenten-Dokumentation (Backend)
- ✅ `docs/components/backend/app-use-cases-CreatePatientUseCase.md`
- ✅ `docs/components/backend/infrastructure-db-PatientRepository.md`
- ✅ `docs/components/backend/infrastructure-ai-ollama-adapter.md`
- ✅ `docs/components/backend/app-policies-FeatureGate.md`

#### Komponenten-Dokumentation (Frontend)
- ✅ `docs/components/frontend/services-vue-query.md`
- ✅ `docs/components/frontend/features-patients-usePatient.md`

#### Migration
- ✅ `docs/migration-plan.md` - v1→v2 Migration-Strategie

### Backend

#### OpenAPI
- ✅ `backend/openapi/openapi.yaml` - Single Source of Truth

#### Konfiguration
- ✅ `backend/package.json` - Dependencies, Scripts
- ✅ `backend/.env.example` - Environment Variables
- ✅ `backend/tsconfig.json` - TypeScript Config
- ✅ `backend/tsconfig.build.json` - Build Config
- ✅ `backend/src/config/env.ts` - Environment Validation

#### Infrastructure: HTTP
- ✅ `backend/src/infrastructure/http/errors/ProblemDetails.ts` - RFC 7807 Errors
- ✅ `backend/src/infrastructure/http/errors/errorHandler.ts` - Global Error Handler
- ✅ `backend/src/infrastructure/http/middleware/correlationId.ts` - Correlation ID
- ✅ `backend/src/infrastructure/http/middleware/auth.ts` - JWT Auth
- ✅ `backend/src/infrastructure/http/middleware/tenantContext.ts` - RLS Context
- ✅ `backend/src/infrastructure/http/routes/health.ts` - Health Check
- ✅ `backend/src/index.ts` - Fastify Server Setup

#### Infrastructure: Database
- ✅ `backend/prisma/schema.prisma` - Multi-Tenant Schema
- ✅ `backend/prisma/migrations/README.md` - RLS Setup
- ✅ `backend/src/infrastructure/db/client.ts` - Prisma Client + RLS

#### Infrastructure: AI
- ✅ `backend/src/ports/ai/IAIService.ts` - AI Service Interface
- ✅ `backend/src/infrastructure/ai/OllamaAdapter.ts` - Ollama Integration
- ✅ `backend/src/infrastructure/ai/Cache.ts` - Prompt Caching
- ✅ `backend/src/infrastructure/ai/CircuitBreaker.ts` - Circuit Breaker

#### Infrastructure: Exports
- ✅ `backend/src/infrastructure/exports/ExportService.ts` - Export Service
- ✅ `backend/src/infrastructure/exports/FHIRConverter.ts` - FHIR Conversion
- ✅ `backend/src/infrastructure/exports/JSONExporter.ts` - JSON Export

#### Application Layer
- ✅ `backend/src/app/use-cases/exports/StartExportUseCase.ts` - Export Use Case
- ✅ `backend/src/app/dto/ExportDTO.ts` - Export DTO

#### Ports
- ✅ `backend/src/ports/repositories/IExportRepository.ts` - Export Repository Interface

### Frontend

#### Konfiguration
- ✅ `frontend/package.json` - Dependencies, Scripts
- ✅ `frontend/vite.config.ts` - Vite Config
- ✅ `frontend/tsconfig.json` - TypeScript Config
- ✅ `frontend/tsconfig.node.json` - Node Config
- ✅ `frontend/tailwind.config.cjs` - Tailwind Config

#### App Shell
- ✅ `frontend/src/App.vue` - Root Component
- ✅ `frontend/src/main.ts` - Entry Point
- ✅ `frontend/src/app/router/index.ts` - Vue Router
- ✅ `frontend/src/app/error-boundary/ErrorBoundary.vue` - Error Boundary
- ✅ `frontend/src/app/queryClient.ts` - Vue Query Client

#### Services
- ✅ `frontend/src/services/query-keys.ts` - Vue Query Keys
- ✅ `frontend/src/services/error-mapper.ts` - RFC 7807 Error Mapper

#### Features
- ✅ `frontend/src/features/identity/useAuthStore.ts` - Auth Store (Pinia)
- ✅ `frontend/src/features/identity/types.ts` - Auth Types

#### Shared
- ✅ `frontend/src/shared/theme/tokens.ts` - Theme Tokens (White-Label)

#### Assets
- ✅ `frontend/src/assets/main.css` - Global Styles

### CI/CD

- ✅ `ci/pipeline.yml` - GitHub Actions Pipeline

### Analyse

- ✅ `v2/ANALYSIS_v1.md` - v1 Repository-Analyse

## TODO-Markierungen

### Backend

#### Infrastructure: HTTP
- [ ] `backend/src/infrastructure/http/routes/auth.ts` - Auth Routes implementieren
- [ ] `backend/src/infrastructure/http/routes/patients.ts` - Patient Routes implementieren
- [ ] `backend/src/infrastructure/http/routes/exports.ts` - Export Routes implementieren
- [ ] `backend/src/infrastructure/http/routes/tenants.ts` - Tenant Routes implementieren
- [ ] `backend/src/infrastructure/http/routes/modules.ts` - Module Routes implementieren

#### Application Layer
- [ ] `backend/src/app/use-cases/auth/LoginUseCase.ts` - Login Use Case
- [ ] `backend/src/app/use-cases/auth/RefreshTokenUseCase.ts` - Refresh Token Use Case
- [ ] `backend/src/app/use-cases/patients/CreatePatientUseCase.ts` - Create Patient Use Case
- [ ] `backend/src/app/use-cases/patients/UpdatePatientUseCase.ts` - Update Patient Use Case
- [ ] `backend/src/app/use-cases/patients/ListPatientsUseCase.ts` - List Patients Use Case
- [ ] `backend/src/app/policies/AuthZGuard.ts` - Authorization Guard
- [ ] `backend/src/app/policies/FeatureGate.ts` - Feature Gate (Interface vorhanden, Implementierung fehlt)
- [ ] `backend/src/app/dto/PatientDTO.ts` - Patient DTO
- [ ] `backend/src/app/dto/AuthDTO.ts` - Auth DTO

#### Domain Layer
- [ ] `backend/src/domain/entities/Patient.ts` - Patient Entity
- [ ] `backend/src/domain/entities/User.ts` - User Entity
- [ ] `backend/src/domain/entities/Tenant.ts` - Tenant Entity
- [ ] `backend/src/domain/value-objects/PatientName.ts` - PatientName Value Object
- [ ] `backend/src/domain/value-objects/Email.ts` - Email Value Object
- [ ] `backend/src/domain/value-objects/PatientId.ts` - PatientId Value Object

#### Infrastructure: Database
- [ ] `backend/src/infrastructure/db/repositories/PatientRepository.ts` - Patient Repository
- [ ] `backend/src/infrastructure/db/repositories/UserRepository.ts` - User Repository
- [ ] `backend/src/infrastructure/db/repositories/TenantRepository.ts` - Tenant Repository
- [ ] `backend/src/infrastructure/db/repositories/ExportRepository.ts` - Export Repository
- [ ] `backend/src/infrastructure/db/mappers/PatientMapper.ts` - Patient Mapper
- [ ] `backend/src/infrastructure/db/rls/policies.sql` - RLS Policies

#### Infrastructure: Auth
- [ ] `backend/src/infrastructure/auth/JWTService.ts` - JWT Service
- [ ] `backend/src/infrastructure/auth/PasswordService.ts` - Password Service

#### Infrastructure: Payment
- [ ] `backend/src/infrastructure/payment/StripeWebhookHandler.ts` - Stripe Webhook
- [ ] `backend/src/infrastructure/payment/PaddleWebhookHandler.ts` - Paddle Webhook

### Frontend

#### Features
- [ ] `frontend/src/features/identity/LoginView.vue` - Login View
- [ ] `frontend/src/features/patients/PatientListView.vue` - Patient List
- [ ] `frontend/src/features/patients/PatientDetailView.vue` - Patient Detail
- [ ] `frontend/src/features/patients/usePatient.ts` - usePatient Composable
- [ ] `frontend/src/features/catalog/ModuleCatalogView.vue` - Module Catalog
- [ ] `frontend/src/features/exports/ExportView.vue` - Export View

#### Services
- [ ] `frontend/src/services/api.ts` - API Client (generated from OpenAPI)

#### App Shell
- [ ] `frontend/src/app/layouts/AppLayout.vue` - Main Layout

#### Shared
- [ ] `frontend/src/shared/ui-kit/Button.vue` - Button Component
- [ ] `frontend/src/shared/ui-kit/Input.vue` - Input Component
- [ ] `frontend/src/shared/components/PatientCard.vue` - Patient Card

#### i18n
- [ ] `frontend/src/i18n/de.ts` - German Translations
- [ ] `frontend/src/i18n/en.ts` - English Translations

## Nächste Schritte

### 1. Backend-Implementierung

1. **Domain Layer**:
   - Entities implementieren (Patient, User, Tenant)
   - Value Objects implementieren (PatientName, Email, IDs)
   - Domain Services implementieren

2. **Application Layer**:
   - Use Cases implementieren (Login, CreatePatient, etc.)
   - Policies implementieren (AuthZGuard, FeatureGate)
   - DTOs implementieren

3. **Infrastructure Layer**:
   - Repositories implementieren
   - Mappers implementieren
   - RLS Policies erstellen
   - Fastify Routes implementieren
   - JWT Service implementieren

### 2. Frontend-Implementierung

1. **API Client**:
   - OpenAPI Client generieren
   - API Service implementieren

2. **Features**:
   - Login View
   - Patient List/Detail Views
   - Module Catalog
   - Export View

3. **Shared Components**:
   - UI-Kit Components
   - Common Components

4. **i18n**:
   - German/English Translations

### 3. Testing

1. **Unit Tests**:
   - Domain Layer Tests
   - Use Case Tests

2. **Integration Tests**:
   - Repository Tests
   - API Tests

3. **Contract Tests**:
   - OpenAPI Validation

### 4. CI/CD

1. **Pipeline**:
   - Alle Jobs aktivieren
   - OpenAPI Diff implementieren
   - Deployment hinzufügen

### 5. Migration

1. **Datenbank**:
   - Migration-Scripts erstellen
   - RLS Policies testen

2. **Frontend**:
   - Schrittweise Migration
   - Feature Flags

## UI Migration (v1 → v2)

### Frontend - Layout & Styling
- ✅ `frontend/src/app/layouts/AppShell.vue` - Hauptlayout mit Slots
- ✅ `frontend/src/app/layouts/AppHeader.vue` - Header mit Logo, Modul-Icons, User-Info
- ✅ `frontend/src/app/layouts/ContextPanel.vue` - Linkes Panel (Live Status, Alerts, Aufgabenliste)
- ✅ `frontend/src/app/layouts/FooterConsole.vue` - KI-Chat unten links
- ✅ `frontend/src/app/composables/useViewState.ts` - View-State Management
- ✅ `frontend/src/app/views/OverviewView.vue` - Übersichts-View
- ✅ `frontend/src/app/views/CalendarView.vue` - Kalender-View mit Monats/Wochen/Tages-Ansicht
- ✅ `frontend/src/app/views/AdminView.vue` - Admin-View mit Tabs
- ✅ `frontend/src/app/views/KiTestView.vue` - KI-Test-View (Placeholder)
- ✅ `frontend/tailwind.config.cjs` - v1-Theme übernommen (steel, accent colors)
- ✅ `frontend/src/assets/main.css` - v1-Styles übernommen (glass-card, shell-surface, etc.)
- ✅ `frontend/package.json` - @phosphor-icons/vue, date-fns hinzugefügt

### Assets
- ✅ `frontend/src/assets/media/image/example_logo.png` - Logo kopiert
- ✅ `frontend/src/assets/media/image/maxmuster.png` - User-Avatar kopiert

## Feature-Implementierungen

### Patienten-Modul Erweiterungen

#### Backend - Patienten-Subressourcen
- ✅ `backend/src/infrastructure/http/routes/patients.ts` - Erweitert um:
  - Vitalwerte (GET, POST, PUT, DELETE)
  - Allergien (GET, POST, PUT, DELETE)
  - Medikationen (GET, POST, PUT, DELETE)
  - Diagnosen (GET, POST, PUT, DELETE)
  - Befunde (GET, POST, PUT, DELETE)
  - Notizen (GET, POST, PUT, DELETE)
  - Encounters (GET, POST, PUT, DELETE)
  - Audit-Logs (GET)

#### Frontend - Patienten-Tabs
- ✅ `frontend/src/features/patients/PatientDetailView.vue` - Erweitert mit Tabs-Navigation
- ✅ `frontend/src/features/patients/components/OverviewTab.vue` - Übersicht (Basis-Daten, Kontakt, Adresse, Versicherung)
- ✅ `frontend/src/features/patients/components/VitalsTab.vue` - Vitalwerte-Liste
- ✅ `frontend/src/features/patients/components/MedicalTab.vue` - Medizinisch-Tab mit Sub-Tabs
- ✅ `frontend/src/features/patients/components/AllergiesTab.vue` - Allergien-Verwaltung
- ✅ `frontend/src/features/patients/components/MedicationsTab.vue` - Medikationen-Verwaltung
- ✅ `frontend/src/features/patients/components/DiagnosesTab.vue` - Diagnosen-Verwaltung
- ✅ `frontend/src/features/patients/components/FindingsTab.vue` - Befunde-Verwaltung
- ✅ `frontend/src/features/patients/components/HistoryTab.vue` - Verlaufsansicht (Notizen, Encounters, Audit-Logs)

#### Frontend - API-Services
- ✅ `frontend/src/services/api.ts` - Erweitert um Patienten-Subressourcen-APIs

### Admin-Modul Implementierung

#### Backend
- ✅ `backend/src/infrastructure/http/routes/admin.ts` - Admin-Routes:
  - Benutzerverwaltung (GET, POST, PUT, DELETE)
  - Einstellungen (GET, PATCH)
  - Berechtigungen (GET)
  - Platzhalter für Teams, Räume, Usertypen

#### Frontend
- ✅ `frontend/src/app/views/AdminView.vue` - Admin-View mit Tabs (Benutzer, Usertypen, Teams, Räume, Raumtypen, Berechtigungen, Einstellungen)
- ✅ `frontend/src/features/admin/components/UserManagementTab.vue` - Benutzerverwaltung
- ✅ `frontend/src/features/admin/components/SettingsTab.vue` - Praxis-Einstellungen
- ✅ `frontend/src/services/api.ts` - adminApi hinzugefügt

### Kalender-Modul Implementierung

#### Backend
- ✅ `backend/prisma/schema.prisma` - Calendar-Modelle hinzugefügt:
  - `Calendar` (PERSONAL, ROOM, PURPOSE)
  - `CalendarEvent` (mit Recurrence-Support)
  - `CalendarEventParticipant`
- ✅ `backend/src/infrastructure/http/routes/calendar.ts` - Kalender-Routes:
  - Kalender (GET, POST, PUT, DELETE)
  - Events (GET, POST, PUT, DELETE)
  - Konfliktprüfung (GET)
  - Teilnehmer-Verwaltung (POST, DELETE)

#### Frontend
- ✅ `frontend/src/app/views/CalendarView.vue` - Kalender-View mit:
  - Monats-Ansicht
  - Wochen-Ansicht
  - Tages-Ansicht
  - Navigation zwischen Zeiträumen
  - Event-Anzeige
- ✅ `frontend/src/services/api.ts` - calendarApi hinzugefügt
- ✅ `frontend/package.json` - date-fns Dependency hinzugefügt

## Zusammenfassung

**Erstellt**: 50+ Dateien (Dokumentation, Backend-Struktur, Frontend-Struktur, CI/CD)

**UI Migration**: 10+ Dateien (Layout-Komponenten, Views, Styling)

**Feature-Implementierungen**: 
- Patienten-Modul: 8 Backend-Routes + 8 Frontend-Komponenten
- Admin-Modul: 1 Backend-Route + 3 Frontend-Komponenten
- Kalender-Modul: 1 Backend-Route + 1 Frontend-View + 3 Prisma-Modelle

**TODO**: 
- CRUD-Modals für Patienten-Subressourcen
- CRUD-Modals für Admin-Benutzer
- Event-Erstellung/Editierung im Kalender
- Teams, Räume, Usertypen-Verwaltung

**Status**: Foundation gelegt, UI migriert, Kern-Features implementiert

