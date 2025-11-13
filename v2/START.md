# Sensarion v2 - Start Anleitung

## ✅ Setup abgeschlossen!

Alle Komponenten sind eingerichtet und bereit zum Start.

## 🚀 Server starten

### Option 1: Beide Server gleichzeitig (empfohlen)

```bash
cd /Users/Fluvento_Solutions/Documents/SENSARION/v1/v2
npm run dev
```

### Option 2: Getrennt starten

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend läuft auf: http://localhost:4000
Swagger UI: http://localhost:4000/docs

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend läuft auf: http://localhost:5180

## 🔐 Login-Daten

Nach dem Start kannst du dich einloggen mit:

- **Email:** `admin@praxis-mustermann.local`
- **Passwort:** `admin123`

## 📋 Was wurde eingerichtet?

✅ Dependencies installiert (Backend & Frontend)
✅ Environment-Variablen konfiguriert (.env Dateien)
✅ Database Schema angewendet (Prisma)
✅ Seed-Daten geladen (Tenant, User, Module)
✅ TypeScript-Fehler behoben
✅ Alle Komponenten implementiert

## 🎯 Nächste Schritte

1. Server starten (siehe oben)
2. Browser öffnen: http://localhost:5180
3. Einloggen mit den oben genannten Credentials
4. Patienten verwalten!

## ⚠️ Hinweise

- **RLS Policies:** Die Row Level Security Policies müssen noch manuell aktiviert werden (siehe `backend/DATABASE_SETUP.md`)
- **Ollama:** Für AI-Features muss Ollama lokal installiert und gestartet sein
- **PostgreSQL:** Muss laufen (Port 5432)

## 🐛 Troubleshooting

### Backend startet nicht
- Prüfe ob PostgreSQL läuft: `brew services list | grep postgres`
- Prüfe `.env` Datei in `backend/`
- Prüfe ob Port 4000 frei ist

### Frontend startet nicht
- Prüfe `.env` Datei in `frontend/`
- Prüfe ob Port 5180 frei ist
- Prüfe ob Backend läuft

### Login funktioniert nicht
- Prüfe ob Backend läuft
- Prüfe Browser-Konsole für Fehler
- Prüfe Backend-Logs

