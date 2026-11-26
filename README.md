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
- Spieler einzeln freigeben oder sperren
- Inhalte, Belohnungen und Freischaltzeit für 24 Türchen verwalten

Spieler werden nach dem Anlegen zunächst nicht freigegeben.

## Projektstatus

Die Projektstruktur, die weihnachtliche Login-Oberfläche und das geschützte Admin-Panel sind angelegt. Die Spieleranmeldung und der interaktive Kalender werden als nächste Funktionen ergänzt.