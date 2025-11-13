# Sensarion v2 Setup Guide

## Schritt 1: Dependencies installieren

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Schritt 2: Environment Variables konfigurieren

### Backend (.env)

Erstelle `backend/.env` mit folgenden Variablen:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sensarion_v2?schema=public"

# Server
PORT=4000
NODE_ENV=development
LOG_LEVEL=info

# JWT
JWT_SECRET=dev-jwt-secret-key-min-32-characters-long-for-security
JWT_EXPIRY=15m
JWT_REFRESH_SECRET=dev-refresh-secret-key-min-32-characters-long-for-security
JWT_REFRESH_EXPIRY=7d

# AI
AI_MODE=local
OLLAMA_URL=http://localhost:11434
AI_MODEL=llama3-8b-instruct
AI_TEMPERATURE=0.2
AI_MAX_TOKENS=2048
AI_REQUEST_TIMEOUT_MS=30000
AI_PSEUDONYMIZE=false
OPENROUTER_API_KEY=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Exports
EXPORT_DIR=./exports

# Payment (Optional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
```

### Frontend (.env)

Erstelle `frontend/.env` mit folgenden Variablen:

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_APP_NAME=Sensarion
VITE_APP_VERSION=2.0.0
```

## Schritt 3: PostgreSQL Database Setup

### 3.1 Database erstellen

```bash
# Mit psql
createdb sensarion_v2

# Oder mit SQL
psql -U postgres -c "CREATE DATABASE sensarion_v2;"
```

### 3.2 Prisma Client generieren

```bash
cd backend
npm run db:generate
```

### 3.3 Migrationen ausführen

```bash
npm run db:migrate
```

### 3.4 RLS Policies aktivieren

Nach der Migration müssen die RLS Policies manuell aktiviert werden:

```bash
# Mit psql
psql -U postgres -d sensarion_v2 -f src/infrastructure/db/rls/policies.sql

# Oder direkt
psql -U postgres -d sensarion_v2 << EOF
$(cat src/infrastructure/db/rls/policies.sql)
EOF
```

### 3.5 Seed-Daten laden

```bash
npm run db:seed
```

Dies erstellt:
- Einen Test-Tenant ("Praxis Mustermann")
- Module (patients, calendar, exports, ai-assistant)
- Einen Admin-User (email: `admin@praxis-mustermann.local`, password: `admin123`)
- Aktiviert alle Module für den Tenant

## Schritt 4: Development Server starten

### Backend

```bash
cd backend
npm run dev
```

Server läuft auf: http://localhost:4000
Swagger UI: http://localhost:4000/docs

### Frontend

```bash
cd frontend
npm run dev
```

Frontend läuft auf: http://localhost:5180

## Schritt 5: Ollama Setup (Optional, für AI-Features)

Falls AI-Features verwendet werden sollen:

```bash
# Ollama installieren (macOS)
brew install ollama

# Ollama starten
ollama serve

# Model herunterladen
ollama pull gemma3:12b
# oder
ollama pull llama3-8b-instruct
```

## Troubleshooting

### Database Connection Error

- Prüfe ob PostgreSQL läuft: `pg_isready`
- Prüfe DATABASE_URL in `.env`
- Prüfe ob Database existiert: `psql -l | grep sensarion_v2`

### RLS Policies nicht aktiv

- Prüfe ob Policies erstellt wurden: `psql -d sensarion_v2 -c "\d+ patients"`
- Führe `policies.sql` manuell aus

### Prisma Migration Fehler

- Prüfe ob Database leer ist oder Migrationen bereits existieren
- Bei Konflikten: `npm run db:migrate:reset` (⚠️ löscht alle Daten!)

### Port bereits belegt

- Backend: Ändere `PORT` in `backend/.env`
- Frontend: Ändere Port in `frontend/vite.config.ts` oder `package.json`

## Nächste Schritte

1. ✅ Dependencies installiert
2. ✅ Environment Variables konfiguriert
3. ✅ Database Setup
4. ⏭️ Tests schreiben
5. ⏭️ Weitere Features implementieren

