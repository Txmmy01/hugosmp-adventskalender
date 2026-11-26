require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const YAML = require("yaml");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require("discord.js");

const configPath = path.join(__dirname, "config.yml");
const config = YAML.parse(fs.readFileSync(configPath, "utf8"));
const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
if (!token || !applicationId) throw new Error("DISCORD_TOKEN und DISCORD_APPLICATION_ID fehlen in der .env-Datei.");
if (!config.calendar || !Array.isArray(config.calendar.days) || config.calendar.days.length !== 24) {
  throw new Error("config.yml muss genau 24 Kalendertage enthalten.");
}
if (!config.calendar.days.every((day, index) => day.day === index + 1 && day.title && day.reward)) {
  throw new Error("Die 24 Tage in config.yml müssen lückenlos nummeriert sein und Titel sowie Belohnung enthalten.");
}

const db = new Database(path.join(__dirname, "advent.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS players (
  discord_id TEXT PRIMARY KEY,
  minecraft_name TEXT NOT NULL,
  registered_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS openings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  minecraft_name TEXT NOT NULL,
  day INTEGER NOT NULL,
  reward_title TEXT NOT NULL,
  reward_text TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  delivered_at TEXT,
  delivered_by TEXT,
  UNIQUE(discord_id, day)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS announcements (
  date TEXT PRIMARY KEY,
  sent_at TEXT NOT NULL
);
`);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const timezone = config.calendar.timezone || "Europe/Berlin";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function localDate() {
  const parts = Object.fromEntries(dateFormatter.formatToParts(new Date()).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function currentDay() {
  const today = Date.parse(localDate() + "T00:00:00Z");
  const start = Date.parse(config.calendar.startDate + "T00:00:00Z");
  return Math.floor((today - start) / 86400000) + 1;
}

function isAdmin(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  const roles = config.discord.adminRoleIds || [];
  return roles.some(roleId => member.roles?.cache?.has(roleId));
}

function calendarEmbed() {
  const day = currentDay();
  const opened = db.prepare("SELECT COUNT(*) AS count FROM openings").get().count;
  return new EmbedBuilder()
    .setColor(config.messages.color || 0xB22222)
    .setTitle(config.messages.title || "🎄 Der große Weihnachts-Adventskalender")
    .setDescription(config.messages.description || "24 Türchen, 24 Überraschungen und jede Menge Weihnachtsstimmung!\n\nÖffne jeden Tag dein Türchen und entdecke deine Weihnachtsüberraschung. Frohe Weihnachten! 🎅")
    .addFields(
      { name: "📅 Heute", value: day >= 1 && day <= 24 ? `Türchen **${day}** ist freigeschaltet.` : day < 1 ? "Bald geht es los!" : "Alle Türchen wurden freigeschaltet. Frohe Weihnachten!", inline: true },
      { name: "🎁 Öffnungen", value: String(opened), inline: true }
    )
    .setFooter({ text: config.messages.footer || "Frohe Weihnachten 🎅" });
}

function calendarRows() {
  const today = currentDay();
  const rows = [];
  for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
    const row = new ActionRowBuilder();
    for (let column = 1; column <= 5; column++) {
      const day = rowIndex * 5 + column;
      if (day > 24) break;
      const button = new ButtonBuilder()
        .setCustomId(`advent:open:${day}`)
        .setLabel(`🎁 ${day}`)
        .setStyle(day <= today ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(day > today);
      row.addComponents(button);
    }
    rows.push(row);
  }
  return rows;
}

async function postCalendar(channel) {
  const message = await channel.send({ embeds: [calendarEmbed()], components: calendarRows() });
  db.prepare("INSERT INTO settings(key, value) VALUES('calendar_message_id', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(message.id);
  db.prepare("INSERT INTO settings(key, value) VALUES('calendar_channel_id', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(channel.id);
  return message;
}

function commandDefinitions() {
  return [
    new SlashCommandBuilder().setName("advent").setDescription("Zeigt den Weihnachts-Adventskalender."),
    new SlashCommandBuilder().setName("advent-register").setDescription("Verknüpft deinen Discord-Account mit deinem Minecraft-Namen."),
    new SlashCommandBuilder().setName("advent-status").setDescription("Zeigt deine bereits geöffneten Türchen."),
    new SlashCommandBuilder().setName("advent-setup").setDescription("Postet den Adventskalender in diesem Kanal."),
    new SlashCommandBuilder().setName("advent-admin").setDescription("Öffnet die Verwaltung der Belohnungen.")
  ].map(command => command.toJSON());
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(token);
  const guildId = config.discord.guildId || process.env.DISCORD_GUILD_ID;
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: commandDefinitions() });
  } else {
    await rest.put(Routes.applicationCommands(applicationId), { body: commandDefinitions() });
  }
}

async function refreshCalendar() {
  const messageId = db.prepare("SELECT value FROM settings WHERE key='calendar_message_id'").get()?.value;
  const channelId = db.prepare("SELECT value FROM settings WHERE key='calendar_channel_id'").get()?.value;
  if (!messageId || !channelId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    const message = await channel.messages.fetch(messageId);
    await message.edit({ embeds: [calendarEmbed()], components: calendarRows() });
  } catch (error) {
    console.error("Kalender konnte nicht aktualisiert werden:", error.message);
  }
}

async function sendDailyAnnouncement() {
  const today = localDate();
  const day = currentDay();
  if (day < 1 || day > 24 || config.calendar.announcementEnabled === false) return;
  const now = new Date();
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now).map(part => [part.type, part.value]));
  const target = config.calendar.announcementTime || "09:00";
  if (`${parts.hour}:${parts.minute}` !== target) return;
  const alreadySent = db.prepare("SELECT date FROM announcements WHERE date=?").get(today);
  if (alreadySent) return;
  const channelId = db.prepare("SELECT value FROM settings WHERE key='calendar_channel_id'").get()?.value || config.discord.channelId;
  if (!channelId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    await channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.messages.color || 0xB22222)
        .setTitle(`🎄 Türchen ${day} ist geöffnet!`)
        .setDescription(`Ein neues Türchen wartet auf dich. Öffne den Adventskalender und entdecke deine Überraschung! 🎁`)
        .setFooter({ text: config.messages.footer || "Frohe Weihnachten 🎅" })]
    });
    db.prepare("INSERT INTO announcements(date, sent_at) VALUES(?, ?)").run(today, new Date().toISOString());
  } catch (error) {
    console.error("Tagesankündigung fehlgeschlagen:", error.message);
  }
}

function registeredPlayer(discordId) {
  return db.prepare("SELECT * FROM players WHERE discord_id=?").get(discordId);
}

async function handleOpen(interaction, dayNumber) {
  const dayNow = currentDay();
  if (dayNumber < 1 || dayNumber > 24 || dayNumber > dayNow) {
    return interaction.reply({ content: "🔒 Dieses Türchen ist noch nicht freigeschaltet.", ephemeral: true });
  }
  const player = registeredPlayer(interaction.user.id);
  if (!player) {
    return interaction.reply({ content: "🎅 Bitte verknüpfe zuerst deinen Minecraft-Namen mit `/advent-register`.", ephemeral: true });
  }
  const reward = config.calendar.days[dayNumber - 1];
  const existing = db.prepare("SELECT * FROM openings WHERE discord_id=? AND day=?").get(interaction.user.id, dayNumber);
  if (existing) {
    const status = existing.delivered_at ? "✅ Bereits übergeben" : "⏳ Deine Belohnung wartet noch auf die Übergabe durch einen Admin.";
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.messages.color || 0xB22222).setTitle(`🎁 Türchen ${dayNumber}: ${existing.reward_title}`).setDescription(`${existing.reward_text}\n\n${status}`)],
      ephemeral: true
    });
  }
  try {
    db.prepare("INSERT INTO openings(discord_id, minecraft_name, day, reward_title, reward_text, opened_at) VALUES(?, ?, ?, ?, ?, ?)")
      .run(interaction.user.id, player.minecraft_name, dayNumber, reward.title, reward.reward, new Date().toISOString());
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return interaction.reply({ content: "Dieses Türchen hast du bereits geöffnet.", ephemeral: true });
    }
    throw error;
  }
  return interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(config.messages.color || 0xB22222)
      .setTitle(`🎄 Türchen ${dayNumber}: ${reward.title}`)
      .setDescription(`🎁 **Deine Überraschung:**\n${reward.reward}\n\n⏳ Deine Belohnung wurde vorgemerkt. Ein Admin übergibt sie dir im Spiel.`)
      .setFooter({ text: config.messages.footer || "Frohe Weihnachten 🎅" })],
    ephemeral: true
  });
}

function pendingClaims() {
  return db.prepare("SELECT * FROM openings WHERE delivered_at IS NULL ORDER BY day, opened_at LIMIT 25").all();
}

async function showAdmin(interaction) {
  if (!isAdmin(interaction.member)) return interaction.reply({ content: "⛔ Dafür hast du keine Berechtigung.", ephemeral: true });
  const pending = pendingClaims();
  if (!pending.length) return interaction.reply({ content: "🎄 Aktuell sind keine Belohnungen offen.", ephemeral: true });
  const menu = new StringSelectMenuBuilder()
    .setCustomId("advent:admin:select")
    .setPlaceholder("Offene Belohnung auswählen")
    .addOptions(pending.map(item => ({
      label: `Tag ${item.day} · ${item.minecraft_name}`.slice(0, 100),
      description: item.reward_title.slice(0, 100),
      value: String(item.id)
    })));
  const embed = new EmbedBuilder()
    .setColor(config.messages.color || 0xB22222)
    .setTitle("🎅 Belohnungsverwaltung")
    .setDescription(pending.map(item => `**#${item.id} · Tag ${item.day}** — ${item.minecraft_name}: ${item.reward_title}`).join("\n"));
  return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
}

async function handleInteraction(interaction) {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "advent") {
      return interaction.reply({ embeds: [calendarEmbed()], components: calendarRows(), ephemeral: true });
    }
    if (interaction.commandName === "advent-register") {
      const modal = new ModalBuilder().setCustomId("advent:register").setTitle("Minecraft-Namen verknüpfen");
      const field = new TextInputBuilder().setCustomId("minecraft_name").setLabel("Dein Minecraft-Name").setStyle(TextInputStyle.Short).setMinLength(3).setMaxLength(16).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(field));
      return interaction.showModal(modal);
    }
    if (interaction.commandName === "advent-status") {
      const player = registeredPlayer(interaction.user.id);
      if (!player) return interaction.reply({ content: "Du bist noch nicht registriert. Nutze `/advent-register`.", ephemeral: true });
      const entries = db.prepare("SELECT day, reward_title, delivered_at FROM openings WHERE discord_id=? ORDER BY day").all(interaction.user.id);
      const lines = entries.length ? entries.map(item => `🎁 Tag ${item.day}: ${item.reward_title} — ${item.delivered_at ? "✅ übergeben" : "⏳ ausstehend"}`) : ["Du hast noch kein Türchen geöffnet."];
      return interaction.reply({ content: `**Status für ${player.minecraft_name}**\n${lines.join("\n")}`, ephemeral: true });
    }
    if (interaction.commandName === "advent-setup") {
      if (!isAdmin(interaction.member)) return interaction.reply({ content: "⛔ Dafür hast du keine Berechtigung.", ephemeral: true });
      await postCalendar(interaction.channel);
      return interaction.reply({ content: "🎄 Der Weihnachtskalender wurde in diesem Kanal veröffentlicht.", ephemeral: true });
    }
    if (interaction.commandName === "advent-admin") return showAdmin(interaction);
  }

  if (interaction.isModalSubmit() && interaction.customId === "advent:register") {
    const name = interaction.fields.getTextInputValue("minecraft_name").trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) {
      return interaction.reply({ content: "Bitte gib einen gültigen Minecraft-Namen mit 3–16 Zeichen ein (Buchstaben, Zahlen und _).", ephemeral: true });
    }
    db.prepare("INSERT INTO players(discord_id, minecraft_name, registered_at) VALUES(?, ?, ?) ON CONFLICT(discord_id) DO UPDATE SET minecraft_name=excluded.minecraft_name, registered_at=excluded.registered_at")
      .run(interaction.user.id, name, new Date().toISOString());
    return interaction.reply({ content: `🎅 Dein Discord-Account ist jetzt mit **${name}** verknüpft.`, ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId.startsWith("advent:open:")) {
    return handleOpen(interaction, Number(interaction.customId.split(":")[2]));
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "advent:admin:select") {
    if (!isAdmin(interaction.member)) return interaction.reply({ content: "⛔ Keine Berechtigung.", ephemeral: true });
    const id = Number(interaction.values[0]);
    const claim = db.prepare("SELECT * FROM openings WHERE id=? AND delivered_at IS NULL").get(id);
    if (!claim) return interaction.reply({ content: "Diese offene Belohnung wurde nicht gefunden oder bereits übergeben.", ephemeral: true });
    const button = new ButtonBuilder().setCustomId(`advent:admin:deliver:${id}`).setLabel("Übergabe bestätigen").setStyle(ButtonStyle.Success);
    const embed = new EmbedBuilder()
      .setColor(config.messages.color || 0xB22222)
      .setTitle(`🎁 Übergabe für ${claim.minecraft_name}`)
      .setDescription(`**Türchen:** ${claim.day}\n**Belohnung:** ${claim.reward_title}\n**Inhalt:** ${claim.reward_text}\n\nBestätige erst, nachdem du die Belohnung im Spiel übergeben hast.`);
    return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)], ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId.startsWith("advent:admin:deliver:")) {
    if (!isAdmin(interaction.member)) return interaction.reply({ content: "⛔ Keine Berechtigung.", ephemeral: true });
    const id = Number(interaction.customId.split(":")[3]);
    const result = db.prepare("UPDATE openings SET delivered_at=?, delivered_by=? WHERE id=? AND delivered_at IS NULL")
      .run(new Date().toISOString(), interaction.user.id, id);
    if (!result.changes) return interaction.reply({ content: "Diese Belohnung wurde bereits bestätigt.", ephemeral: true });
    return interaction.update({ content: "✅ Die Übergabe wurde als erledigt markiert.", embeds: [], components: [] });
  }
}

client.on("interactionCreate", interaction => {
  handleInteraction(interaction).catch(async error => {
    console.error("Interaktionsfehler:", error);
    const response = { content: "Beim Verarbeiten ist ein Fehler aufgetreten. Bitte versuche es erneut.", ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(response).catch(() => {});
    else await interaction.reply(response).catch(() => {});
  });
});

client.once("ready", async () => {
  console.log(`🎄 ${client.user.tag} ist bereit.`);
  try {
    await registerCommands();
    console.log("Slash-Befehle wurden registriert.");
  } catch (error) {
    console.error("Slash-Befehle konnten nicht registriert werden:", error);
  }
  await refreshCalendar();
  await sendDailyAnnouncement();
  setInterval(() => {
    sendDailyAnnouncement().catch(error => console.error("Ankündigungsfehler:", error));
  }, 30000);
});

process.on("SIGINT", () => {
  db.close();
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  db.close();
  client.destroy();
  process.exit(0);
});

client.login(token);
