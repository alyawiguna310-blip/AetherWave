import { useEffect, useMemo, useState } from "react";
import "./App.css";

type Track = {
  title: string;
  artist: string;
  album: string;
  duration: string;
  accent: string;
};

const tracks: Track[] = [
  { title: "Midnight City", artist: "M83", album: "Hurry Up, We're Dreaming", duration: "4:03", accent: "#7c5cff" },
  { title: "After Dark", artist: "Mr.Kitty", album: "Time", duration: "4:17", accent: "#4f9cff" },
  { title: "Resonance", artist: "HOME", album: "Odyssey", duration: "3:32", accent: "#24c8db" },
  { title: "Nightcall", artist: "Kavinsky", album: "OutRun", duration: "4:18", accent: "#ff5c8a" },
];

function App() {
  const [active, setActive] = useState<"Home" | "Library" | "Search" | "Visuals">("Home");
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(38);
  const [volume, setVolume] = useState(72);
  const current = tracks[track];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setProgress((p) => p >= 100 ? 0 : p + 0.25), 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  const bars = useMemo(() => Array.from({ length: 42 }, (_, i) => {
    const wave = Math.abs(Math.sin(i * 0.47) * 0.58 + Math.sin(i * 0.13) * 0.22);
    return 18 + wave * 76;
  }), []);

  const next = () => { setTrack((track + 1) % tracks.length); setProgress(0); };
  const previous = () => { setTrack((track - 1 + tracks.length) % tracks.length); setProgress(0); };

  return (
    <div className="desktop-shell" style={{ "--accent": current.accent } as React.CSSProperties}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">◈</span><span>AetherWave</span></div>
        <div className="window-title">{active.toLowerCase()} · music workspace</div>
        <div className="system-status"><span className="status-dot" /> online <span>⌄</span></div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="profile-card">
            <div className="avatar">AW</div>
            <div><strong>Aether Session</strong><small>local workspace</small></div>
          </div>

          <nav>
            {(["Home", "Search", "Library", "Visuals"] as const).map((item) => (
              <button className={active === item ? "nav-item active" : "nav-item"} onClick={() => setActive(item)} key={item}>
                <span>{item === "Home" ? "⌂" : item === "Search" ? "⌕" : item === "Library" ? "▤" : "✦"}</span>{item}
              </button>
            ))}
          </nav>

          <div className="side-label">YOUR SPACE</div>
          <button className="playlist">＋ New playlist</button>
          <button className="playlist">♡ Liked tracks</button>
          <button className="playlist">◌ Chillwave</button>
          <button className="playlist">◌ Late Night</button>

          <div className="sidebar-bottom">
            <div className="mini-stat"><span>LOCAL LIBRARY</span><b>128 tracks</b></div>
            <div className="mini-stat"><span>VISUAL ENGINE</span><b className="ready">● ready</b></div>
          </div>
        </aside>

        <main className="main-panel">
          <div className="content-head">
            <div><span className="eyebrow">WELCOME BACK</span><h1>{active === "Home" ? "Your sound, your space." : active}</h1></div>
            <button className="ghost-button">⚙ Settings</button>
          </div>

          <section className="hero-card">
            <div className="hero-art" style={{ background: `radial-gradient(circle at 30% 25%, ${current.accent}, transparent 38%), linear-gradient(145deg, #111522, #080a10)` }}>
              <div className="art-grid" />
              <div className="art-disc"><span>◈</span></div>
              <div className="art-label">AETHER<br/><b>WAVE</b></div>
            </div>
            <div className="hero-info">
              <span className="eyebrow">NOW PLAYING</span>
              <h2>{current.title}</h2>
              <p>{current.artist} <span>•</span> {current.album}</p>
              <div className="tags"><span>FLAC</span><span>HI-FI</span><span>VISUALIZER</span></div>
              <div className="hero-actions">
                <button className="primary" onClick={() => setPlaying(!playing)}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
                <button className="icon-button" onClick={previous}>‹</button>
                <button className="icon-button" onClick={next}>›</button>
              </div>
            </div>
          </section>

          <section className="visual-card">
            <div className="section-head"><div><span className="eyebrow">LIVE VISUALIZER</span><h3>Neon Spectrum</h3></div><span className="engine-pill">● AUDIO REACTIVE</span></div>
            <div className="visual-stage">
              <div className="orb orb-one" /><div className="orb orb-two" />
              <div className="bars">{bars.map((height, i) => <i key={i} style={{ height: `${playing ? height : height * .48}%`, animationDelay: `${i * -0.07}s` }} />)}</div>
              <div className="wave-line" />
              <div className="stage-center"><b>{current.title}</b><small>{playing ? "visual engine responding" : "press play to activate"}</small></div>
            </div>
          </section>

          <section className="queue-section">
            <div className="section-head"><div><span className="eyebrow">UP NEXT</span><h3>Queue</h3></div><button className="text-button">View all →</button></div>
            <div className="track-list">
              {tracks.map((item, i) => <button className={i === track ? "track-row selected" : "track-row"} key={item.title} onClick={() => { setTrack(i); setProgress(0); }}>
                <span className="track-number">{i === track && playing ? "♫" : String(i + 1).padStart(2, "0")}</span>
                <span className="track-cover" style={{ background: item.accent }} />
                <span className="track-meta"><b>{item.title}</b><small>{item.artist}</small></span>
                <span className="track-album">{item.album}</span><span className="track-duration">{item.duration}</span>
              </button>)}
            </div>
          </section>
        </main>
      </div>

      <footer className="player-bar">
        <div className="player-track"><div className="tiny-cover" style={{ background: current.accent }}>◈</div><div><b>{current.title}</b><small>{current.artist}</small></div></div>
        <div className="player-controls">
          <div className="control-buttons"><button onClick={previous}>↶</button><button className="play-round" onClick={() => setPlaying(!playing)}>{playing ? "❚❚" : "▶"}</button><button onClick={next}>↷</button></div>
          <div className="progress-row"><span>1:32</span><input aria-label="Progress" type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(Number(e.target.value))} /><span>{current.duration}</span></div>
        </div>
        <div className="volume"><span>◖</span><input aria-label="Volume" type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /><span>{volume}%</span></div>
      </footer>
    </div>
  );
}

export default App;
