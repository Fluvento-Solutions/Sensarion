# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once tagged releases begin.

## [Unreleased]

### Added

- Initial Vue 3 + Vite project scaffold with Tailwind CSS theming for the sterile Sensarion Praxis-Cockpit.
- Core layout components (`AppShell`, `AppHeader`, `AppSidebar`, `ContextPanel`) and dashboard overview placeholder structures.
- Tailwind theme extensions to emulate stainless steel, white plastic, and teal/blue accent palette.
- TypeScript configuration with path aliases and Vite setup.
- Footer console with prominent KI-Eingabe sowie neue Platzhalter-Komponenten.
- Node/Express API scaffold (`server/`) mit Postgres-Client, Ollama-Client und Health-Endpunkten.
- Erweiterte `.env`-Konfiguration (JWT, Redis, Ollama, Modelle, CORS) samt Validierung via Zod.
- Env-Template auf lokale `sensarion`-Datenbank (Benutzer `sensarion_admin`) aktualisiert; Variablen auf das Minimum reduziert (DB, Ollama, Dev-Login).
- Prisma-Schema für Praxen, Teams, Nutzende und Rollen hinzugefügt; Prisma Client verfügbar gemacht.
- Seed-Skript legt Musterpraxis und Nutzer*in Max Mustermann an.
- Auth-API (Dev-Login, Profilabruf) und Frontend-Anbindung inklusive Nutzeranzeige in der Kopfzeile implementiert.
- Kombiniertes `npm run dev`-Skript, das Frontend und Backend parallel startet; zusätzliche Root-Skripte für Prisma (`db:migrate`, `db:generate`, `db:seed`).
- Login-Formular mit optionaler E-Mail-Merkliste und Dev-Login-Schalter; Auth-Store auf LocalStorage-Basis für persistente Sessions.
- JWT-basierte Authentifizierung im Backend (`/api/auth/login`, `/api/auth/logout`) inklusive `SESSION_SECRET`-Konfiguration.
- Diagnosen- und Befundverwaltung für Patienten: JSONB-Felder `diagnoses` und `findings` im Patient-Schema hinzugefügt.
- API-Endpunkte für Diagnosenverwaltung: `POST /api/patients/:id/diagnoses`, `PATCH /api/patients/:id/diagnoses/:diagnosisId`, `DELETE /api/patients/:id/diagnoses/:diagnosisId` mit vollständiger CRUD-Funktionalität und Audit-Logging.
- API-Endpunkte für Befundverwaltung: `POST /api/patients/:id/findings`, `PATCH /api/patients/:id/findings/:findingId`, `DELETE /api/patients/:id/findings/:findingId` mit vollständiger CRUD-Funktionalität und Audit-Logging.
- Frontend-Integration für Diagnosen und Befunde im PatientsModule mit Bearbeitungs- und Löschfunktionen.
- TypeScript-Typen für `PatientDiagnosis` und `PatientFinding` im API-Service.
- Setup-System mit `SystemConfig`-Tabelle zur Verwaltung des Installation-Status.
- Setup-API-Routen: `GET /api/setup/status` und `POST /api/setup/init` für initiale Systemkonfiguration.
- SetupWizard-Komponente (`SetupWizard.vue`) für schrittweise Systeminitialisierung mit System-Tests, Praxis- und Admin-Erstellung, Whitelabel-Konfiguration und Review.
- Whitelabel-Funktionalität für Praxen: `logoUrl` und `primaryColor` Felder im Practice-Schema hinzugefügt.
- Admin-Setup-Tools im `admin/`-Verzeichnis für Systeminitialisierung und Konfiguration.
- Erweiterte Ollama-Funktionalität mit verbessertem System-Prompt für automatische ICD-Code-Ergänzung bei Diagnosen.

### Fixed

- Added `src/env.d.ts` to provide Vue SFC type declarations so that imports like `@/components/layout/AppShell.vue` resolve without TypeScript errors.
- Replaced unsupported `from-white/92` and `via-surface-glass/90` Tailwind utility usage with valid gradient classes.
- Changed dev server script to run on port 5180 to avoid port conflicts during local development.
- Reworked layout shell to occupy full viewport without clipping and simplified dashboard content to reine Skeleton-Platzhalter.
- Enhanced global background with layered gradients and brushed-metal texture to restore the original photorealistic look.
- Tweaked ambient gradients to eliminate light artifacts around card edges and added overflow handling to `glass-card`.
- Normalized gradient utilities for Tailwind compatibility (`to-white`).
- Added a framed shell background to unify spacing between panels and eliminate visual gaps.
- Refined shell gradients and card surfaces to avoid multi-layer transparency artifacts.
- Replaced unsupported Tailwind gradient shorthand with an arbitrary color stop for the card surface.
- Hardened backend environment validation, CORS handling, and authentication responses for predictable dev-login behaviour.
- Normalised Vue shell layout to 100 dvh, improved skeleton grids, and added a frontend fallback message when the profile cannot be loaded.
- Updated documentation with backend setup steps (env, migrations, seeds) for a reproducible local stack.
- Express-Server meldet belegte Ports und fährt bei SIGINT/SIGTERM sauber herunter; Auth- und Ollama-Routen liefern klarere Fehlermeldungen bei Datenbank- bzw. LLM-Ausfällen.
- Profil-Widget in der Kopfzeile visuell überarbeitet und um Logout-Button erweitert; Fehlerausgabe beim Login verbessert.

