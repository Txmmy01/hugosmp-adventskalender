import { Gift, LockKeyhole, Snowflake, TreePine } from "lucide-react";

export default function Home() {
  return (
    <main className="page-shell">
      <div className="snow" aria-hidden="true" />
      <div className="hero">
        <header className="topline">
          <div className="brand">
            <span className="brand-mark"><TreePine size={21} /></span>
            <span>HugoSMP · Weihnachten 2026</span>
          </div>
          <div className="player-chip">
            <span className="player-dot" />
            Adventskalender
          </div>
        </header>

        <section className="intro">
          <div className="eyebrow">Ein Winter voller Überraschungen</div>
          <h1>Frohe Weihnachten</h1>
          <p>
            24 kleine Momente voller Weihnachtszauber.
            <br />
            Melde dich an und entdecke jeden Tag eine neue Überraschung.
          </p>
        </section>

        <section className="login-card" aria-labelledby="login-title">
          <div className="login-icon"><Gift size={27} /></div>
          <h2 id="login-title">Dein Weihnachtszugang</h2>
          <p>Schön, dass du bei HugoSMP dabei bist.</p>
          <form action="#" method="post">
            <label className="field-label" htmlFor="minecraft-name">Minecraft-Name</label>
            <input
              className="field"
              id="minecraft-name"
              name="minecraftName"
              autoComplete="username"
              placeholder="Dein Spielername"
              maxLength={16}
              required
            />
            <label className="field-label" htmlFor="password">Passwort</label>
            <input
              className="field"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Dein Passwort"
              required
            />
            <button className="primary-button" type="submit">
              <LockKeyhole size={17} />
              Zum Adventskalender
            </button>
          </form>
          <div className="login-note">
            Der Zugang ist nur für freigeschaltete HugoSMP-Spieler bestimmt.
          </div>
        </section>

        <div className="footer-note">
          <Snowflake size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
          Mit Liebe für die HugoSMP-Community
          <Snowflake size={13} style={{ display: "inline", verticalAlign: "middle", marginLeft: 8 }} />
        </div>
      </div>
    </main>
  );
}