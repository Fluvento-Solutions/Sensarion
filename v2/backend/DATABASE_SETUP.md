# Database Setup Anleitung

## PostgreSQL starten

Falls PostgreSQL nicht läuft, starte es mit einem der folgenden Befehle:

### Option 1: Homebrew (macOS)
```bash
brew services start postgresql@14
# oder
brew services start postgresql@15
# oder
brew services start postgresql@16
```

### Option 2: PostgreSQL.app (macOS)
Öffne die PostgreSQL.app und starte den Server

### Option 3: Manuell
```bash
pg_ctl -D /usr/local/var/postgres start
```

## Database erstellen

Falls die Database noch nicht existiert:
```bash
createdb sensarion_v2
```

## Migrationen ausführen

Nachdem PostgreSQL läuft:

```bash
cd backend
npm run db:migrate
```

Wenn nach einem Migrationsnamen gefragt wird, gib ein: `init`

## Falls Lock-Fehler auftreten

Falls du einen "advisory lock" Fehler bekommst:

1. Warte 10-15 Sekunden und versuche es erneut
2. Oder prüfe ob eine andere Prisma-Instanz läuft:
   ```bash
   ps aux | grep prisma
   ```
3. Falls nötig, beende alle Prisma-Prozesse und versuche es erneut

## Seed-Daten laden

Nach erfolgreicher Migration:
```bash
npm run db:seed
```

Dies erstellt:
- Tenant "Praxis Mustermann"
- Admin-User: `admin@praxis-mustermann.local` / Passwort: `admin123`
- Alle Module aktiviert

