# Sensarion Praxis-Cockpit (Prototype)

Photorealistic, sterile UI prototype for the Sensarion Praxis-Cockpit built with Vue 3, Vite, TypeScript, and Tailwind CSS.

## Voraussetzungen

- Node.js ≥ 18.17 (empfohlen: aktuelle LTS)
- npm ≥ 9 (alternativ pnpm/yarn – Anleitung nutzt npm)

## Projekt einrichten

```bash
npm install
npm --prefix server install
```

## Entwicklung starten

```bash
npm run dev
```

Der Vite-Devserver startet unter [http://localhost:5180](http://localhost:5180). Hot Module Replacement (HMR) ist aktiv.

### API-Server

```bash
npm run dev:server
```

Die Node/Express-API lauscht standardmäßig auf `http://localhost:4000`. Vite-Projekt und API können parallel gestartet werden.

## Produktionsbuild erstellen

```bash
npm run build
npm --prefix server run build
```

Der fertige Build liegt anschließend in `dist/` und kann mit `npm run preview` lokal getestet werden.

## Codequalität

```bash
npm run lint
npm --prefix server run lint
```

## Datenbank & Prisma

- Prisma-Schema liegt unter `server/prisma/schema.prisma`.
- Client generieren: `npm run prisma:generate` (Backend muss installiert sein).
- Migration erstellen: `npm run prisma:migrate`.
- Seeds liegen in `server/prisma/seed.ts` (wird mit `npm run db:seed` ausgeführt, benötigt passende `DATABASE_URL`).

## Entwicklung-Login

Für lokale Tests steht ein Dev-Login bereit:

- Benutzer: `max.mustermann@sensarion.local`
- Passwort: `Pa$$w0rd` (konfigurierbar über `DEV_LOGIN_PASSWORD` in `server/.env`)

Die Frontend-App führt beim Laden automatisch einen Dev-Login aus und zeigt das Profil in der Kopfzeile.

## Projektstruktur

- `src/App.vue`: Root-Komponente, bindet Layout und Platzhalter
- `src/components/layout/`: Shell, Header, Sidebar, Context-Panel
- `src/components/dashboard/`: Platzhalter für Dashboard-Module
- `src/assets/main.css`: Globale Styles, Tailwind-Layer, Utility-Erweiterungen
- `server/`: Node/Express-API mit PostgreSQL- und Ollama-Anbindung (lokale `.env` erforderlich)

Weitere Änderungen werden fortlaufend im `CHANGELOG.md` dokumentiert.

