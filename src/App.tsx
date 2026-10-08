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

function Icon({ name, size = 17 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "home") return <svg {...p}><path d="M3 10.8 12 3l9 7.8" /><path d="M5.5 9.5V21h13V9.5" /><path d="M9.5 21v-6h5v6" /></svg>;
  if (name === "search") return <svg {...p}><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.7 4.7" /></svg>;
  if (name === "library") return <svg {...p}><path d="M5 4h14v16H5z" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></svg>;
  if (name === "visuals") return <svg {...p}><path d="M4 14c1.7-5.3 3.4-5.3 5.1 0s3.4 5.3 5.1 0 3.4-5.3 5.1 0" /><path d="M4 9c1.7-3.1 3.4-3.1 5.1 0s3.4 3.1 5.1 0 3.4-3.1 5.1 0" /></svg>;
  if (name === "plus") return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
  if (name === "music") return <svg {...p}><path d="M9 18V6l10-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></svg>;
  if (name === "play") return <svg {...p} fill="currentColor" stroke="none"><path d="m8 5 11 7-11 7z" /></svg>;
  if (name === "pause") return <svg {...p} fill="currentColor" stroke="none"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>;
  if (name === "prev") return <svg {...p}><path d="M6 5v14M18 6l-8 6 8 6z" /></svg>;
  if (name === "next") return <svg {...p}><path d="M18 5v14M6 6l8 6-8 6z" /></svg>;
  if (name === "volume") return <svg {...p}><path d="M4 10v4h4l5 4V6l-5 4z" /><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10" /></svg>;
  if (name === "settings") return <svg {...p}><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /><path d="m4.9 15.2-1.1 1.9 2.1 2.1 1.9-1.1M8.8 20.2l2.2.6.9-2.1M15.2 20.2l-2.2.6-.9-2.1M19.1 15.2l1.1 1.9-2.1 2.1-1.9-1.1M19.1 8.8l1.1-1.9-2.1-2.1-1.9 1.1M15.2 3.8l-2.2-.6-.9 2.1M8.8 3.8l-2.2-.6-.9 2.1M4.9 8.8 3.8 6.9l2.1-2.1 1.9 1.1" /></svg>;
  if (name === "trash") return <svg {...p}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></svg>;
}

function App() {
  const [active, setActive] = useState<(typeof navItems)[number][0]>("Home");
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(38);
  const [volume, setVolume] = useState(72);
  const [message, setMessage] = useState("Ready");
  const [status, setStatus] = useState<"Online" | "Offline" | "Do not disturb">("Offline");
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

          <div className="nav-label">NAVIGATION <span className="nav-count">4</span></div>
          <nav>
            {navItems.map(({ name, icon }) => (
              <button key={name} className={active === name ? "nav-link active" : "nav-link"} onClick={() => setActive(name)}>
                <span className="nav-icon"><Icon name={icon} /></span><span>{name}</span><span className="nav-arrow">›</span>
              </button>
            ))}
          </nav>

          <div className="nav-label library-label">PLAYLISTS <span className="nav-count">3</span></div>
          <div className="playlist-group">
            <button className="playlist-link create"><span className="playlist-icon"><Icon name="plus" size={15} /></span><span>Create playlist</span><small>+</small></button>
            <button className="playlist-link"><span className="playlist-icon"><Icon name="music" size={15} /></span><span>Liked tracks</span><small>128</small></button>
            <button className="playlist-link"><span className="playlist-icon"><Icon name="music" size={15} /></span><span>Chillwave</span><small>24</small></button>
            <button className="playlist-link"><span className="playlist-icon"><Icon name="music" size={15} /></span><span>Late Night</span><small>16</small></button>
          </div>

          <div className="source-card">
            <div className="source-icon"><Icon name="music" size={14} /></div>
            <div className="source-copy"><strong>AETHERWAVE</strong><small>Desktop music session</small></div>
            <i className={status === "Online" ? "status-dot online" : status === "Do not disturb" ? "status-dot dnd" : "status-dot"} />
            <div className="status-picker" aria-label="Session status">
              {(["Online", "Offline", "Do not disturb"] as const).map((option) => (
                <button key={option} className={status === option ? "status-option active" : "status-option"} onClick={() => { setStatus(option); setMessage(`Status: ${option}`); }}>
                  <span />{option}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-footer">
            <div><span>Library</span><b>128 tracks</b></div>
            <div><span>Engine</span><b className="ready">Ready</b></div>
          </div>
        </aside>

        <main className="content">
          <div className="page-heading">
            <div><span className="kicker">MUSIC PLAYER</span><h1>{active === "Home" ? "Home" : active}</h1></div>
            <button className="settings" onClick={() => setMessage("Preferences are coming later")}><Icon name="settings" size={15} /><span>Preferences</span></button>
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
                <button className="play-button" onClick={() => setPlaying(!playing)}><><Icon name={playing ? "pause" : "play"} size={15} /><span>{playing ? "Pause" : "Play"}</span></></button>
                <button className="small-button" onClick={previous} aria-label="Previous track"><Icon name="prev" /></button>
                <button className="small-button" onClick={next} aria-label="Next track"><Icon name="next" /></button>
              </div>
            </div>
          </section>

          <section className="visualizer-panel">
            <div className="panel-heading">
              <div><span className="kicker">VISUAL ENGINE</span><h3>Audio spectrum</h3></div>
              <span className="status"><i />{playing ? "ACTIVE" : "IDLE"}<b />{message}</span>
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
                  <span className="number">{i === track && playing ? <Icon name="music" size={14} /> : String(i + 1).padStart(2, "0")}</span>
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
          <div className="transport-buttons"><button onClick={previous} aria-label="Previous track"><Icon name="prev" size={18} /></button><button className="main-play" onClick={() => setPlaying(!playing)}><Icon name={playing ? "pause" : "play"} size={18} /></button><button onClick={next} aria-label="Next track"><Icon name="next" size={18} /></button></div>
          <div className="timeline"><span>1:32</span><input type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(Number(e.target.value))} /><span>{current.duration}</span></div>
        </div>
        <div className="volume"><span className="volume-icon"><Icon name="volume" size={16} /></span><input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /><span>{volume}</span></div>
      </footer>
    </div>
  );
}

export default App;
