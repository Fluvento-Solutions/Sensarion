# Sensarion v2

Moderne, skalierbare Praxisverwaltungs-Software mit Clean Architecture, Multi-Tenant-Support und AI-Integration.

## Voraussetzungen

- Node.js ≥ 18.17 (empfohlen: aktuelle LTS)
- npm ≥ 9 (alternativ pnpm/yarn)
- PostgreSQL ≥ 14 (mit RLS-Unterstützung)
- Ollama (optional, für AI-Features, Standard-Port `11434`)

## Projekt-Struktur

```
v2/
├── backend/          # Node.js + TypeScript + Fastify + Prisma
├── frontend/         # Vue 3 + TypeScript + Vite + Pinia + Vue Query
├── docs/             # Dokumentation
└── ci/               # CI/CD Pipeline
```

## Setup

### 1. Dependencies installieren

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Umgebungsvariablen konfigurieren

**Backend** (`backend/.env`):
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sensarion_v2"

# Auth
JWT_SECRET="your-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
JWT_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# AI (Ollama - Default)
AI_MODE="local"
OLLAMA_URL="http://localhost:11434"
AI_MODEL="llama3-8b-instruct"
AI_TEMPERATURE="0.2"
AI_MAX_TOKENS="2048"

# AI (Optional - Fallback)
AI_PSEUDONYMIZE="false"
OPENROUTER_API_KEY=""

# Server
PORT="4000"
NODE_ENV="development"
LOG_LEVEL="info"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"

# Exports
EXPORT_DIR="./exports"
```

**Frontend** (`frontend/.env`):
```bash
VITE_API_BASE_URL="http://localhost:4000"
VITE_APP_NAME="Sensarion"
```

### 3. Datenbank einrichten

```bash
cd backend
npm run db:migrate
npm run db:seed
```

### 4. Entwicklung starten

**Backend & Frontend parallel**:
```bash
# Im Root-Verzeichnis
npm run dev
```

**Einzeln**:
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

## Commands

### Backend

```bash
# Entwicklung
npm run dev              # Startet mit Hot-Reload

# Build
npm run build            # TypeScript kompilieren
npm run start            # Production-Server starten

# Datenbank
npm run db:migrate       # Migrationen ausführen
npm run db:migrate:dry   # Migrationen testen (dry-run)
npm run db:generate      # Prisma Client generieren
npm run db:seed          # Seed-Daten einfügen
npm run db:studio        # Prisma Studio öffnen

# OpenAPI
npm run openapi:validate # OpenAPI-Spec validieren
npm run openapi:diff     # OpenAPI-Änderungen prüfen

# Qualität
npm run lint             # ESLint
npm run format           # Prettier
npm run test             # Tests ausführen
npm run test:watch       # Tests im Watch-Modus
npm run dep:scan         # Dependency-Vulnerabilities scannen
```

### Frontend

```bash
# Entwicklung
npm run dev              # Vite Dev-Server

# Build
npm run build            # Production-Build
npm run preview          # Production-Build lokal testen

# Qualität
npm run lint             # ESLint
npm run format           # Prettier
npm run type-check       # TypeScript Type-Check
```

## Flags & Konfiguration

### AI-Modus

**Local (Default)**:
```bash
AI_MODE="local"
OLLAMA_URL="http://localhost:11434"
```

**Fallback (OpenRouter/OpenAI)**:
```bash
AI_MODE="fallback"
OPENROUTER_API_KEY="your-key"
```

### Multi-Tenant

Jeder Tenant hat:
- Eigene Daten-Isolation (RLS)
- Module-basierte Subscriptions
- White-Label-Theme (Logo, Colors)

### Module-System

Verfügbare Module:
- `patients`: Patientenverwaltung
- `calendar`: Terminverwaltung
- `exports`: Datenexport (JSON/FHIR)
- `ai-assistant`: KI-Unterstützung

Module können pro Tenant aktiviert/deaktiviert werden.

## Dokumentation

- [Architektur-Übersicht](docs/architecture.md)
- [Layer-Dokumentation](docs/layers/)
- [Komponenten-Dokumentation](docs/components/)
- [C4-Diagramme](docs/c4/)
- [ADR](docs/adr/)
- [Migration v1→v2](docs/migration-plan.md)

## Entwicklung

Siehe [CONTRIBUTING.md](docs/CONTRIBUTING.md) für Code-Stil-Richtlinien und Best Practices.

## Lizenz

Proprietär

