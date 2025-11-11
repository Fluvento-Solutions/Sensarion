# Sensarion Praxis-Cockpit (Prototype)

Photorealistic, sterile UI prototype for the Sensarion Praxis-Cockpit built with Vue 3, Vite, TypeScript, and Tailwind CSS.

## Voraussetzungen

- Node.js ≥ 18.17 (empfohlen: aktuelle LTS)
- npm ≥ 9 (alternativ pnpm/yarn – Anleitung nutzt npm)
- Lokale PostgreSQL-Instanz (z. B. Postgres.app) mit Datenbank `sensarion`
- Lokale Ollama-Installation (Standard-Port `11434`)

## Projekt einrichten

```bash
npm install
npm --prefix server install
```

### Umgebungsvariablen vorbereiten

```
cp server/env.template server/.env
```

Passe anschließend die Werte in `server/.env` an (PostgreSQL-Zugang, Ollama-Endpunkt, Dev-Login-Passwort). Das Feld `SESSION_SECRET` wird zur Signierung der JWT-Token benutzt und sollte lokal ein ausreichend langes (≥16 Zeichen) Geheimnis enthalten.

### Datenbank vorbereiten

```bash
npm --prefix server run prisma:generate
npm --prefix server run prisma:migrate
npm --prefix server run db:seed
```

## Entwicklung starten

```bash
npm run dev            # Startet Frontend (5180) und Backend (4000) parallel
```

Einzelne Dienste:

```bash
npm run dev:frontend   # Nur Vite-Frontend
npm run dev:server     # Nur Express-Backend
```

Der Vite-Devserver ist via Proxy mit dem Backend verbunden (`/api/*`). Das Backend beendet sich sauber bei Ctrl+C; bei Port-Konflikten erscheint nun ein aussagekräftiger Hinweis.

## Produktionsbuild erstellen

```bash
npm run build
npm --prefix server run build
```

Der fertige Build liegt anschließend in `dist/` und kann mit `npm run preview` lokal getestet werden. Für das Backend steht `npm --prefix server run start` bereit.

## Codequalität

```bash
npm run lint
npm --prefix server run lint
```

## Datenbank & Prisma

- Prisma-Schema liegt unter `server/prisma/schema.prisma`.
- Client generieren: `npm --prefix server run prisma:generate`.
- Migration erstellen: `npm --prefix server run prisma:migrate`.
- Seeds liegen in `server/prisma/seed.ts` und werden mit `npm --prefix server run db:seed` ausgeführt.
- Aus dem Projektwurzelverzeichnis stehen Kurzbefehle bereit: `npm run db:migrate`, `npm run db:generate`, `npm run db:seed`.

## Entwicklung-Login

Für lokale Tests steht ein Dev-Login bereit:

- Benutzer: `max.mustermann@sensarion.local`
- Passwort: `Pa$$w0rd` (konfigurierbar über `DEV_LOGIN_PASSWORD` in `server/.env`)

Nach dem Start öffnet sich eine Login-Karte in der PWA. Gib dort E-Mail & Passwort ein; optional kann die E-Mail-Adresse gemerkt werden. Für lokale Tests kannst du den Schalter „Dev-Login verwenden“ aktivieren – dann wird das oben konfigurierte Default-Passwort akzeptiert. Nach erfolgreichem Login erscheint das Profil in der Kopfzeile. Über den eingebauten Logout-Button wird die Session beendet und der Login-Screen erneut angezeigt.

Falls die Datenbank nicht erreichbar ist, informiert das Backend mit einem `503 DATABASE_UNAVAILABLE`.

## Projektstruktur

- `src/App.vue`: Root-Komponente, bindet Layout und Platzhalter
- `src/components/layout/`: Shell, Header, Sidebar, Context-Panel
- `src/components/dashboard/`: Platzhalter für Dashboard-Module
- `src/assets/main.css`: Globale Styles, Tailwind-Layer, Utility-Erweiterungen
- `server/`: Node/Express-API mit PostgreSQL- und Ollama-Anbindung (lokale `.env` erforderlich)

Weitere Änderungen werden fortlaufend im `CHANGELOG.md` dokumentiert.

