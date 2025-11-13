# Sensarion v1 Repository-Analyse

## Struktur-Übersicht

### Frontend
- **Stack**: Vue 3 + TypeScript + Vite + Tailwind CSS
- **State Management**: Pinia (nur für Auth, `useAuthStore.ts`)
- **Routing**: Kein Vue Router implementiert
- **Server State**: Direkte `fetch`-Calls in `services/api.ts`, kein Vue Query
- **Struktur**: Komponenten-basiert (`components/`), keine Feature-Folders
- **i18n**: Nicht implementiert
- **White-Label**: Teilweise (Logo, Primary Color in Practice Settings)

### Backend
- **Stack**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT (12h Expiry, kein Refresh Token)
- **AI Integration**: Ollama (lokaler Service, Streaming unterstützt)
- **Struktur**: Route-basiert (`routes/`), keine klare Schichtung
- **Error Handling**: Inconsistent, kein RFC 7807 Format
- **OpenAPI**: Nicht vorhanden

### Datenbank
- **Schema**: Prisma (`server/prisma/schema.prisma`)
- **Multi-Tenant**: Nur `practiceId` als Foreign Key, keine echte Multi-Tenant-Architektur
- **RLS**: Nicht implementiert (Row Level Security fehlt komplett)
- **Indizes**: Teilweise vorhanden, aber nicht optimal
- **JSON Fields**: Viele komplexe Daten in JSON-Feldern (vitalsHistory, allergies, medications, diagnoses, findings, auditLogs)

## Layer-Violations

### 1. Business-Logik in Routes
**Problem**: Alle Business-Logik befindet sich direkt in den Route-Handlern.

**Beispiele**:
- `server/src/routes/patients.ts`: 2356 Zeilen mit kompletter CRUD-Logik
- `server/src/routes/auth.ts`: Authentifizierungs-Logik direkt in Routes
- `server/src/routes/ollama.ts`: AI-Integration direkt in Routes

**Impact**: 
- Keine Testbarkeit
- Keine Wiederverwendbarkeit
- Schwer zu refactoren

### 2. Duplikate Auth-Middleware
**Problem**: Auth-Middleware wird in mehreren Dateien dupliziert.

**Beispiele**:
- `server/src/routes/auth.ts`: `requireAuth` Middleware
- `server/src/routes/patients.ts`: `getAuthUser` + `requireAuth` (kopiert)
- `server/src/routes/ollama.ts`: `getAuthUser` + `requireAuth` (kopiert)

**Impact**: 
- Inkonsistente Implementierung
- Wartungsaufwand bei Änderungen
- Potenzielle Security-Lücken

### 3. Direkte Prisma-Calls in Routes
**Problem**: Routes rufen Prisma direkt auf, keine Repository-Abstraktion.

**Beispiel**:
```typescript
// server/src/routes/patients.ts:265
const allPatients = await prisma.patient.findMany({
  where: { practiceId: user.practiceId, isDeleted: false },
  orderBy: { updatedAt: 'desc' },
  take: 100
});
```

**Impact**: 
- Keine Möglichkeit für Caching
- Schwer zu mocken in Tests
- Business-Logik vermischt mit Datenzugriff

## DTO/Parameter-Inkonsistenzen

### 1. Naming Conventions
**Problem**: Inkonsistente Verwendung von snake_case und camelCase.

**Beispiele**:
- API Responses: `patient_id`, `birth_date`, `vitals_latest` (snake_case)
- Request Bodies: `birthDate`, `vitalsLatest` (camelCase)
- Database: `practiceId`, `createdAt` (camelCase)

**Impact**: 
- Verwirrung für Frontend-Entwickler
- Fehleranfällig bei Transformationen

### 2. Fehlende Validierung
**Problem**: Validierung nur mit Zod, aber nicht zentralisiert.

**Beispiele**:
- Jede Route definiert eigene Schemas
- Keine gemeinsamen Validierungsregeln
- Fehlende Business-Rule-Validierung

## Performance-Hotspots

### 1. In-Memory-Filterung bei Patientensuche
**Problem**: Alle Patienten werden aus DB geladen, dann im Memory gefiltert.

**Code**:
```typescript
// server/src/routes/patients.ts:265-289
const allPatients = await prisma.patient.findMany({
  where: { practiceId: user.practiceId, isDeleted: false },
  orderBy: { updatedAt: 'desc' },
  take: 100
});

// Filtere im Memory (da JSON-Suche in Prisma komplex ist)
const patients = searchTerm
  ? allPatients.filter(p => {
      const nameObj = p.name as { given?: string[]; family?: string };
      const givenNames = (nameObj.given || []).join(' ').toLowerCase();
      const familyName = (nameObj.family || '').toLowerCase();
      const fullName = `${givenNames} ${familyName}`.trim();
      const tagsStr = p.tags.join(' ').toLowerCase();
      
      return (
        p.id.toLowerCase().includes(searchTerm) ||
        fullName.includes(searchTerm) ||
        tagsStr.includes(searchTerm)
      );
    })
  : allPatients;
```

**Impact**: 
- Skaliert nicht bei vielen Patienten
- Unnötige Datenbank-Last
- Langsame Antwortzeiten

**Lösung**: PostgreSQL Full-Text-Search oder separate Search-Tabelle

### 2. Fehlende Indizes
**Problem**: Nicht alle häufig abgefragten Felder sind indiziert.

**Beispiele**:
- `Patient.name` (JSON-Feld) nicht durchsuchbar
- `Patient.tags` (Array) nicht indiziert
- Keine Composite-Indizes für häufige Query-Patterns

### 3. N+1 Query Problem
**Problem**: Potenzielle N+1 Queries bei Relations.

**Beispiel**:
```typescript
// server/src/routes/ollama.ts:150-162
const patient = await prisma.patient.findUnique({
  where: { id: parsed.data.patientId },
  include: {
    notes: { orderBy: { createdAt: 'desc' }, take: 10 },
    encounters: { orderBy: { date: 'desc' }, take: 10 }
  }
});
```

**Impact**: 
- Mehrere DB-Roundtrips
- Langsame Antwortzeiten

### 4. Fehlendes Caching
**Problem**: Keine Caching-Strategie implementiert.

**Impact**: 
- Wiederholte DB-Queries für gleiche Daten
- Unnötige Ollama-Requests für ähnliche Prompts

## Security-Risiken

### 1. Keine Row Level Security (RLS)
**Problem**: RLS ist nicht implementiert, alle Tenant-Isolation erfolgt in Application-Layer.

**Risiko**: 
- SQL-Injection könnte Tenant-Barrieren umgehen
- Fehlerhafte Queries könnten Daten anderer Tenants exponieren
- Keine Defense-in-Depth

**Aktueller Zustand**:
```typescript
// server/src/routes/patients.ts:400
const patient = await prisma.patient.findFirst({
  where: {
    id: req.params.id,
    practiceId: user.practiceId  // Nur Application-Level Check
  }
});
```

### 2. JWT ohne Refresh Token
**Problem**: JWT hat 12h Expiry, kein Refresh-Mechanismus.

**Risiko**: 
- Lange-lived Tokens erhöhen Angriffsfläche
- Keine Möglichkeit, Tokens zu revoken
- Bei Kompromittierung: 12h Gültigkeit

**Code**:
```typescript
// server/src/routes/auth.ts:99
const issueToken = (userId: string) =>
  jwt.sign({ userId }, env.SESSION_SECRET, { expiresIn: '12h' });
```

### 3. Schwache AuthZ-Boundaries
**Problem**: Authorization-Checks sind inkonsistent und nicht zentralisiert.

**Beispiele**:
- `isPracticeAdmin` Check nur in einigen Routes
- Keine Role-Based Access Control (RBAC) Implementierung
- Team-Permissions werden nicht konsequent geprüft

### 4. Secrets in Code/Logs
**Problem**: Potenzielle Exponierung von Secrets.

**Risiken**:
- `SESSION_SECRET` könnte in Logs erscheinen
- Keine Rotation-Strategie
- Passwörter könnten in Error-Messages erscheinen

### 5. Fehlende Rate Limiting
**Problem**: Keine Rate Limiting implementiert.

**Risiko**: 
- Brute-Force-Angriffe auf Login
- DDoS-Anfälligkeit
- Ollama-Endpoint könnte überlastet werden

## Fehlende Features

### 1. Keine OpenAPI-Spezifikation
**Problem**: Keine API-Dokumentation als Single Source of Truth.

**Impact**: 
- Frontend muss manuell Types generieren
- Keine automatische Validierung
- Schwer zu versionieren

### 2. Keine Tests
**Problem**: Keine Unit-, Integration- oder E2E-Tests.

**Impact**: 
- Refactoring ist riskant
- Regressions-Risiko
- Keine Dokumentation durch Tests

### 3. Keine CI/CD
**Problem**: Keine automatisierten Checks oder Deployments.

**Impact**: 
- Manuelle Qualitätssicherung
- Inkonsistente Deployments
- Keine automatische Dependency-Scans

### 4. Keine Multi-Tenant-Architektur
**Problem**: Nur `practiceId`-basiert, keine echte Multi-Tenant-Struktur.

**Impact**: 
- Schwer zu skalieren
- Keine Tenant-Isolation auf DB-Level
- Keine Module-basierte Billing-Struktur

### 5. Keine Export-Funktionalität
**Problem**: Keine Datenportabilität implementiert.

**Impact**: 
- Keine Compliance mit DSGVO (Datenexport)
- Keine FHIR-Integration
- Keine Migration-Möglichkeiten

## Error-Handling-Gaps

### 1. Inkonsistente Error-Formate
**Problem**: Verschiedene Error-Formate in verschiedenen Routes.

**Beispiele**:
```typescript
// server/src/routes/auth.ts:121
return res.status(401).json<AuthErrorResponse>({
  status: 'error',
  message: 'Authentifizierung erforderlich',
  code: 'AUTH_REQUIRED'
});

// server/src/routes/patients.ts:319
return res.status(500).json({
  status: 'error',
  message: 'Fehler beim Laden der Patienten'
});
```

**Impact**: 
- Frontend muss verschiedene Formate handhaben
- Keine strukturierte Fehlerbehandlung
- Schwer zu debuggen

### 2. Fehlende RFC 7807 Compliance
**Problem**: Keine standardisierte Error-Format.

**Impact**: 
- Keine Interoperabilität
- Schwer zu dokumentieren
- Keine automatische Error-Handling

### 3. Try-Catch-Verschachtelungen
**Problem**: Übermäßige try-catch-Blöcke ohne klare Fehler-Propagation.

**Beispiel**:
```typescript
// server/src/routes/auth.ts:187-223
try {
  const result = await authenticateUser(parsed.data.email, parsed.data.password);
  if ('error' in result) {
    // ...
  }
  return respondWithAuth(res, result.user);
} catch (error) {
  console.error('login failed', error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // ...
  }
  return res.status(500).json({ /* ... */ });
}
```

**Impact**: 
- Unübersichtlicher Code
- Fehler werden verschluckt
- Schwer zu debuggen

## TOP-10-TO-DOS für v2

### 1. Clean Architecture implementieren
**Priorität**: Hoch
**Aufwand**: Hoch
**Impact**: Fundamentale Verbesserung der Codebase

- Presentation Layer (Frontend)
- Application Layer (Use Cases, Policies, DTOs)
- Domain Layer (Entities, Value Objects, Domain Services)
- Infrastructure Layer (HTTP, DB, AI, Payment)

### 2. OpenAPI als Single Source of Truth
**Priorität**: Hoch
**Aufwand**: Mittel
**Impact**: API-Dokumentation, Type-Generation, Validierung

- OpenAPI 3.0 Spezifikation
- Automatische Type-Generation für Frontend
- Request/Response-Validierung

### 3. Multi-Tenant mit RLS (deny by default)
**Priorität**: Hoch
**Aufwand**: Hoch
**Impact**: Security, Skalierbarkeit, Compliance

- PostgreSQL RLS Policies
- Tenant-Isolation auf DB-Level
- Module-basierte Billing-Struktur

### 4. Vue Query für Server-State
**Priorität**: Mittel
**Aufwand**: Mittel
**Impact**: Bessere UX, weniger Boilerplate, Caching

- Alle Server-State via `useQuery`/`useMutation`
- Optimistic Updates
- Automatisches Caching & Invalidation

### 5. RFC 7807 Error Format
**Priorität**: Mittel
**Aufwand**: Niedrig
**Impact**: Standardisierte Fehlerbehandlung

- Strukturierte Error-Responses
- Type-Safe Error-Handling
- Bessere Debugging-Möglichkeiten

### 6. Module-basiertes Billing
**Priorität**: Mittel
**Aufwand**: Mittel
**Impact**: Monetarisierung, Flexibilität

- `modules` Tabelle
- `tenant_modules` für Subscriptions
- Feature Gates basierend auf Subscriptions

### 7. FHIR-Export (Patient/Encounter/Observation/Consent/DocumentReference)
**Priorität**: Niedrig
**Aufwand**: Hoch
**Impact**: Interoperabilität, Compliance

- FHIR R4 Bundle Generation
- Versioned Export-Schemas
- JSON/NDJSON Export als Alternative

### 8. CI/CD Pipeline
**Priorität**: Mittel
**Aufwand**: Mittel
**Impact**: Qualitätssicherung, Automatisierung

- Lint/Format Checks
- Unit & Integration Tests
- OpenAPI Diff Validation
- DB Migration Dry-Run
- Dependency Scans

### 9. White-Label Support
**Priorität**: Niedrig
**Aufwand**: Niedrig
**Impact**: Kundenanpassung

- Theme Tokens (Colors, Logos)
- Product/Tenant-spezifische Copy
- CSS Variables für Overrides

### 10. AI-Performance-Optimierung
**Priorität**: Mittel
**Aufwand**: Mittel
**Impact**: Bessere Response-Zeiten, Kostenreduktion

- Prompt-Template-Caching (Fingerprint)
- Timeouts & Retries (Exponential Backoff)
- Circuit Breaker
- Warm-up auf Startup
- Batch-Processing für Exports

## Zusammenfassung

Die v1-Codebase ist funktional, aber hat erhebliche architektonische Schwächen:

1. **Keine klare Schichtung**: Business-Logik vermischt mit Infrastructure
2. **Security-Lücken**: Keine RLS, schwache AuthZ, lange-lived Tokens
3. **Performance-Probleme**: In-Memory-Filterung, fehlende Indizes, kein Caching
4. **Fehlende Qualitätssicherung**: Keine Tests, keine CI/CD, keine OpenAPI
5. **Inkonsistente Patterns**: Verschiedene Error-Formate, duplizierte Code

Die v2-Architektur sollte diese Probleme systematisch angehen mit:
- Clean Architecture für klare Schichtung
- Multi-Tenant mit RLS für Security
- OpenAPI-First für Dokumentation & Validierung
- Vue Query für besseres State Management
- Pragmatischer Code-Stil für Wartbarkeit

