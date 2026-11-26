# 🎄 Weihnachts-Adventskalender-Bot

Ein Discord-Bot für eine Weihnachtsaktion innerhalb eines Minecraft-Clans. Der Weihnachtsgedanke steht im Mittelpunkt.

## Voraussetzungen

- Node.js 20 oder neuer
- Ein Discord-Bot im [Discord Developer Portal](https://discord.com/developers/applications)
- Bot mit den Scopes `bot` und `applications.commands`
- Bot-Berechtigungen: Nachrichten senden, Embeds senden und Nachrichtenverlauf lesen

## Installation

1. Repository herunterladen.
2. Im Projektordner `npm install` ausführen.
3. Eine Datei `.env` anlegen:
   ```env
   DISCORD_TOKEN=DEIN_BOT_TOKEN
   DISCORD_APPLICATION_ID=DEINE_APPLICATION_ID
   DISCORD_GUILD_ID=DEINE_SERVER_ID
   ```
4. In `config.yml` die Server-ID unter `discord.guildId` und die Admin-Rollen unter `discord.adminRoleIds` eintragen.
5. Mit `npm start` starten.

Das Bot-Token gehört ausschließlich in `.env`, niemals in `config.yml` oder GitHub.

## Erste Einrichtung

- `/advent-setup`: veröffentlicht den Kalender im aktuellen Kanal.
- `/advent-register`: Spieler verknüpfen ihren Minecraft-Namen.
- `/advent`: Kalender privat anzeigen.
- `/advent-status`: eigene Öffnungen und Übergabestatus anzeigen.
- `/advent-admin`: offene Belohnungen verwalten.

Administratoren benötigen entweder die Discord-Berechtigung Administrator oder eine Rolle aus `discord.adminRoleIds`.

## Ablauf

Der Kalender startet standardmäßig am 1. Dezember 2026 um 00:00 Uhr in der Zeitzone Europe/Berlin. Die tägliche Ankündigung erfolgt um 09:00 Uhr. Beides kann in `config.yml` geändert werden.

Jeder Spieler kann jedes Türchen nur einmal öffnen. Der Bot speichert die Belohnung beim Öffnen unveränderlich in SQLite. Die Ausgabe ist zunächst manuell: Ein Admin übergibt die Belohnung im Spiel und bestätigt danach die Übergabe über `/advent-admin`.

Die Datenbank `advent.sqlite` wird automatisch angelegt und enthält Registrierungen, Öffnungen und Übergaben. Sie sollte regelmäßig gesichert werden.

## Hinweise zum Betrieb

Der Bot muss dauerhaft laufen, damit Buttons und tägliche Ankündigungen funktionieren. Ein Neustart ist unproblematisch: Daten und Kalendernachricht werden aus SQLite wiederhergestellt. Falls die Kalendernachricht gelöscht wurde, einfach erneut `/advent-setup` ausführen.

Die Belohnungen und Texte werden ausschließlich in `config.yml` gepflegt. Nach Änderungen den Bot neu starten.

## Sicherheit

- Bot-Token niemals teilen oder committen.
- Admin-Rollen sparsam vergeben.
- Die SQLite-Datei nicht öffentlich hochladen.
- Keine RCON-Zugangsdaten eintragen: Der Bot führt keine automatischen Minecraft-Befehle aus.
