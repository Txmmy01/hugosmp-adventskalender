"use client";

import { useState, type FormEvent } from "react";
import { Gift, LockKeyhole, Snowflake, TreePine } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [minecraftName, setMinecraftName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/player/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minecraftName: minecraftName.trim(), password })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Anmeldung fehlgeschlagen.");
        return;
      }
      router.push("/calendar");
    } catch {
      setError("Der Server ist gerade nicht erreichbar. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="snow" aria-hidden="true" />
      <div className="hero">
        <header className="topline">
          <div className="brand"><span className="brand-mark"><TreePine size={21} /></span><span>HugoSMP · Weihnachten 2026</span></div>
          <div className="player-chip"><span className="player-dot" /> Adventskalender</div>
        </header>
        <section className="intro">
          <div className="eyebrow">Ein Winter voller Überraschungen</div>
          <h1>Frohe Weihnachten</h1>
          <p>24 kleine Momente voller Weihnachtszauber.<br />Melde dich an und entdecke jeden Tag eine neue Überraschung.</p>
        </section>
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-icon"><Gift size={27} /></div>
          <h2 id="login-title">Dein Weihnachtszugang</h2>
          <p>Schön, dass du bei HugoSMP dabei bist.</p>
          <form onSubmit={submit}>
            <label className="field-label" htmlFor="minecraft-name">Minecraft-Name</label>
            <input className="field" id="minecraft-name" value={minecraftName} onChange={event => setMinecraftName(event.target.value)} autoComplete="username" placeholder="Dein Spielername" maxLength={16} pattern="[A-Za-z0-9_]{3,16}" required />
            <label className="field-label" htmlFor="password">Passwort</label>
            <input className="field" id="password" value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Dein Passwort" required />
            {error && <div className="login-error">{error}</div>}
            <button className="primary-button" type="submit" disabled={loading}><LockKeyhole size={17} />{loading ? "Anmeldung läuft …" : "Zum Adventskalender"}</button>
          </form>
          <div className="login-note">Der Zugang ist nur für freigeschaltete HugoSMP-Spieler bestimmt.</div>
        </section>
        <div className="footer-note"><Snowflake size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />Mit Liebe für die HugoSMP-Community<Snowflake size={13} style={{ display: "inline", verticalAlign: "middle", marginLeft: 8 }} /></div>
      </div>
    </main>
  );
}