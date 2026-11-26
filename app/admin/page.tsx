"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Gift, KeyRound, LogOut, ShieldCheck, Users } from "lucide-react";

type Player = {
  id: string;
  minecraftName: string;
  isApproved: boolean;
  isActive: boolean;
};

type GiftEntry = {
  id: string;
  day: number;
  title: string;
  description: string;
  reward: string;
  availableAt: string;
  isPublished: boolean;
};

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [gifts, setGifts] = useState<GiftEntry[]>([]);
  const [minecraftName, setMinecraftName] = useState("");
  const [newPlayerPassword, setNewPlayerPassword] = useState("");
  const [playerPasswords, setPlayerPasswords] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"players" | "gifts">("players");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const [playerResponse, giftResponse] = await Promise.all([
      fetch("/api/admin/players"),
      fetch("/api/admin/gifts")
    ]);

    if (playerResponse.ok) {
      setPlayers(await playerResponse.json());
    }

    if (giftResponse.ok) {
      setGifts(await giftResponse.json());
    }
  }

  useEffect(() => {
    fetch("/api/admin/session")
      .then(response => response.json())
      .then(async data => {
        setAuthenticated(data.authenticated);
        if (data.authenticated) {
          await loadData();
        }
      })
      .finally(() => setChecking(false));
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      setError("Das Passwort ist nicht korrekt.");
      return;
    }

    setAuthenticated(true);
    setPassword("");
    await loadData();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setPlayers([]);
    setGifts([]);
  }

  async function addPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const response = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minecraftName,
        password: newPlayerPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Spieler konnte nicht angelegt werden.");
      setSaving(false);
      return;
    }

    setMinecraftName("");
    setNewPlayerPassword("");
    await loadData();
    setSaving(false);
  }

  async function updatePlayer(player: Player, values: { isApproved?: boolean; isActive?: boolean; password?: string }) {
    const response = await fetch("/api/admin/players", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: player.id, ...values })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Spieler konnte nicht aktualisiert werden.");
      return;
    }
    if (values.password) {
      setPlayerPasswords(current => ({ ...current, [player.id]: "" }));
    }
    await loadData();
  }

  async function saveGift(gift: GiftEntry) {
    await fetch("/api/admin/gifts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gift)
    });
    await loadData();
  }

  if (checking) {
    return <main className="admin-screen"><div className="admin-loading">HugoSMP Admin wird geladen …</div></main>;
  }

  if (!authenticated) {
    return (
      <main className="admin-screen">
        <form className="admin-login" onSubmit={login}>
          <div className="admin-emblem"><ShieldCheck size={28} /></div>
          <span className="admin-kicker">HUGOSMP · INTERN</span>
          <h1>Admin-Panel</h1>
          <p>Bitte melde dich mit deinem Admin-Passwort an.</p>
          <label htmlFor="admin-password">Admin-Passwort</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />
          {error && <div className="admin-error">{error}</div>}
          <button className="admin-primary" type="submit"><KeyRound size={16} /> Anmelden</button>
          <a className="admin-back" href="/">Zurück zum Adventskalender</a>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-screen">
      <div className="admin-wrap">
        <header className="admin-header">
          <div>
            <span className="admin-kicker">HUGOSMP · WEIHNACHTEN 2026</span>
            <h1>Verwaltung</h1>
            <p>Spieler freigeben und die 24 Überraschungen vorbereiten.</p>
          </div>
          <button className="admin-logout" onClick={logout}><LogOut size={16} /> Abmelden</button>
        </header>

        <nav className="admin-tabs">
          <button className={activeTab === "players" ? "active" : ""} onClick={() => setActiveTab("players")}><Users size={16} /> Spieler</button>
          <button className={activeTab === "gifts" ? "active" : ""} onClick={() => setActiveTab("gifts")}><Gift size={16} /> Geschenke</button>
        </nav>

        {error && <div className="admin-error">{error}</div>}

        {activeTab === "players" && (
          <section className="admin-panel">
            <div className="admin-section-heading">
              <div><h2>Minecraft-Spieler</h2><p>Nur freigegebene Spieler können den Kalender nutzen.</p></div>
              <span className="admin-count">{players.length} Spieler</span>
            </div>
            <form className="admin-player-form" onSubmit={addPlayer}>
              <div>
                <label htmlFor="new-player">Minecraft-Name</label>
                <input id="new-player" value={minecraftName} onChange={event => setMinecraftName(event.target.value)} placeholder="Spielername" pattern="[A-Za-z0-9_]{3,16}" required />
              </div>
              <div>
                <label htmlFor="new-player-password">Spieler-Passwort</label>
                <input id="new-player-password" type="password" minLength={10} value={newPlayerPassword} onChange={event => setNewPlayerPassword(event.target.value)} placeholder="Mindestens 10 Zeichen" required />
              </div>
              <button className="admin-primary" type="submit" disabled={saving}>{saving ? "Wird gespeichert …" : "Spieler hinzufügen"}</button>
            </form>
            <div className="admin-player-list">
              {players.map(player => (
                <div className="admin-player-row" key={player.id}>
                  <div className="admin-avatar">{player.minecraftName.slice(0, 1).toUpperCase()}</div>
                  <div className="admin-player-name"><strong>{player.minecraftName}</strong><span>{player.isActive ? "Aktiv" : "Gesperrt"}</span></div>
                  <span className={player.isApproved ? "admin-status approved" : "admin-status"}>{player.isApproved ? "Freigegeben" : "Ausstehend"}</span>
                  <button className="admin-small-button" onClick={() => updatePlayer(player, { isApproved: !player.isApproved })}>{player.isApproved ? "Freigabe entziehen" : "Freigeben"}</button>
                  <button className="admin-small-button" onClick={() => updatePlayer(player, { isActive: !player.isActive })}>{player.isActive ? "Deaktivieren" : "Aktivieren"}</button>
                  <div className="admin-password-reset">
                    <input type="password" minLength={10} value={playerPasswords[player.id] ?? ""} onChange={event => setPlayerPasswords(current => ({ ...current, [player.id]: event.target.value }))} placeholder="Neues Spielerpasswort" aria-label={`Neues Passwort für ${player.minecraftName}`} />
                    <button className="admin-small-button" disabled={(playerPasswords[player.id] ?? "").length < 10} onClick={() => updatePlayer(player, { password: playerPasswords[player.id] })}>Passwort setzen</button>
                  </div>
                </div>
              ))}
              {players.length === 0 && <p className="admin-empty">Noch keine Spieler hinzugefügt.</p>}
            </div>
          </section>
        )}

        {activeTab === "gifts" && (
          <section className="admin-panel">
            <div className="admin-section-heading">
              <div><h2>24 Geschenke</h2><p>Lege für jedes Türchen Titel, Text und Belohnung fest.</p></div>
              <span className="admin-count">{gifts.length}/24 angelegt</span>
            </div>
            <div className="admin-gift-list">
              {Array.from({ length: 24 }, (_, index) => {
                const day = index + 1;
                const gift = gifts.find(entry => entry.day === day);
                return (
                  <GiftEditor
                    key={day}
                    day={day}
                    gift={gift}
                    onSave={saveGift}
                  />
                );
              })}
            </div>
          </section>
        )}
        <a className="admin-back" href="/">Zurück zum Adventskalender</a>
      </div>
    </main>
  );
}

function GiftEditor({
  day,
  gift,
  onSave
}: {
  day: number;
  gift?: GiftEntry;
  onSave: (gift: GiftEntry) => Promise<void>;
}) {
  const [title, setTitle] = useState(gift?.title ?? "");
  const [description, setDescription] = useState(gift?.description ?? "");
  const [reward, setReward] = useState(gift?.reward ?? "");
  const [availableAt, setAvailableAt] = useState(
    gift?.availableAt ? new Date(gift.availableAt).toISOString().slice(0, 16) : `2026-12-${String(day).padStart(2, "0")}T00:00`
  );
  const [isPublished, setIsPublished] = useState(gift?.isPublished ?? false);

  useEffect(() => {
    setTitle(gift?.title ?? "");
    setDescription(gift?.description ?? "");
    setReward(gift?.reward ?? "");
    setIsPublished(gift?.isPublished ?? false);
  }, [gift]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({
      id: gift?.id ?? "",
      day,
      title,
      description,
      reward,
      availableAt: new Date(availableAt).toISOString(),
      isPublished
    });
  }

  return (
    <form className="admin-gift-editor" onSubmit={submit}>
      <div className="admin-gift-number">{String(day).padStart(2, "0")}</div>
      <div className="admin-gift-fields">
        <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Titel des Geschenks" aria-label={`Titel Türchen ${day}`} required />
        <textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Nachricht für den Spieler" aria-label={`Nachricht Türchen ${day}`} rows={2} />
        <input value={reward} onChange={event => setReward(event.target.value)} placeholder="Belohnung" aria-label={`Belohnung Türchen ${day}`} required />
        <div className="admin-gift-controls">
          <input type="datetime-local" value={availableAt} onChange={event => setAvailableAt(event.target.value)} aria-label={`Freischaltung Türchen ${day}`} />
          <label className="admin-publish"><input type="checkbox" checked={isPublished} onChange={event => setIsPublished(event.target.checked)} /> Veröffentlicht</label>
          <button className="admin-small-button" type="submit">Speichern</button>
        </div>
      </div>
    </form>
  );
}