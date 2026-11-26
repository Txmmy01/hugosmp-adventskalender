import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const terminal = createInterface({ input: stdin, output: stdout });
const password = await terminal.question("Admin-Passwort: ");
terminal.close();

if (password.length < 14) {
  process.stderr.write("Das Admin-Passwort muss mindestens 14 Zeichen lang sein.\n");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);
process.stdout.write(`\nADMIN_PASSWORD_HASH=${passwordHash}\n`);