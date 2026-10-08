import { useEffect, useMemo, useState } from "react";
import "./App.css";

type Track = { title: string; artist: string; album: string; duration: string; accent: string };

const tracks: Track[] = [
  { title: "Midnight City", artist: "M83", album: "Hurry Up, We're Dreaming", duration: "4:03", accent: "#8b7cff" },
  { title: "After Dark", artist: "Mr.Kitty", album: "Time", duration: "4:17", accent: "#5e9eea" },
  { title: "Resonance", artist: "HOME", album: "Odyssey", duration: "3:32", accent: "#54b9c6" },
  { title: "Nightcall", artist: "Kavinsky", album: "OutRun", duration: "4:18", accent: "#c77a93" },
];

const navItems = [
  { name: "Home", icon: "home" },
  { name: "Search", icon: "search" },
  { name: "Library", icon: "library" },
  { name: "Visuals", icon: "visuals" },
] as const;

function NavIcon({ name }: { name: string }) {
  const common = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "home") return <svg {...common}><path d="M3 10.8 12 3l9 7.8" /><path d="M5.5 9.5V21h13V9.5" /><path d="M9.5 21v-6h5v6" /></svg>;
  if (name === "search") return <svg {...common}><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.7 4.7" /></svg>;
  if (name === "library") return <svg {...common}><path d="M5 4h14v16H5z" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></svg>;
  return <svg {...common}><path d="M4 14c1.7-5.3 3.4-5.3 5.1 0s3.4 5.3 5.1 0 3.4-5.3 5.1 0" /><path d="M4 9c1.7-3.1 3.4-3.1 5.1 0s3.4 3.1 5.1 0 3.4-3.1 5.1 0" /></svg>;
}

function App() {
  const [active, setActive] = useState<(typeof navItems)[number][0]>("Home");
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(38);
  const [volume, setVolume] = useState(72);
  const [message, setMessage] = useState("Ready");
  const current = tracks[track];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setProgress((p) => p >= 100 ? 0 : p + 0.25), 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  const bars = useMemo(() => Array.from({ length: 64 }, (_, i) =>
    8 + Math.abs(Math.sin(i * 0.43) * 32 + Math.sin(i * 0.16) * 14)
  ), []);

  const selectTrack = (index: number) => { setTrack(index); setProgress(0); setPlaying(true); setMessage(`Playing ${tracks[index].title}`); };
  const next = () => selectTrack((track + 1) % tracks.length);
  const previous = () => selectTrack((track - 1 + tracks.length) % tracks.length);

  return (
    <div className="app" style={{ "--accent": current.accent } as React.CSSProperties}>
      <header className="titlebar">
        <div className="app-name"><span className="app-symbol">A</span><span>AetherWave</span></div>
        <div className="titlebar-center">{active}</div>
        <div className="window-actions" aria-hidden="true"><span>•</span><span>•</span><span>•</span></div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="library-heading">
            <div className="avatar">AW</div>
            <div><strong>Music</strong><small>Local session</small></div>
          </div>

          <div className="nav-label">NAVIGATION</div>
          <nav>
            {navItems.map(({ name, icon }) => (
              <button key={name} className={active === name ? "nav-link active" : "nav-link"} onClick={() => setActive(name)}>
                <span className="nav-icon"><NavIcon name={icon} /></span><span>{name}</span>
              </button>
            ))}
          </nav>

          <div className="nav-label library-label">PLAYLISTS</div>
          <button className="playlist-link"><span className="playlist-icon">+</span><span>Create playlist</span></button>
          <button className="playlist-link"><span className="playlist-icon">♪</span><span>Liked tracks</span></button>
          <button className="playlist-link"><span className="playlist-icon">♪</span><span>Chillwave</span></button>
          <button className="playlist-link"><span className="playlist-icon">♪</span><span>Late Night</span></button>

          <div className="sidebar-footer">
            <div><span>Library</span><b>128 tracks</b></div>
            <div><span>Engine</span><b className="ready">Ready</b></div>
          </div>
        </aside>

        <main className="content">
          <div className="page-heading">
            <div><span className="kicker">MUSIC PLAYER</span><h1>{active === "Home" ? "Home" : active}</h1></div>
            <button className="settings" onClick={() => setMessage("Preferences are coming later")}>Preferences</button>
          </div>

          <section className="now-playing">
            <div className="cover" style={{ background: current.accent }}>
              <div className="cover-inner"><span className="cover-name">AETHER</span><span className="cover-title">WAVE</span></div>
            </div>
            <div className="now-info">
              <span className="kicker">NOW PLAYING</span>
              <h2>{current.title}</h2>
              <p>{current.artist} <span>·</span> {current.album}</p>
              <div className="format-line"><span>FLAC</span><span>24 bit</span><span>44.1 kHz</span></div>
              <div className="action-row">
                <button className="play-button" onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</button>
                <button className="small-button" onClick={previous} aria-label="Previous track">‹‹</button>
                <button className="small-button" onClick={next} aria-label="Next track">››</button>
              </div>
            </div>
          </section>

          <section className="visualizer-panel">
            <div className="panel-heading">
              <div><span className="kicker">VISUAL ENGINE</span><h3>Audio spectrum</h3></div>
              <span className="status">● {playing ? "ACTIVE" : "IDLE"} · {message}</span>
            </div>
            <div className="spectrum">
              <div className="spectrum-bars">
                {bars.map((height, i) => <i key={i} style={{ height: `${playing ? height : Math.max(5, height * .32)}px`, animationDelay: `${i * -0.045}s` }} />)}
              </div>
              <div className="spectrum-label">{playing ? "audio reactive" : "play a track to start the visualizer"}</div>
            </div>
          </section>

          <section className="queue">
            <div className="panel-heading">
              <div><span className="kicker">PLAYBACK QUEUE</span><h3>Up next</h3></div>
              <button className="clear-button" onClick={() => setMessage("Queue cleared — demo mode")}>Clear</button>
            </div>
            <div className="track-table">
              <div className="table-head"><span>#</span><span>TRACK</span><span>ALBUM</span><span>TIME</span></div>
              {tracks.map((item, i) => (
                <button key={item.title} className={i === track ? "track-row selected" : "track-row"} onClick={() => selectTrack(i)}>
                  <span className="number">{i === track && playing ? "♫" : String(i + 1).padStart(2, "0")}</span>
                  <span className="track-main"><i style={{ background: item.accent }} /><b>{item.title}</b><small>{item.artist}</small></span>
                  <span className="album">{item.album}</span><span className="duration">{item.duration}</span>
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>

      <footer className="player">
        <div className="player-song"><div className="mini-cover" style={{ background: current.accent }}>A</div><div><b>{current.title}</b><small>{current.artist}</small></div></div>
        <div className="transport">
          <div className="transport-buttons"><button onClick={previous}>‹‹</button><button className="main-play" onClick={() => setPlaying(!playing)}>{playing ? "Ⅱ" : "▶"}</button><button onClick={next}>››</button></div>
          <div className="timeline"><span>1:32</span><input type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(Number(e.target.value))} /><span>{current.duration}</span></div>
        </div>
        <div className="volume"><span>VOL</span><input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /><span>{volume}</span></div>
      </footer>
    </div>
  );
}

export default App;
