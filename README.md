# HugoSMP Adventskalender

Weihnachtlicher Adventskalender für die HugoSMP-Community.

## Voraussetzungen

- Node.js 20.9 oder neuer
- npm

## Installation

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

Die Anwendung läuft anschließend unter http://localhost:3000.

## Admin-Zugang

Erzeuge einen sicheren Passwort-Hash:

```bash
node scripts/hash-password.mjs
```

Trage den ausgegebenen Wert als `ADMIN_PASSWORD_HASH` in deine lokale `.env`-Datei ein. Setze außerdem einen zufälligen `SESSION_SECRET` mit mindestens 32 Zeichen. Zugangsdaten gehören niemals ins Repository.

Das Admin-Panel erreichst du unter http://localhost:3000/admin.

## Admin-Funktionen

- Minecraft-Spieler mit eigenem Webseiten-Passwort anlegen
- Spieler einzeln freigeben, deaktivieren und wieder aktivieren
- Spielerpasswörter einzeln neu setzen
- Inhalte, Belohnungen und Freischaltzeit für 24 Türchen verwalten

Spieler werden nach dem Anlegen zunächst nicht freigegeben. Passwörter werden mit bcrypt gehasht und sind nicht im Klartext einsehbar.

## Spielerbereich

- Anmeldung mit Minecraft-Namen und dem vom Admin gesetzten Webseiten-Passwort
- Nur freigegebene und aktive Spieler erhalten eine Sitzung
- Der Kalender zeigt 24 nummerierte Geschenke
- Veröffentlichte Geschenke werden erst ab ihrer Freischaltzeit serverseitig geöffnet
- Geöffnete Türchen und Belohnungen werden pro Spieler gespeichert

Der Kalender ist unter http://localhost:3000/calendar erreichbar.

## Datenbank und Deployment

Das Repository enthält eine initiale SQLite-Migration. Lokal wird sie mit `npx prisma migrate dev` angewendet. In einer Produktionsumgebung werden bereits eingecheckte Migrationen mit `npx prisma migrate deploy` angewendet.

Die lokale Entwicklung verwendet SQLite. Für öffentliches Serverless-Hosting ist eine dauerhaft gespeicherte PostgreSQL-Datenbank zu verwenden; dafür müssen Prisma-Datasource und `DATABASE_URL` auf PostgreSQL umgestellt und eine passende PostgreSQL-Migration erzeugt werden. Eine lokale SQLite-Datei ist nicht als persistente Produktionsdatenbank für Serverless-Hosting geeignet.

Vor dem Deployment müssen `DATABASE_URL`, `SESSION_SECRET` (mindestens 32 Zeichen) und `ADMIN_PASSWORD_HASH` als geheime Umgebungsvariablen gesetzt sein. `npm run build` und `npx tsc --noEmit` müssen erfolgreich durchlaufen.

## Projektstatus

Login, Spielersitzungen, Admin-Spielerverwaltung, individuelle Passwortänderungen, Geschenkverwaltung und die serverseitige Freischaltprüfung sind implementiert. Vor dem Livegang müssen Build, Datenbankmigration und Deployment-Konfiguration getestet werden.