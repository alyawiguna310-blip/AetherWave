import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type Track = { title: string; artist: string; album: string; duration: string; accent: string; url?: string; fileName?: string };

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
  if (name === "download") return <svg {...p}><path d="M12 4v10M8 11l4 4 4-4M5 19h14" /></svg>;
  if (name === "spotify") return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M7.2 9.3c3.1-1.2 6.5-1.1 9.6.2M8.2 12.2c2.5-.8 5.1-.7 7.6.3M9.3 15c1.8-.5 3.7-.4 5.4.2" /></svg>;
  if (name === "youtube") return <svg {...p}><rect x="3" y="6" width="18" height="12" rx="3" /><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" /></svg>;
  if (name === "folder") return <svg {...p}><path d="M3.5 7.5h6l1.5 2h9.5v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /><path d="M3.5 7.5V6a2 2 0 0 1 2-2h4l1.5 2h7.5a2 2 0 0 1 2 2v1.5" /></svg>;
  if (name === "settings") return <svg {...p}><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /><path d="m4.9 15.2-1.1 1.9 2.1 2.1 1.9-1.1M8.8 20.2l2.2.6.9-2.1M15.2 20.2l-2.2.6-.9-2.1M19.1 15.2l1.1 1.9-2.1 2.1-1.9-1.1M19.1 8.8l1.1-1.9-2.1-2.1-1.9 1.1M15.2 3.8l-2.2-.6-.9 2.1M8.8 3.8l-2.2-.6-.9 2.1M4.9 8.8 3.8 6.9l2.1-2.1 1.9 1.1" /></svg>;
  if (name === "trash") return <svg {...p}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></svg>;
}

function App() {
  const [active, setActive] = useState<(typeof navItems)[number][0]>("Home");
  const [searchProvider, setSearchProvider] = useState<"YouTube" | "Spotify">("YouTube");
  const [searchQuery, setSearchQuery] = useState("");
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [volume, setVolume] = useState(72);
  const [message, setMessage] = useState("Ready");
  const [showSettings, setShowSettings] = useState(false);
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [spotifyClientId, setSpotifyClientId] = useState("");
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);

  useEffect(() => {
    try {
      setYoutubeApiKey(window.localStorage.getItem("aetherwave.youtubeApiKey") ?? "");
      setSpotifyClientId(window.localStorage.getItem("aetherwave.spotifyClientId") ?? "");
    } catch {
      setMessage("Local credential storage is unavailable in this environment");
    } finally {
      setCredentialsLoaded(true);
    }
  }, []);

  const saveIntegrations = () => {
    try {
      window.localStorage.setItem("aetherwave.youtubeApiKey", youtubeApiKey.trim());
      window.localStorage.setItem("aetherwave.spotifyClientId", spotifyClientId.trim());
      setMessage("Integration settings saved on this device");
      setShowSettings(false);
    } catch {
      setMessage("Could not save integration settings");
    }
  };
  const availableTracks = localTracks;
  const current = availableTracks[Math.min(track, availableTracks.length - 1)] ?? tracks[0];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = current.url ?? "";
      audioRef.current.load();
    }
  }, [current.url]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setProgress((p) => p >= 100 ? 0 : p + 0.25), 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing && current.url) {
      void audioContextRef.current?.resume();
      void audio.play().catch(() => setMessage("Could not play this local audio file"));
    } else {
      audio.pause();
    }
  }, [playing, current.url]);

  useEffect(() => {
    const audio = audioRef.current;
    const canvas = spectrumCanvasRef.current;
    if (!audio || !canvas) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    // React StrictMode re-runs effects in development. Reuse the existing
    // MediaElementAudioSourceNode because an audio element can only have one.
    let context = audioContextRef.current;
    let analyser = analyserRef.current;
    let source = sourceRef.current;
    if (!context || !analyser || !source) {
      context = new AudioContextClass();
      analyser = context.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;
      source = context.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(context.destination);
      audioContextRef.current = context;
      analyserRef.current = analyser;
      sourceRef.current = source;
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const count = 64;
        const gap = Math.max(2 * dpr, width * 0.004);
        const barWidth = (width - gap * (count - 1)) / count;
        for (let i = 0; i < count; i++) {
          const bin = data[Math.floor(i * data.length / count)] / 255;
          const idle = 0.035 + Math.abs(Math.sin(i * 0.43) * 0.07 + Math.sin(i * 0.16) * 0.04);
          const isActive = !audio.paused && Boolean(audio.currentSrc);
          const level = isActive ? bin : idle;
          const barHeight = Math.max(3 * dpr, level * height * 0.88);
          const x = i * (barWidth + gap);
          const y = (height - barHeight) / 2;
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          const accent = getComputedStyle(document.querySelector(".app") ?? canvas).getPropertyValue("--accent").trim() || "#8b7cff";
          gradient.addColorStop(0, accent);
          gradient.addColorStop(1, accent + "55");
          ctx.fillStyle = gradient;
          ctx.globalAlpha = isActive ? 0.95 : 0.52;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, Math.min(3 * dpr, barWidth / 2));
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      frame = window.requestAnimationFrame(draw);
    };
    let frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      // Keep the single audio graph alive across StrictMode effect replays.
    };
  }, []);

  const formatTime = (seconds: number) => { if (!Number.isFinite(seconds) || seconds < 0) return "0:00"; const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60).toString().padStart(2, "0"); return `${mins}:${secs}`; };

  const selectTrack = (index: number) => { const list = availableTracks.length ? availableTracks : tracks; setTrack(index); setProgress(0); setCurrentTime(0); setPlaying(true); setMessage(`Playing ${list[index]?.title ?? "track"}`); };
  const importMusic = (files: FileList | null) => { if (!files?.length) return; const imported = Array.from(files).filter((file) => file.type.startsWith("audio/") || /\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(file.name)).map((file) => ({ title: file.name.replace(/\.[^.]+$/, ""), artist: "Local file", album: "Downloaded Music", duration: "0:00", accent: "#8b7cff", url: URL.createObjectURL(file), fileName: file.name })); if (!imported.length) return; setLocalTracks(imported); setTrack(0); setProgress(0); setCurrentTime(0); setPlaying(false); setActive("Library"); setMessage(`${imported.length} downloaded track${imported.length === 1 ? "" : "s"} loaded`); };
  const next = () => { if (availableTracks.length) selectTrack((track + 1) % availableTracks.length); };
  const previous = () => { if (availableTracks.length) selectTrack((track - 1 + availableTracks.length) % availableTracks.length); };

  return (
    <div className="app" style={{ "--accent": current.accent } as React.CSSProperties}>
      <header className="titlebar">
        <div className="app-name"><span className="app-symbol">A</span><span>AetherWave</span></div>
        <div className="titlebar-center">{active}</div>
        <div className="titlebar-profile">
          <a className="profile-link" href="https://open.spotify.com/" target="_blank" rel="noreferrer" aria-label="Open Spotify">
            <img className="profile-avatar" src="https://github.com/alyawiguna310-blip.png?size=128" alt="" />
            <span><strong>Music</strong><small>Local session</small></span>
          </a>
        </div>
        <div className="window-actions" aria-hidden="true"><span>•</span><span>•</span><span>•</span></div>
      </header>

      <div className="layout">
        <aside className="sidebar">
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

          <div className="sidebar-footer">
            <div><span>Library</span><b>128 tracks</b></div>
            <div><span>Engine</span><b className="ready">Ready</b></div>
          </div>
        </aside>

        <main className="content">
          <input ref={fileInputRef} className="file-picker" type="file" accept="audio/*,.mp3,.flac,.wav,.ogg,.m4a,.aac,.opus" multiple onChange={(e) => importMusic(e.target.files)} />
          <div className="page-heading">
            <div><span className="kicker">MUSIC PLAYER</span><h1>{showSettings ? "Integrations" : active === "Home" ? "Home" : active}</h1></div>
            <div className="heading-actions"><button className="download-button" onClick={() => fileInputRef.current?.click()}><Icon name="download" size={14} /><span>Download Music</span></button><button className="settings" onClick={() => setShowSettings((value) => !value)}><Icon name="settings" size={15} /><span>Preferences</span></button></div>
          </div>

          {showSettings && <section className="integrations-page">
            <div className="integrations-intro">
              <span className="kicker">CONNECT YOUR MUSIC SOURCES</span>
              <h2>API credentials</h2>
              <p>These values are saved in this app on this Windows user profile. They are not sent to GitHub, but browser storage is not encrypted, so only use this on a device you trust.</p>
            </div>
            <div className="integration-card">
              <div className="integration-title"><Icon name="youtube" size={20} /><div><h3>YouTube Data API v3</h3><p>Used to search for YouTube videos.</p></div><span className={youtubeApiKey.trim() ? "integration-status configured" : "integration-status"}>{youtubeApiKey.trim() ? "KEY ADDED" : "NOT SET"}</span></div>
              <label className="integration-label">API key</label>
              <input className="credential-input" type="password" autoComplete="off" spellCheck={false} value={youtubeApiKey} onChange={(e) => setYoutubeApiKey(e.target.value)} placeholder="Paste your YouTube API key" />
              <p className="integration-help">Create it in <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Credentials</a> and restrict it to YouTube Data API v3. Never commit the key to the repository.</p>
            </div>
            <div className="integration-card">
              <div className="integration-title"><Icon name="spotify" size={20} /><div><h3>Spotify Web API</h3><p>Client ID for the Spotify sign-in flow.</p></div><span className={spotifyClientId.trim() ? "integration-status configured" : "integration-status"}>{spotifyClientId.trim() ? "ID ADDED" : "NOT SET"}</span></div>
              <label className="integration-label">Client ID</label>
              <input className="credential-input" type="text" autoComplete="off" spellCheck={false} value={spotifyClientId} onChange={(e) => setSpotifyClientId(e.target.value)} placeholder="Paste your Spotify Client ID" />
              <p className="integration-help">Get it from the <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">Spotify Developer Dashboard</a>. A desktop app should use OAuth PKCE; do not enter or store a Client Secret here.</p>
            </div>
            <div className="integration-actions"><button className="integration-save" disabled={!credentialsLoaded} onClick={saveIntegrations}>Save credentials</button><button className="settings" onClick={() => { setYoutubeApiKey(""); setSpotifyClientId(""); }}>Clear fields</button></div>
            <p className="integration-footnote">This phase adds local credential fields only. YouTube search and Spotify OAuth still need to be connected in the next integration step.</p>
          </section>}
          {!showSettings && active === "Search" && <section className="search-page">
            <div className="search-topline"><div><span className="kicker">DISCOVER SOMETHING NEW</span><h2>Search music</h2></div><span className="search-provider-label">{searchProvider === "Spotify" ? "SPOTIFY" : "YOUTUBE"}</span></div>
            <div className="search-workspace">
              <div className="provider-switch" data-provider={searchProvider} role="group" aria-label="Search provider"><span className="provider-slider" aria-hidden="true" /><button className={searchProvider === "YouTube" ? "provider-option active" : "provider-option"} onClick={() => setSearchProvider("YouTube")} aria-pressed={searchProvider === "YouTube"}><Icon name="youtube" size={16} /><span>YouTube</span></button><button className={searchProvider === "Spotify" ? "provider-option active" : "provider-option"} onClick={() => setSearchProvider("Spotify")} aria-pressed={searchProvider === "Spotify"}><Icon name="spotify" size={16} /><span>Spotify</span></button></div>
              <label className="search-field"><Icon name="search" size={18} /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setMessage(searchProvider + " demo results for " + searchQuery); }} placeholder="What do you want to listen to?" /><kbd>ENTER</kbd>{searchQuery && <button className="clear-search" onClick={() => setSearchQuery("")} aria-label="Clear search">×</button>}</label>
            </div>
            {!searchQuery.trim() ? <div className="browse-section"><div className="panel-heading"><div><span className="kicker">START EXPLORING</span><h3>Browse all</h3></div></div><div className="browse-grid">
              {[{name:"Electronic",tone:"violet",hint:"Synths & late nights"},{name:"Chill",tone:"blue",hint:"Slow down a little"},{name:"Indie",tone:"rose",hint:"Find your next favorite"},{name:"Ambient",tone:"teal",hint:"Soundscapes to drift to"}].map((item) => <button key={item.name} className={"browse-card " + item.tone} onClick={() => setSearchQuery(item.name)}><span>{item.name}</span><small>{item.hint}</small><i><Icon name="music" size={26} /></i></button>)}
            </div><p className="search-note">Preview layout with sample categories. Connect {searchProvider} to search its real catalog.</p></div> : <div className="search-results"><div className="panel-heading"><div><span className="kicker">TOP MATCHES</span><h3>Results for “{searchQuery}”</h3></div><span className="result-count">SAMPLE DATA</span></div>
              {tracks.filter((item) => (item.title + " " + item.artist + " " + item.album).toLowerCase().includes(searchQuery.toLowerCase())).map((item) => <button className="search-result-row" key={item.title} onClick={() => setMessage(item.title + " · " + searchProvider + " playback needs API integration")}><span className="result-cover" style={{background:"linear-gradient(135deg, " + item.accent + ", #181a20)"}}><Icon name="music" size={22} /></span><span className="result-copy"><b>{item.title}</b><small>Song · {item.artist}</small></span><span className="result-album">{item.album}</span><span className="result-play"><Icon name="play" size={15} /></span></button>)}
              {!tracks.some((item) => (item.title + " " + item.artist + " " + item.album).toLowerCase().includes(searchQuery.toLowerCase())) && <div className="search-no-results"><Icon name="search" size={22} /><b>No sample matches found</b><span>Real {searchProvider} results will appear after provider integration.</span></div>}
              <p className="search-note">These are sample results for the UI only — no streaming or catalog search is connected yet.</p>
            </div>}
          </section>}
          {!showSettings && active === "Library" && !localTracks.length && <section className="download-empty"><div className="download-icon"><Icon name="download" size={22} /></div><div><span className="kicker">OFFLINE LIBRARY</span><h3>Download Music</h3><p>Local music files will appear here and remain available offline.</p></div></section>}

          {!showSettings && <div className="now-playing-layout">
          <section className="now-playing">
            <div className="cover" style={{ background: current.accent }}>
              <div className="cover-inner"><span className="cover-name">AETHER</span><span className="cover-title">WAVE</span></div>
            </div>
            <div className="now-info">
              <span className="kicker">NOW PLAYING</span>
              <h2>{current.title}</h2>
              <p>{current.artist} <span>·</span> {current.album}</p>
              <div className="format-line"><span>{current.url ? "LOCAL" : "DEMO"}</span><span>{current.url ? "FILE" : "24 bit"}</span><span>{current.url ? (current.fileName?.split(".").pop()?.toUpperCase() || "AUDIO") : "44.1 kHz"}</span></div>
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
              <canvas ref={spectrumCanvasRef} className="spectrum-canvas" aria-label="Audio frequency spectrum visualizer" />

              <div className="spectrum-label">{playing ? "audio reactive" : "play a track to start the visualizer"}</div>
            </div>
          </section>
          </div>}

          {!showSettings && <section className="queue">
            <div className="panel-heading">
              <div><span className="kicker">PLAYBACK QUEUE</span><h3>Up next</h3></div>
              <button className="clear-button" onClick={() => setMessage("Queue cleared — demo mode")}>Clear</button>
            </div>
            <div className="track-table">
              <div className="table-head"><span>#</span><span>TRACK</span><span>ALBUM</span><span>TIME</span></div>
              {availableTracks.map((item, i) => (
                <button key={item.title} className={i === track ? "track-row selected" : "track-row"} onClick={() => selectTrack(i)}>
                  <span className="number">{i === track && playing ? <Icon name="music" size={14} /> : String(i + 1).padStart(2, "0")}</span>
                  <span className="track-main"><i style={{ background: item.accent }} /><b>{item.title}</b><small>{item.artist}</small></span>
                  <span className="album">{item.album}</span><span className="duration">{item.duration}</span>
                </button>
              ))}
              {!availableTracks.length && <div className="empty-table">No offline tracks yet — use Download Music to add audio files.</div>}
            </div>
          </section>}
        </main>
      </div>

      <footer className="player">
        <audio ref={audioRef} preload="metadata" onLoadedMetadata={(e) => { const duration = e.currentTarget.duration; setLocalTracks((items) => items.map((item, i) => i === track ? { ...item, duration: formatTime(duration) } : item)); }} onTimeUpdate={(e) => { const time = e.currentTarget.currentTime; const duration = e.currentTarget.duration; setCurrentTime(time); setProgress(duration ? (time / duration) * 100 : 0); }} onEnded={next} />
        <div className="player-song"><div className="mini-cover" style={{ background: current.accent }}>A</div><div><b>{current.title}</b><small>{current.artist}</small></div></div>
        <div className="transport">
          <div className="transport-buttons"><button onClick={previous} aria-label="Previous track"><Icon name="prev" size={18} /></button><button className="main-play" onClick={() => setPlaying(!playing)}><Icon name={playing ? "pause" : "play"} size={18} /></button><button onClick={next} aria-label="Next track"><Icon name="next" size={18} /></button></div>
          <div className="timeline"><span>{formatTime(currentTime)}</span><input type="range" min="0" max="100" value={progress} onChange={(e) => { const value = Number(e.target.value); setProgress(value); if (audioRef.current?.duration) audioRef.current.currentTime = (value / 100) * audioRef.current.duration; }} /><span>{current.duration}</span></div>
        </div>
        <div className="volume"><span className="volume-icon"><Icon name="volume" size={16} /></span><input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /><span>{volume}</span></div>
      </footer>
    </div>
  );
}

export default App;
