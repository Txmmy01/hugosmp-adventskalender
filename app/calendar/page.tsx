"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Gift, LogOut, Snowflake, TreePine, X } from "lucide-react";
import { useRouter } from "next/navigation";

type GiftItem = {
  id: string;
  day: number;
  title: string | null;
  description: string | null;
  availableAt: string;
  isAvailable: boolean;
  isOpened: boolean;
};

type Reward = { day: number; title: string; description: string; reward: string };
const colors = ["red", "gold", "blue", "green", "violet", "rose"];

export default function CalendarPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [reward, setReward] = useState<Reward | null>(null);
  const [error, setError] = useState("");
  const [loadingDay, setLoadingDay] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const sessionResponse = await fetch("/api/player/session", { cache: "no-store" });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok || !session.authenticated) {
        router.replace("/");
        return;
      }
      setName(session.player.minecraftName);
      const response = await fetch("/api/player/gifts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Der Kalender konnte nicht geladen werden.");
        return;
      }
      setGifts(data);
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte lade die Seite erneut.");
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function openGift(day: number) {
    setLoadingDay(day);
    setError("");
    try {
      const response = await fetch("/api/player/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Das Geschenk kann noch nicht geöffnet werden.");
        return;
      }
      setReward(data);
      await load();
    } catch {
      setError("Das Geschenk konnte wegen eines Verbindungsfehlers nicht geöffnet werden.");
    } finally {
      setLoadingDay(null);
    }
  }

  async function logout() {
    try {
      await fetch("/api/player/logout", { method: "POST" });
    } finally {
      router.replace("/");
    }
  }

  return (
    <main className="page-shell calendar-page">
      <div className="snow" aria-hidden="true" />
      <div className="calendar-wrap">
        <header className="topline">
          <div className="brand"><span className="brand-mark"><TreePine size={21} /></span><span>HugoSMP · Weihnachten 2026</span></div>
          <div className="player-chip"><span className="player-dot" /> {name || "Spieler"}</div>
          <button className="calendar-logout" onClick={logout}><LogOut size={15} /> Abmelden</button>
        </header>
        <section className="calendar-intro">
          <div className="eyebrow">24 Tage voller Magie</div>
          <h1>Frohe Weihnachten!</h1>
          <p>Dein Weg durch den HugoSMP-Winter. Jeden Tag wartet eine neue Überraschung.</p>
        </section>
        <section className="winter-scene">
          <div className="scene-sky"><span className="scene-star star-one">✦</span><span className="scene-star star-two">✧</span><span className="scene-moon">☾</span></div>
          <div className="scene-title"><span>HUGOSMP</span><small>ADVENTSKALENDER 2026</small></div>
          <div className="scene-trees"><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="gift-path">
            {Array.from({ length: 24 }, (_, index) => {
              const day = index + 1;
              const gift = gifts.find(item => item.day === day);
              const opened = gift?.isOpened ?? false;
              const available = gift?.isAvailable ?? false;
              const published = Boolean(gift);
              const color = colors[(day - 1) % colors.length];
              return (
                <button className={`path-gift ${color} ${opened ? "opened" : ""} ${available && !opened ? "ready" : ""}`} key={day} style={{ "--gift-index": day } as CSSProperties} onClick={() => available && published && !opened && openGift(day)} disabled={!available || opened || !published || loadingDay === day} aria-label={`Türchen ${day}${opened ? ", geöffnet" : available ? ", öffnen" : ", verschlossen"}`}>
                  <span className="gift-number">{day}</span><span className="gift-box"><i /><b /></span><span className="gift-state">{opened ? "Geöffnet" : available ? "Öffnen" : "Bald"}</span>
                </button>
              );
            })}
          </div>
          <div className="scene-snowbank" />
          <div className="scene-caption"><Snowflake size={15} /> Ein kleines Geschenk für jeden Tag <Snowflake size={15} /></div>
        </section>
        {error && <div className="calendar-error">{error}</div>}
        <div className="calendar-footnote">Möge dein Dezember voller Überraschungen sein.</div>
      </div>
      {reward && <div className="gift-modal-backdrop" role="presentation" onClick={() => setReward(null)}>
        <section className="gift-modal" role="dialog" aria-modal="true" aria-labelledby="reward-title" onClick={event => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setReward(null)} aria-label="Schließen"><X size={18} /></button>
          <div className="modal-gift-icon"><Gift size={34} /></div>
          <div className="eyebrow">Türchen {reward.day} · Frohe Weihnachten</div>
          <h2 id="reward-title">{reward.title}</h2>
          <p>{reward.description}</p>
          <div className="reward-box"><span>Deine Belohnung</span><strong>{reward.reward}</strong></div>
          <button className="primary-button" onClick={() => setReward(null)}>Wunderbar!</button>
        </section>
      </div>}
    </main>
  );
}