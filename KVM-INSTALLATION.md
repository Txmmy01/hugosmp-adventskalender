# HugoSMP-Adventskalender – KVM-Server-Installation

Diese Anleitung richtet den HugoSMP-Adventskalender auf einem eigenen KVM-Server ein. Empfohlen wird **Ubuntu Server 24.04 LTS (64-bit)**.

## Zielumgebung

- Ubuntu Server 24.04 LTS
- Node.js 22 LTS und npm
- Next.js im Produktionsmodus
- SQLite auf persistenter Server-Festplatte
- PM2 für Prozessüberwachung und Neustarts
- Nginx als Reverse Proxy
- Let's Encrypt für HTTPS

SQLite passt zu einer einzelnen App-Instanz auf einem KVM-Server mit dauerhaftem Speicher. Die Datenbankdatei muss gesichert werden. Für mehrere parallele App-Server wäre PostgreSQL sinnvoller.

## 1. Ubuntu installieren und verbinden

Im KVM-Verwaltungsbereich Ubuntu Server 24.04 LTS installieren, SSH-Zugang einrichten und die öffentliche IP-Adresse notieren.

Vom eigenen PC verbinden:

```bash
ssh root@DEINE_SERVER_IP
```

## 2. System aktualisieren und Firewall konfigurieren

```bash
apt update && apt upgrade -y
apt install -y curl git nginx ufw build-essential
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

Wichtig: SSH muss vor dem Aktivieren der Firewall freigegeben sein, damit du dich nicht aussperrst.

## 3. Benutzer für die Anwendung erstellen

```bash
adduser hugosmp
usermod -aG sudo hugosmp
su - hugosmp
```

Die weiteren Befehle laufen als Benutzer `hugosmp`, außer wenn ausdrücklich `sudo` davorsteht.

## 4. Node.js 22 installieren

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Die Node-Version sollte mit `v22` beginnen.

## 5. Projekt herunterladen

```bash
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/Txmmy01/hugosmp-adventskalender.git
cd hugosmp-adventskalender
```

Bei einem privaten Repository muss vorher ein sicherer GitHub-Zugriff eingerichtet werden, zum Beispiel mit einem Deploy-Key.

## 6. Produktionsvariablen setzen

Die Vorlage des Projekts verwenden:

```bash
cp .env.example .env
nano .env
```

Die Datei muss mindestens diese Werte enthalten:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="HIER_EINEN_ZUFAELLIGEN_SECRET_EINTRAGEN"
ADMIN_PASSWORD_HASH="HIER_DEN_BCRYPT_HASH_EINTRAGEN"
APP_URL="https://DEINE-DOMAIN"
```

Einen zufälligen Session-Schlüssel erzeugen:

```bash
openssl rand -base64 48
```

Den kompletten ausgegebenen Wert als `SESSION_SECRET` eintragen. Er muss mindestens 32 Zeichen lang sein.

Admin-Passwort-Hash erzeugen. Das Projekt enthält dafür ein Skript:

```bash
node scripts/hash-password.mjs
```

Das Skript fragt das Admin-Passwort verdeckt bzw. interaktiv ab und gibt den bcrypt-Hash aus. Das Passwort muss mindestens 14 Zeichen lang sein. Den ausgegebenen Hash als Wert von `ADMIN_PASSWORD_HASH` eintragen. Niemals das Klartext-Passwort eintragen.

Dateirechte einschränken:

```bash
chmod 600 .env
```

Die Datei `.env` darf nicht in GitHub eingecheckt oder öffentlich geteilt werden.

### SQLite-Dateipfad beachten

Das Prisma-Schema liegt in `prisma/schema.prisma`. Bei `DATABASE_URL="file:./dev.db"` liegt die Datenbankdatei relativ zum Schema-Verzeichnis normalerweise unter `prisma/dev.db`. Nach dem ersten Datenbankstart den tatsächlichen Speicherort prüfen und diesen Pfad für Backups verwenden.

## 7. Abhängigkeiten und Datenbank installieren

Im Projektordner:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

`migrate deploy` wendet die eingecheckten Migrationen an. Für den Server keine neue Entwicklungs-Migration mit `prisma migrate dev` erzeugen.

## 8. Produktions-Build testen

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Alle drei Befehle müssen erfolgreich durchlaufen. Wenn ein Befehl fehlschlägt, erst den Fehler beheben und nicht mit dem Livegang fortfahren.

## 9. PM2 einrichten

```bash
sudo npm install -g pm2
cd ~/apps/hugosmp-adventskalender
pm2 start npm --name hugosmp-adventskalender -- start
pm2 save
pm2 startup
```

PM2 gibt nach `pm2 startup` einen zusätzlichen Systembefehl aus. Diesen vollständig kopieren und ausführen. Anschließend:

```bash
pm2 save
pm2 status
```

Nützliche Befehle:

```bash
pm2 logs hugosmp-adventskalender
pm2 restart hugosmp-adventskalender
pm2 stop hugosmp-adventskalender
pm2 status
```

Die App lauscht standardmäßig auf Port 3000. Sie sollte später nur über Nginx öffentlich erreichbar sein.

## 10. Domain konfigurieren

Bei deinem Domain-Anbieter einen DNS-A-Record anlegen:

- Host/Name: `@`
- Ziel/Wert: öffentliche IPv4-Adresse deines KVM-Servers

Optional einen weiteren A-Record für `www` anlegen. Nur wenn `www` tatsächlich auf den Server zeigt, darf es in den folgenden Nginx- und Certbot-Konfigurationen aufgeführt werden. DNS-Änderungen können etwas Zeit benötigen.

## 11. Nginx konfigurieren

Datei anlegen:

```bash
sudo nano /etc/nginx/sites-available/hugosmp
```

Inhalt – `advent.example.de` durch deine echte Domain ersetzen. Falls du kein `www` eingerichtet hast, den `www`-Eintrag aus `server_name` entfernen:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name advent.example.de www.advent.example.de;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Aktivieren und prüfen:

```bash
sudo ln -s /etc/nginx/sites-available/hugosmp /etc/nginx/sites-enabled/hugosmp
sudo nginx -t
sudo systemctl reload nginx
```

Nur fortfahren, wenn `nginx -t` eine erfolgreiche Konfiguration meldet.

## 12. HTTPS aktivieren

Certbot installieren:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Für eine Domain mit eingerichtetem `www`:

```bash
sudo certbot --nginx -d advent.example.de -d www.advent.example.de
```

Ohne `www`:

```bash
sudo certbot --nginx -d advent.example.de
```

Die Anweisungen von Certbot befolgen. Erneuerung testen:

```bash
sudo certbot renew --dry-run
```

Danach sollte der Kalender unter `https://DEINE-DOMAIN` erreichbar sein.

## 13. Datenbank-Backups

SQLite enthält Spieler, Passwort-Hashes, Geschenke und Öffnungen. Erstelle regelmäßige Backups und kopiere diese zusätzlich auf einen anderen Server oder externen Speicher.

SQLite-Werkzeug installieren:

```bash
sudo apt install -y sqlite3
mkdir -p ~/backups
chmod 700 ~/backups
```

Wenn die Datenbank tatsächlich unter `prisma/dev.db` liegt:

```bash
cd ~/apps/hugosmp-adventskalender
sqlite3 prisma/dev.db ".backup '$HOME/backups/hugosmp-$(date +%F-%H%M).db'"
```

Vorher den Datenbankpfad prüfen. Ein Backup auf derselben Serverfestplatte schützt nicht vor einem Festplattenausfall. Backups nicht im öffentlichen Web-Verzeichnis speichern.

## 14. Updates veröffentlichen

Vor jedem Update zuerst ein Datenbank-Backup erstellen. Dann:

```bash
cd ~/apps/hugosmp-adventskalender
git pull
npm install
npx prisma generate
npx prisma migrate deploy
npm run lint
npx tsc --noEmit
npm run build
pm2 restart hugosmp-adventskalender
```

Wenn Build, Lint oder TypeScript-Prüfung fehlschlagen, die App nicht mit dem fehlerhaften Stand neu starten. Zuerst den Fehler beheben.

## 15. Fehlerdiagnose

App-Status und Logs:

```bash
pm2 status
pm2 logs hugosmp-adventskalender
```

Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx
sudo journalctl -u nginx --no-pager -n 100
```

Lokaler App-Test:

```bash
curl -I http://127.0.0.1:3000
```

Prisma-Migrationsstatus:

```bash
cd ~/apps/hugosmp-adventskalender
npx prisma migrate status
```

## Livegang-Checkliste

- [ ] Ubuntu Server 24.04 LTS installiert
- [ ] SSH-Zugang funktioniert
- [ ] Firewall erlaubt SSH, HTTP und HTTPS
- [ ] Eigenen Benutzer `hugosmp` erstellt
- [ ] Node.js 22 installiert
- [ ] Repository heruntergeladen
- [ ] `.env` mit sicheren echten Werten angelegt
- [ ] `SESSION_SECRET` zufällig und mindestens 32 Zeichen lang
- [ ] `ADMIN_PASSWORD_HASH` ist der bcrypt-Hash aus dem Projektskript
- [ ] Prisma-Client generiert und Migrationen angewendet
- [ ] Lint, TypeScript und Produktions-Build erfolgreich
- [ ] App läuft über PM2
- [ ] Domain zeigt auf die Server-IP
- [ ] Nginx-Konfiguration ist gültig
- [ ] HTTPS funktioniert
- [ ] Datenbank-Backup erstellt und extern gespeichert
- [ ] Admin-Login und Spieler-Login praktisch getestet
- [ ] Spielerfreigabe, Geschenkveröffentlichung und Türchenöffnung praktisch getestet

## Projektstatus und wichtige Einschränkung

Diese Datei dokumentiert die empfohlene Installation. Sie ist keine Garantie, dass ein Build oder Deployment bereits erfolgreich ausgeführt wurde. Vor dem öffentlichen Livegang müssen die CI-Prüfungen auf GitHub grün sein und die oben genannten Funktionen auf dem tatsächlichen Server getestet werden.

Das Projekt ist derzeit auf SQLite ausgelegt. Bei einer einzelnen Next.js-Instanz auf einem KVM-Server mit persistenter Festplatte kann diese Datenbank weiterverwendet werden. Für mehrere App-Instanzen oder verteiltes Hosting sollte auf PostgreSQL migriert werden.
