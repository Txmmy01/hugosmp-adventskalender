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
npx prisma migrate dev --name init
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

Die lokale Entwicklung verwendet SQLite. Für ein öffentliches Deployment muss eine dauerhaft gespeicherte Datenbank eingerichtet werden. Die SQLite-Datei darf bei Neustarts oder Deployments nicht verloren gehen. Für Serverless-Hosting ist eine externe PostgreSQL-Datenbank die empfohlene Produktionskonfiguration; dafür muss das Prisma-Datenbankschema entsprechend umgestellt werden.

## Projektstatus

Login, Spielersitzungen, Admin-Spielerverwaltung, individuelle Passwortänderungen, Geschenkverwaltung und die serverseitige Freischaltprüfung sind implementiert. Vor dem Livegang müssen Build, Datenbankmigration und Deployment-Konfiguration getestet werden.