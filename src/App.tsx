import { useEffect, useRef, useState } from "react";
import { startCapture, stopCapture } from "tauri-plugin-wasapi-api";
import "./App.css";

type Track = { title: string; artist: string; album: string; duration: string; accent: string; url?: string; fileName?: string };
type YouTubeVideo = {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    description: string;
    thumbnails?: { medium?: { url: string }; high?: { url: string }; default?: { url: string } };
  };
};

type VisMode = "bars" | "wave" | "circle";

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
  if (name === "bars") return <svg {...p}><path d="M4 18V10M8 18V6M12 18V12M16 18V8M20 18V14" /></svg>;
  if (name === "wave") return <svg {...p}><path d="M2 12c1.5-4 3-4 4.5 0s3 4 4.5 0 3-4 4.5 0 3 4 4.5 0" /></svg>;
  if (name === "circle") return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></svg>;
}

const SYSTEM_FFT_SIZE = 2048;

function calculateSystemSpectrum(buffer: Float32Array, writeIndex: number): number[] {
  const size = SYSTEM_FFT_SIZE;
  const real = new Float32Array(size);
  const imag = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const sample = buffer[(writeIndex + i) % size] ?? 0;
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
    real[i] = sample * hann;
  }
  let j = 0;
  for (let i = 1; i < size; i++) {
    let bit = size >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let length = 2; length <= size; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const stepReal = Math.cos(angle);
    const stepImag = Math.sin(angle);
    for (let start = 0; start < size; start += length) {
      let wr = 1, wi = 0;
      const half = length >> 1;
      for (let k = 0; k < half; k++) {
        const even = start + k, odd = even + half;
        const tr = wr * real[odd] - wi * imag[odd];
        const ti = wr * imag[odd] + wi * real[odd];
        real[odd] = real[even] - tr; imag[odd] = imag[even] - ti;
        real[even] += tr; imag[even] += ti;
        const nextWr = wr * stepReal - wi * stepImag;
        wi = wr * stepImag + wi * stepReal; wr = nextWr;
      }
    }
  }
  const bars: number[] = [];
  const sampleRate = 16000;
  for (let bar = 0; bar < 56; bar++) {
    const lowHz = 35 * Math.pow(8000 / 35, bar / 56);
    const highHz = 35 * Math.pow(8000 / 35, (bar + 1) / 56);
    const first = Math.max(1, Math.floor((lowHz * size) / sampleRate));
    const last = Math.min(size / 2, Math.max(first + 1, Math.ceil((highHz * size) / sampleRate)));
    let power = 0, bins = 0;
    for (let bin = first; bin < last; bin++) { power += real[bin] * real[bin] + imag[bin] * imag[bin]; bins++; }
    const magnitude = bins ? Math.sqrt(power / bins) / size : 0;
    bars.push(Math.min(1, Math.sqrt(magnitude * 28)));
  }
  return bars;
}

// Generates a music-shaped fake spectrum for YouTube (cross-origin, can't tap real audio).
// Uses multiple overlapping sine waves at different tempos to mimic bass/mid/treble energy.
function getFakeSpectrum(now: number, barCount: number): number[] {
  const beat = (now / 1000) % 1;
  const beatPulse = Math.pow(Math.max(0, 1 - beat * 3.5), 1.8) * 0.55;
  const bars: number[] = [];
  for (let i = 0; i < barCount; i++) {
    const t = i / barCount;
    // Bass hump (left), mid bump, treble taper
    const bassShape = Math.exp(-Math.pow((t - 0.08) / 0.12, 2)) * (0.65 + beatPulse * 0.9);
    const midShape = Math.exp(-Math.pow((t - 0.38) / 0.18, 2)) * 0.4;
    const trebleShape = Math.exp(-Math.pow((t - 0.72) / 0.14, 2)) * 0.18;
    const shimmer =
      Math.abs(Math.sin(now / 290 + i * 0.55)) * 0.22 +
      Math.abs(Math.sin(now / 480 + i * 0.27)) * 0.14 +
      Math.abs(Math.sin(now / 130 + i * 0.9)) * 0.08;
    const level = Math.min(1, (bassShape + midShape + trebleShape) * (0.55 + shimmer));
    bars.push(Math.max(0.02, level));
  }
  return bars;
}

// Draw bars visualizer
function drawBars(ctx: CanvasRenderingContext2D, width: number, height: number, levels: number[], accent: string, dpr: number, active: boolean) {
  const count = levels.length;
  const gap = Math.max(2 * dpr, width * 0.004);
  const barWidth = Math.max(1, (width - gap * (count - 1)) / count);
  for (let i = 0; i < count; i++) {
    const level = levels[i];
    const barHeight = Math.max(2 * dpr, level * height * 0.86);
    const x = i * (barWidth + gap);
    const y = (height - barHeight) / 2;
    const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(0.5, accent + "bb");
    gradient.addColorStop(1, accent + "44");
    ctx.fillStyle = gradient;
    ctx.globalAlpha = active ? 0.92 : 0.38;
    // Rounded top cap
    ctx.beginPath();
    const r = Math.min(barWidth / 2, 3 * dpr);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barWidth - r, y);
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
    ctx.lineTo(x + barWidth, y + barHeight - r);
    ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - r, y + barHeight);
    ctx.lineTo(x + r, y + barHeight);
    ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.fill();
    // Reflection glow at bottom
    if (active) {
      const glowH = Math.max(2 * dpr, level * height * 0.12);
      const gx = ctx.createLinearGradient(0, height, 0, height - glowH);
      gx.addColorStop(0, accent + "22");
      gx.addColorStop(1, "transparent");
      ctx.fillStyle = gx;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(x, height - glowH, barWidth, glowH);
    }
  }
  ctx.globalAlpha = 1;
}

// Draw waveform visualizer
function drawWave(ctx: CanvasRenderingContext2D, width: number, height: number, levels: number[], accent: string, active: boolean) {
  const points = levels.length;
  const centerY = height / 2;
  ctx.lineWidth = active ? 2.2 : 1.2;
  ctx.strokeStyle = accent;
  ctx.globalAlpha = active ? 0.88 : 0.32;
  ctx.shadowColor = accent;
  ctx.shadowBlur = active ? 8 : 0;
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * width;
    const amp = (levels[i] - 0.5) * height * 0.72;
    if (i === 0) ctx.moveTo(x, centerY + amp);
    else ctx.lineTo(x, centerY + amp);
  }
  ctx.stroke();
  // Mirror
  ctx.globalAlpha = active ? 0.28 : 0.1;
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * width;
    const amp = (levels[i] - 0.5) * height * 0.72;
    if (i === 0) ctx.moveTo(x, centerY - amp);
    else ctx.lineTo(x, centerY - amp);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// Draw circular visualizer
function drawCircle(ctx: CanvasRenderingContext2D, width: number, height: number, levels: number[], accent: string, active: boolean, now: number) {
  const cx = width / 2, cy = height / 2;
  const maxR = Math.min(cx, cy) * 0.82;
  const baseR = maxR * 0.38;
  const count = levels.length;
  ctx.globalAlpha = active ? 0.9 : 0.3;
  // Rotating glow ring
  const spin = (now / 4000) * Math.PI * 2;
  const grd = ctx.createRadialGradient(cx, cy, baseR * 0.8, cx, cy, maxR);
  grd.addColorStop(0, accent + "18");
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
  ctx.fill();
  // Bars around circle
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2 + spin * 0.08;
    const level = levels[i];
    const barLen = level * (maxR - baseR) * 0.95;
    const x1 = cx + Math.cos(angle) * baseR;
    const y1 = cy + Math.sin(angle) * baseR;
    const x2 = cx + Math.cos(angle) * (baseR + barLen);
    const y2 = cy + Math.sin(angle) * (baseR + barLen);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(1.2, (Math.PI * 2 * baseR / count) * 0.55);
    ctx.lineCap = "round";
    ctx.globalAlpha = active ? (0.5 + level * 0.5) : 0.2;
    ctx.shadowColor = accent;
    ctx.shadowBlur = active ? level * 10 : 0;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // Center dot
  ctx.shadowBlur = active ? 16 : 0;
  ctx.globalAlpha = active ? 0.85 : 0.25;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(cx, cy, baseR * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function App() {
  const [active, setActive] = useState<(typeof navItems)[number]["name"]>("Home");
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
  const [youtubeResults, setYoutubeResults] = useState<YouTubeVideo[]>([]);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState("");
  const [selectedYouTubeVideo, setSelectedYouTubeVideo] = useState<YouTubeVideo | null>(null);
  const [youtubeIsPlaying, setYoutubeIsPlaying] = useState(false);
  const [youtubeDuration, setYoutubeDuration] = useState(0);
  const [showYouTubeVideo, setShowYouTubeVideo] = useState(false);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(false);
  const systemSpectrumRef = useRef<number[]>([]);
  const [visMode, setVisMode] = useState<VisMode>("bars");

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

  const systemAudioBufferRef = useRef<Float32Array>(new Float32Array(SYSTEM_FFT_SIZE));
  const systemAudioWriteRef = useRef(0);

  const toggleSystemAudioCapture = async () => {
    if (systemAudioEnabled) {
      try {
        await stopCapture("system-audio");
        setSystemAudioEnabled(false);
        systemSpectrumRef.current = [];
        setMessage("System audio capture stopped");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not stop system audio capture");
      }
      return;
    }
    systemAudioBufferRef.current.fill(0);
    systemAudioWriteRef.current = 0;
    systemSpectrumRef.current = [];
    try {
      await startCapture(
        { sessionId: "system-audio", loopback: true, sampleRate: 16000, channels: 1 },
        (event) => {
          if (event.event === "data") {
            if (event.data.sessionId !== "system-audio") return;
            const bytes = new Uint8Array(event.data.data);
            const pcm = new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4));
            const ring = systemAudioBufferRef.current;
            let write = systemAudioWriteRef.current;
            for (let i = 0; i < pcm.length; i++) {
              ring[write] = Number.isFinite(pcm[i]) ? pcm[i] : 0;
              write = (write + 1) % ring.length;
            }
            systemAudioWriteRef.current = write;
            systemSpectrumRef.current = calculateSystemSpectrum(ring, write);
          } else if (event.event === "error") {
            setSystemAudioEnabled(false);
            systemSpectrumRef.current = [];
            setMessage(`System audio capture failed: ${event.data.message}`);
          } else if (event.event === "stopped") {
            setSystemAudioEnabled(false);
            systemSpectrumRef.current = [];
          }
        },
      );
      setSystemAudioEnabled(true);
      setMessage("Listening to Windows system audio");
    } catch (error) {
      setSystemAudioEnabled(false);
      setMessage(error instanceof Error ? `System audio capture failed: ${error.message}` : "System audio capture requires the installed Windows app");
    }
  };

  useEffect(() => () => {
    void stopCapture("system-audio").catch(() => {});
  }, []);

  const saveIntegrations = () => {
    try {
      window.localStorage.setItem("aetherwave.youtubeApiKey", youtubeApiKey.trim());
      window.localStorage.setItem("aetherwave.spotifyClientId", spotifyClientId.trim());
      setMessage("Integration settings saved");
      setShowSettings(false);
    } catch {
      setMessage("Could not save integration settings");
    }
  };

  const searchYouTube = async (query = searchQuery) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) { setYoutubeError("Type a song, artist, or topic to search."); setYoutubeResults([]); setSearchedQuery(""); return; }
    if (!youtubeApiKey.trim()) { setYoutubeError("Add your YouTube Data API key in Preferences → Integrations first."); setYoutubeResults([]); setSearchedQuery(cleanQuery); setMessage("YouTube API key required"); return; }
    setYoutubeLoading(true); setYoutubeError(""); setSearchedQuery(cleanQuery); setMessage("Searching YouTube…");
    try {
      const params = new URLSearchParams({ part: "snippet", type: "video", maxResults: "12", q: cleanQuery, key: youtubeApiKey.trim(), safeSearch: "moderate" });
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
      const payload = await response.json() as { items?: YouTubeVideo[]; error?: { message?: string; errors?: Array<{ reason?: string }> } };
      if (!response.ok) {
        const reason = payload.error?.errors?.[0]?.reason;
        if (response.status === 403 && reason === "quotaExceeded") throw new Error("YouTube API quota used up for today. Try again after the quota resets.");
        if (response.status === 403) throw new Error("Google rejected this API request. Check that YouTube Data API v3 is enabled.");
        throw new Error(payload.error?.message || `YouTube request failed (${response.status}).`);
      }
      const items = (payload.items ?? []).filter((item) => item.id?.videoId);
      setYoutubeResults(items);
      setMessage(`Found ${items.length} YouTube results`);
    } catch (error) {
      setYoutubeResults([]);
      setYoutubeError(error instanceof Error ? error.message : "Could not search YouTube. Check your internet connection and API key.");
      setMessage("YouTube search failed");
    } finally {
      setYoutubeLoading(false);
    }
  };

  const playYouTubeVideo = (video: YouTubeVideo) => {
    setSelectedYouTubeVideo(video);
    setYoutubeDuration(0); setCurrentTime(0); setProgress(0);
    setShowYouTubeVideo(false); setYoutubeIsPlaying(true); setPlaying(true);
    setMessage(`Playing ${video.snippet.title}`);
  };

  const availableTracks = localTracks;
  const current: Track = selectedYouTubeVideo
    ? { title: selectedYouTubeVideo.snippet.title, artist: selectedYouTubeVideo.snippet.channelTitle, album: "YouTube", duration: "—", accent: "#ff7777" }
    : availableTracks[Math.min(track, availableTracks.length - 1)] ?? tracks[0];

  const sendYouTubeCommand = (func: string, args: unknown[] = []) => {
    const iframe = youtubeIframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "https://www.youtube-nocookie.com");
  };

  useEffect(() => {
    if (!selectedYouTubeVideo) return;
    sendYouTubeCommand(youtubeIsPlaying ? "playVideo" : "pauseVideo");
  }, [youtubeIsPlaying, selectedYouTubeVideo]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume / 100;
    if (selectedYouTubeVideo) sendYouTubeCommand("setVolume", [volume]);
  }, [volume, selectedYouTubeVideo]);

  useEffect(() => {
    if (!selectedYouTubeVideo) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube-nocookie.com" || typeof event.data !== "string") return;
      try {
        const payload = JSON.parse(event.data) as { event?: string; info?: { currentTime?: number; duration?: number; playerState?: number } };
        if (payload.event !== "infoDelivery" || !payload.info) return;
        const time = payload.info.currentTime;
        const duration = payload.info.duration;
        if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) setYoutubeDuration(duration);
        if (typeof time === "number" && Number.isFinite(time)) {
          setCurrentTime(time);
          const total = typeof duration === "number" && duration > 0 ? duration : youtubeDuration;
          if (total > 0) setProgress(Math.min(100, (time / total) * 100));
        }
        if (typeof payload.info.playerState === "number") {
          const isPlaying = payload.info.playerState === 1;
          setYoutubeIsPlaying(isPlaying); setPlaying(isPlaying);
        }
      } catch { /* ignore non-JSON */ }
    };
    window.addEventListener("message", onMessage);
    const requestTimer = window.setInterval(() => {
      sendYouTubeCommand("getCurrentTime");
      sendYouTubeCommand("getDuration");
    }, 500);
    return () => { window.removeEventListener("message", onMessage); window.clearInterval(requestTimer); };
  }, [selectedYouTubeVideo]);

  useEffect(() => {
    if (audioRef.current) { audioRef.current.src = current.url ?? ""; audioRef.current.load(); }
  }, [current.url]);

  useEffect(() => {
    if (!playing || selectedYouTubeVideo) return;
    const timer = window.setInterval(() => setProgress((p) => p >= 100 ? 0 : p + 0.25), 1000);
    return () => window.clearInterval(timer);
  }, [playing, selectedYouTubeVideo]);

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
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;
    const audio = audioRef.current;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    let analyser = analyserRef.current;

    if (audio && AudioContextClass && !analyserRef.current) {
      try {
        const context = audioContextRef.current ?? new AudioContextClass();
        const source = sourceRef.current ?? context.createMediaElementSource(audio);
        analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.82;
        source.connect(analyser);
        analyser.connect(context.destination);
        audioContextRef.current = context;
        sourceRef.current = source;
        analyserRef.current = analyser;
      } catch (error) {
        console.warn("AetherWave spectrum analyser unavailable; using visual fallback.", error);
        analyser = null;
      }
    }

    let frame = 0;
    const COUNT = 56;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));

      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }

      const ctx = canvas.getContext("2d");
      if (!ctx || rect.width <= 0 || rect.height <= 0) { frame = window.requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, width, height);

      const styleTarget = document.querySelector(".app") ?? canvas;
      const accent = getComputedStyle(styleTarget).getPropertyValue("--accent").trim() || "#8b7cff";
      const now = performance.now();

      const systemBins = systemSpectrumRef.current;
      const hasSystemSpectrum = systemAudioEnabled && systemBins.length === COUNT;
      const isYouTubeActive = Boolean(selectedYouTubeVideo && youtubeIsPlaying);
      const isLocalActive = Boolean(!selectedYouTubeVideo && playing && audio && !audio.paused && audio.currentSrc);
      const isActive = hasSystemSpectrum ? systemBins.some((v) => v > 0.025) : isYouTubeActive || isLocalActive;

      // Build levels array
      let levels: number[];
      if (hasSystemSpectrum) {
        levels = systemBins;
      } else if (isLocalActive && analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        try { analyser.getByteFrequencyData(data); } catch { /* ignore */ }
        levels = Array.from({ length: COUNT }, (_, i) =>
          (data[Math.min(data.length - 1, Math.floor(i * data.length / COUNT))] / 255)
        );
      } else if (isYouTubeActive) {
        // Good-looking fake spectrum shaped like real music
        levels = getFakeSpectrum(now, COUNT);
      } else {
        // Idle: very subtle breathing animation
        const idleLevels: number[] = [];
        for (let i = 0; i < COUNT; i++) {
          const base = 0.018 + Math.abs(Math.sin(i * 0.43) * 0.022 + Math.sin(i * 0.16) * 0.012);
          const breathe = base + Math.abs(Math.sin(now / 2200 + i * 0.3)) * 0.028;
          idleLevels.push(breathe);
        }
        levels = idleLevels;
      }

      // Draw the selected visualizer mode
      const currentVisMode = (canvas as HTMLCanvasElement & { _visMode?: VisMode })._visMode ?? "bars";
      if (currentVisMode === "wave") {
        drawWave(ctx, width, height, levels, accent, isActive);
      } else if (currentVisMode === "circle") {
        drawCircle(ctx, width, height, levels, accent, isActive, now);
      } else {
        drawBars(ctx, width, height, levels, accent, dpr, isActive);
      }

      frame = window.requestAnimationFrame(draw);
    };

    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [selectedYouTubeVideo, youtubeIsPlaying, playing, current.url, showSettings, systemAudioEnabled]);

  // Sync visMode to canvas via custom property (avoids stale closure)
  useEffect(() => {
    const canvas = spectrumCanvasRef.current;
    if (canvas) (canvas as HTMLCanvasElement & { _visMode?: VisMode })._visMode = visMode;
  }, [visMode]);

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const selectTrack = (index: number) => {
    const list = availableTracks.length ? availableTracks : tracks;
    setSelectedYouTubeVideo(null); setYoutubeIsPlaying(false);
    setTrack(index); setProgress(0); setCurrentTime(0); setPlaying(true);
    setMessage(`Playing ${list[index]?.title ?? "track"}`);
  };

  const importMusic = (files: FileList | null) => {
    if (!files?.length) return;
    const imported = Array.from(files)
      .filter((file) => file.type.startsWith("audio/") || /\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(file.name))
      .map((file) => ({ title: file.name.replace(/\.[^.]+$/, ""), artist: "Local file", album: "Downloaded Music", duration: "0:00", accent: "#8b7cff", url: URL.createObjectURL(file), fileName: file.name }));
    if (!imported.length) return;
    setLocalTracks(imported); setTrack(0); setProgress(0); setCurrentTime(0);
    setPlaying(false); setActive("Library"); setMessage(`${imported.length} track${imported.length === 1 ? "" : "s"} loaded`);
  };

  const next = () => {
    if (selectedYouTubeVideo && youtubeResults.length) {
      const index = youtubeResults.findIndex((item) => item.id.videoId === selectedYouTubeVideo.id.videoId);
      playYouTubeVideo(youtubeResults[(index + 1 + youtubeResults.length) % youtubeResults.length]);
      return;
    }
    if (availableTracks.length) selectTrack((track + 1) % availableTracks.length);
  };
  const previous = () => {
    if (selectedYouTubeVideo && youtubeResults.length) {
      const index = youtubeResults.findIndex((item) => item.id.videoId === selectedYouTubeVideo.id.videoId);
      playYouTubeVideo(youtubeResults[(index - 1 + youtubeResults.length) % youtubeResults.length]);
      return;
    }
    if (availableTracks.length) selectTrack((track - 1 + availableTracks.length) % availableTracks.length);
  };

  const visModes: { id: VisMode; icon: string; label: string }[] = [
    { id: "bars", icon: "bars", label: "Bars" },
    { id: "wave", icon: "wave", label: "Wave" },
    { id: "circle", icon: "circle", label: "Circle" },
  ];

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
        <div className="window-actions" aria-hidden="true"><span /><span /><span /></div>
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
            <div className="heading-actions">
              <button className="download-button" onClick={() => fileInputRef.current?.click()}><Icon name="download" size={14} /><span>Download Music</span></button>
              <button className="settings" onClick={() => setShowSettings((v) => !v)}><Icon name="settings" size={15} /><span>Preferences</span></button>
            </div>
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
            <div className="integration-actions">
              <button className="integration-save" disabled={!credentialsLoaded} onClick={saveIntegrations}>Save credentials</button>
              <button className="settings" onClick={() => { setYoutubeApiKey(""); setSpotifyClientId(""); }}>Clear fields</button>
            </div>
            <p className="integration-footnote">YouTube search is connected to the key saved on this device. Spotify is paused for now.</p>
          </section>}

          {selectedYouTubeVideo && <section className="youtube-player-panel persistent-youtube-player" aria-label="YouTube player">
            <div className="youtube-player-caption">
              <b title={selectedYouTubeVideo.snippet.title}>{selectedYouTubeVideo.snippet.title}</b>
              <span>{selectedYouTubeVideo.snippet.channelTitle}</span>
              <button className="settings" onClick={() => setShowYouTubeVideo((v) => !v)}>{showYouTubeVideo ? "Hide video" : "Show video"}</button>
              <button className="settings" onClick={() => { setSelectedYouTubeVideo(null); setYoutubeIsPlaying(false); setShowYouTubeVideo(false); setPlaying(false); setMessage("YouTube playback stopped"); }}>Close</button>
            </div>
            <div className={`youtube-player-frame${showYouTubeVideo ? "" : " youtube-player-frame-hidden"}`}>
              <iframe
                ref={youtubeIframeRef}
                key={selectedYouTubeVideo.id.videoId}
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(selectedYouTubeVideo.id.videoId)}?autoplay=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                title={selectedYouTubeVideo.snippet.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                onLoad={() => {
                  const iframe = youtubeIframeRef.current;
                  if (iframe?.contentWindow) {
                    iframe.contentWindow.postMessage(JSON.stringify({ event: "listening", id: "aetherwave" }), "https://www.youtube-nocookie.com");
                    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }), "https://www.youtube-nocookie.com");
                    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [volume] }), "https://www.youtube-nocookie.com");
                    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: youtubeIsPlaying ? "playVideo" : "pauseVideo", args: [] }), "https://www.youtube-nocookie.com");
                  }
                }}
              />
            </div>
          </section>}

          {!showSettings && active === "Search" && <section className="search-page">
            <div className="search-topline"><div><span className="kicker">DISCOVER SOMETHING NEW</span><h2>Search music</h2></div><span className="search-provider-label">{searchProvider === "Spotify" ? "SPOTIFY" : "YOUTUBE"}</span></div>
            <div className="search-workspace">
              <div className="provider-switch" data-provider="YouTube" role="group" aria-label="Search provider">
                <span className="provider-slider" aria-hidden="true" />
                <button className="provider-option active" onClick={() => setSearchProvider("YouTube")} aria-pressed={true}><Icon name="youtube" size={16} /><span>YouTube</span></button>
                <button className="provider-option provider-disabled" onClick={() => { setSearchProvider("YouTube"); setMessage("Spotify is paused while we finish YouTube integration"); }} aria-pressed={false} title="Spotify integration is paused"><Icon name="spotify" size={16} /><span>Spotify · later</span></button>
              </div>
              <label className="search-field">
                <Icon name="search" size={18} />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void searchYouTube(); }} placeholder="Search songs, artists, or music…" />
                <button className="youtube-search-button" onClick={() => void searchYouTube()} disabled={youtubeLoading} aria-label="Search YouTube">{youtubeLoading ? "…" : "Search"}</button>
                {searchQuery && <button className="clear-search" onClick={() => { setSearchQuery(""); setSearchedQuery(""); setYoutubeResults([]); setYoutubeError(""); }} aria-label="Clear search">×</button>}
              </label>
            </div>
            {!searchedQuery && !youtubeError ? (
              <div className="browse-section">
                <div className="panel-heading"><div><span className="kicker">START EXPLORING</span><h3>Browse music</h3></div></div>
                <div className="browse-grid">
                  {[{name:"Electronic",tone:"violet",hint:"Synths & late nights"},{name:"Chill",tone:"blue",hint:"Slow down a little"},{name:"Indie",tone:"rose",hint:"Find your next favorite"},{name:"Ambient",tone:"teal",hint:"Soundscapes to drift to"}].map((item) => (
                    <button key={item.name} className={"browse-card " + item.tone} onClick={() => { setSearchQuery(item.name); void searchYouTube(item.name); }}>
                      <span>{item.name}</span><small>{item.hint}</small><i><Icon name="music" size={26} /></i>
                    </button>
                  ))}
                </div>
                <p className="search-note">Searches real YouTube videos. Add your API key in Preferences if you haven't already.</p>
              </div>
            ) : (
              <div className="search-results">
                <div className="panel-heading"><div><span className="kicker">YOUTUBE RESULTS</span><h3>{searchedQuery ? `Results for "${searchedQuery}"` : "Search YouTube"}</h3></div><span className="result-count">{youtubeLoading ? "SEARCHING…" : `${youtubeResults.length} VIDEOS`}</span></div>
                {youtubeError && <div className="youtube-error" role="alert"><Icon name="search" size={18} /><span>{youtubeError}</span>{!youtubeApiKey.trim() && <button className="settings" onClick={() => setShowSettings(true)}>Open Preferences</button>}</div>}
                {youtubeLoading && <div className="youtube-loading"><span className="youtube-spinner" /> Searching YouTube…</div>}
                {!youtubeLoading && !youtubeError && youtubeResults.map((item) => {
                  const thumbnail = item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url;
                  return (
                    <button className={selectedYouTubeVideo?.id.videoId === item.id.videoId ? "youtube-result-row selected" : "youtube-result-row"} key={item.id.videoId} onClick={() => playYouTubeVideo(item)} title="Play this video inside AetherWave">
                      {thumbnail ? <img className="youtube-thumbnail" src={thumbnail} alt="" loading="lazy" /> : <span className="youtube-thumbnail youtube-thumbnail-fallback"><Icon name="youtube" size={22} /></span>}
                      <span className="youtube-result-copy"><b>{item.snippet.title}</b><small>{item.snippet.channelTitle}</small><span>{item.snippet.description || "No description available."}</span></span>
                      <span className="youtube-open"><Icon name="play" size={15} /></span>
                    </button>
                  );
                })}
                {!youtubeLoading && !youtubeError && searchedQuery && !youtubeResults.length && <div className="search-no-results"><Icon name="search" size={22} /><b>No videos found</b><span>Try a different song title or artist.</span></div>}
                <p className="search-note">Select a result to play it here. Some videos may not allow embedded playback.</p>
              </div>
            )}
          </section>}

          {!showSettings && active === "Library" && !localTracks.length && (
            <section className="download-empty">
              <div className="download-icon"><Icon name="download" size={22} /></div>
              <div><span className="kicker">OFFLINE LIBRARY</span><h3>Download Music</h3><p>Local music files will appear here and remain available offline.</p></div>
            </section>
          )}

          {!showSettings && (
            <div className="now-playing-layout">
              <section className="now-playing">
                <div className="cover" style={{ background: current.accent }}>
                  {selectedYouTubeVideo
                    ? <img className="cover-artwork" src={selectedYouTubeVideo.snippet.thumbnails?.high?.url ?? selectedYouTubeVideo.snippet.thumbnails?.medium?.url ?? selectedYouTubeVideo.snippet.thumbnails?.default?.url} alt={`${selectedYouTubeVideo.snippet.title} thumbnail`} />
                    : <div className="cover-inner"><span className="cover-name">AETHER</span><span className="cover-title">WAVE</span></div>}
                </div>
                <div className="now-info">
                  <span className="kicker">NOW PLAYING</span>
                  <h2 title={current.title}>{current.title}</h2>
                  <p>{current.artist} <span>·</span> {current.album}</p>
                  <div className="format-line">
                    <span>{current.url ? "LOCAL" : selectedYouTubeVideo ? "YT" : "DEMO"}</span>
                    <span>{current.url ? "FILE" : selectedYouTubeVideo ? "STREAM" : "24 bit"}</span>
                    <span>{current.url ? (current.fileName?.split(".").pop()?.toUpperCase() || "AUDIO") : selectedYouTubeVideo ? "720p" : "44.1 kHz"}</span>
                  </div>
                  <div className="action-row">
                    <button className="play-button" onClick={() => { const n = !playing; setPlaying(n); if (selectedYouTubeVideo) setYoutubeIsPlaying(n); }}>
                      <Icon name={playing ? "pause" : "play"} size={15} /><span>{playing ? "Pause" : "Play"}</span>
                    </button>
                    <button className="small-button" onClick={previous} aria-label="Previous track"><Icon name="prev" /></button>
                    <button className="small-button" onClick={next} aria-label="Next track"><Icon name="next" /></button>
                  </div>
                </div>
              </section>

              <section className="visualizer-panel">
                <div className="vis-header">
                  <div className="vis-header-left">
                    <span className="kicker">VISUAL ENGINE</span>
                    <div className="vis-source-tag">
                      {systemAudioEnabled
                        ? <><i className="vis-dot vis-dot--system" />SYSTEM AUDIO</>
                        : isYouTubeActiveHere(playing, selectedYouTubeVideo, youtubeIsPlaying)
                          ? <><i className="vis-dot vis-dot--yt" />YOUTUBE · simulated</>
                          : playing
                            ? <><i className="vis-dot vis-dot--local" />LOCAL AUDIO</>
                            : <><i className="vis-dot vis-dot--idle" />IDLE</>}
                    </div>
                  </div>
                  <div className="vis-controls">
                    <div className="vis-mode-switcher">
                      {visModes.map((m) => (
                        <button key={m.id} className={`vis-mode-btn${visMode === m.id ? " active" : ""}`} onClick={() => setVisMode(m.id)} title={m.label} aria-label={m.label}>
                          <Icon name={m.icon} size={13} />
                        </button>
                      ))}
                    </div>
                    <button className={`settings vis-sys-btn${systemAudioEnabled ? " vis-sys-btn--on" : ""}`} onClick={() => void toggleSystemAudioCapture()}>
                      {systemAudioEnabled ? "Stop sys audio" : "System audio"}
                    </button>
                  </div>
                </div>
                <div className="spectrum">
                  <canvas ref={spectrumCanvasRef} className="spectrum-canvas" aria-label="Audio frequency spectrum visualizer" />
                </div>
                <div className="vis-footer-label">{message}</div>
              </section>
            </div>
          )}

          {!showSettings && (
            <section className="queue">
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
            </section>
          )}
        </main>
      </div>

      <footer className="player">
        <audio
          ref={audioRef}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const duration = e.currentTarget.duration;
            setLocalTracks((items) => items.map((item, i) => i === track ? { ...item, duration: formatTime(duration) } : item));
          }}
          onTimeUpdate={(e) => {
            const time = e.currentTarget.currentTime;
            const duration = e.currentTarget.duration;
            setCurrentTime(time);
            setProgress(duration ? (time / duration) * 100 : 0);
          }}
          onEnded={next}
        />
        <div className="player-song">
          {selectedYouTubeVideo
            ? <img className="mini-cover thumbnail-cover" src={selectedYouTubeVideo.snippet.thumbnails?.medium?.url ?? selectedYouTubeVideo.snippet.thumbnails?.default?.url} alt="" />
            : <div className="mini-cover" style={{ background: current.accent }}>A</div>}
          <div><b title={current.title}>{current.title}</b><small>{current.artist}</small></div>
        </div>
        <div className="transport">
          <div className="transport-buttons">
            <button onClick={previous} aria-label="Previous track"><Icon name="prev" size={18} /></button>
            <button className="main-play" onClick={() => { const n = !playing; setPlaying(n); if (selectedYouTubeVideo) setYoutubeIsPlaying(n); }}><Icon name={playing ? "pause" : "play"} size={18} /></button>
            <button onClick={next} aria-label="Next track"><Icon name="next" size={18} /></button>
          </div>
          <div className="timeline">
            <span>{formatTime(currentTime)}</span>
            <input type="range" min="0" max="100" value={progress} onChange={(e) => {
              const value = Number(e.target.value);
              setProgress(value);
              if (selectedYouTubeVideo) sendYouTubeCommand("seekTo", [youtubeDuration > 0 ? (value / 100) * youtubeDuration : currentTime, true]);
              else if (audioRef.current?.duration) audioRef.current.currentTime = (value / 100) * audioRef.current.duration;
            }} />
            <span>{selectedYouTubeVideo ? formatTime(youtubeDuration) : current.duration}</span>
          </div>
        </div>
        <div className="volume">
          <span className="volume-icon"><Icon name="volume" size={16} /></span>
          <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
          <span>{volume}</span>
        </div>
      </footer>
    </div>
  );
}

// Helper to avoid stale closure in JSX
function isYouTubeActiveHere(playing: boolean, selectedYouTubeVideo: YouTubeVideo | null, youtubeIsPlaying: boolean) {
  return playing && Boolean(selectedYouTubeVideo) && youtubeIsPlaying;
}

export default App;
