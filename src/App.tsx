import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { startCapture, stopCapture } from "./lib/wasapi";
import "./App.css";

type Track = { title: string; artist: string; album: string; duration: string; accent: string; path?: string; fileName?: string; durationSeconds?: number };
type LocalAudioFile = { path: string; title: string };
type PlaybackInfo = { path: string | null; playing: boolean; paused: boolean; position_secs: number; duration_secs: number | null; volume: number };
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

  // In-place radix-2 FFT.
  let j = 0;
  for (let i = 1; i < size; i++) {
    let bit = size >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
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
      let wr = 1;
      let wi = 0;
      const half = length >> 1;
      for (let k = 0; k < half; k++) {
        const even = start + k;
        const odd = even + half;
        const tr = wr * real[odd] - wi * imag[odd];
        const ti = wr * imag[odd] + wi * real[odd];
        real[odd] = real[even] - tr;
        imag[odd] = imag[even] - ti;
        real[even] += tr;
        imag[even] += ti;
        const nextWr = wr * stepReal - wi * stepImag;
        wi = wr * stepImag + wi * stepReal;
        wr = nextWr;
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
    let power = 0;
    let bins = 0;
    for (let bin = first; bin < last; bin++) {
      power += real[bin] * real[bin] + imag[bin] * imag[bin];
      bins++;
    }
    const magnitude = bins ? Math.sqrt(power / bins) / size : 0;
    bars.push(Math.min(1, Math.sqrt(magnitude * 28)));
  }
  return bars;
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
  const smoothedSpectrumRef = useRef<number[]>(Array(56).fill(0));
  const peakSpectrumRef = useRef<number[]>(Array(56).fill(0));

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
    smoothedSpectrumRef.current.fill(0);
    peakSpectrumRef.current.fill(0);
    try {
      await startCapture(
        { sessionId: "system-audio", loopback: true, sampleRate: 16000, channels: 1 },
        (event) => {
          if (event.event === "data") {
            if (event.data.sessionId !== "system-audio") return;
            const bytes = new Uint8Array(event.data.data);
            const usableBytes = bytes.byteLength - (bytes.byteLength % 4);
            const pcm = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + usableBytes));
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
            smoothedSpectrumRef.current.fill(0);
            peakSpectrumRef.current.fill(0);
            setMessage(`System audio capture failed: ${event.data.message}`);
          } else if (event.event === "stopped") {
            setSystemAudioEnabled(false);
            systemSpectrumRef.current = [];
            smoothedSpectrumRef.current.fill(0);
            peakSpectrumRef.current.fill(0);
          }
        },
      );
      setSystemAudioEnabled(true);
      setMessage("Listening to Windows system audio for the spectrum");
    } catch (error) {
      setSystemAudioEnabled(false);
      setMessage(error instanceof Error ? `System audio capture failed: ${error.message}` : "System audio capture requires the installed Windows app");
    }
  };

  useEffect(() => () => {
    void stopCapture("system-audio").catch(() => {
      // Capture may never have been started.
    });
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
  const searchYouTube = async (query = searchQuery) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setYoutubeError("Type a song, artist, or topic to search.");
      setYoutubeResults([]);
      setSearchedQuery("");
      return;
    }
    if (!youtubeApiKey.trim()) {
      setYoutubeError("Add your YouTube Data API key in Preferences → Integrations first.");
      setYoutubeResults([]);
      setSearchedQuery(cleanQuery);
      setMessage("YouTube API key required");
      return;
    }
    setYoutubeLoading(true);
    setYoutubeError("");
    setSearchedQuery(cleanQuery);
    setMessage("Searching YouTube…");
    try {
      const params = new URLSearchParams({ part: "snippet", type: "video", maxResults: "12", q: cleanQuery, key: youtubeApiKey.trim(), safeSearch: "moderate" });
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
      const payload = await response.json() as { items?: YouTubeVideo[]; error?: { message?: string; errors?: Array<{ reason?: string }> } };
      if (!response.ok) {
        const reason = payload.error?.errors?.[0]?.reason;
        if (response.status === 403 && reason === "quotaExceeded") throw new Error("YouTube API quota used up for today. Try again after the quota resets.");
        if (response.status === 403) throw new Error("Google rejected this API request. Check that YouTube Data API v3 is enabled and your key restrictions allow this app.");
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
    void invoke("stop_audio").catch(() => undefined);
    setSelectedYouTubeVideo(video);
    setYoutubeDuration(0);
    setCurrentTime(0);
    setProgress(0);
    setShowYouTubeVideo(false);
    setYoutubeIsPlaying(true);
    setPlaying(true);
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

  // Keep native output and the embedded YouTube player on the same volume slider.
  useEffect(() => {
    void invoke("set_volume", { volume: volume / 100 }).catch((error) => {
      setMessage(error instanceof Error ? error.message : "Could not set local audio volume");
    });
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
          setYoutubeIsPlaying(isPlaying);
          setPlaying(isPlaying);
        }
      } catch {
        // Ignore non-JSON iframe messages.
      }
    };
    window.addEventListener("message", onMessage);
    const requestTimer = window.setInterval(() => {
      sendYouTubeCommand("getCurrentTime");
      sendYouTubeCommand("getDuration");
    }, 500);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(requestTimer);
    };
  }, [selectedYouTubeVideo]);

  useEffect(() => {
    if (selectedYouTubeVideo || !current.path) return;
    let cancelled = false;
    const pollPlayback = async () => {
      try {
        const info = await invoke<PlaybackInfo>("get_playback_state");
        if (cancelled) return;
        if (info.path === current.path) {
          setPlaying(info.playing);
          setCurrentTime(info.position_secs);
          const duration = info.duration_secs ?? 0;
          setProgress(duration > 0 ? Math.min(100, (info.position_secs / duration) * 100) : 0);
          if (duration > 0) {
            setLocalTracks((items) => items.map((item) =>
              item.path === info.path && item.durationSeconds !== duration
                ? { ...item, durationSeconds: duration, duration: formatTime(duration) }
                : item
            ));
          }
        } else if (!info.path) {
          setPlaying(false);
          setCurrentTime(0);
          setProgress(0);
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Could not read playback state");
      }
    };
    void pollPlayback();
    const timer = window.setInterval(() => void pollPlayback(), 350);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [selectedYouTubeVideo, current.path]);

  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;
    // Native local playback cannot be tapped by Web Audio; use Windows loopback
    // for a real spectrum and an animated fallback when loopback is disabled.
    let frame = 0;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      const ctx = canvas.getContext("2d");
      if (ctx && rect.width > 0 && rect.height > 0) {
        ctx.clearRect(0, 0, width, height);
        const count = 56;
        const gap = Math.max(2 * dpr, width * 0.004);
        const barWidth = Math.max(1, (width - gap * (count - 1)) / count);
        const isYouTubeActive = Boolean(selectedYouTubeVideo && youtubeIsPlaying);
        const isLocalActive = Boolean(!selectedYouTubeVideo && playing && current.path);
        const systemBins = systemSpectrumRef.current;
        const smoothedBins = smoothedSpectrumRef.current;
        const peakBins = peakSpectrumRef.current;
        const hasSystemSpectrum = systemAudioEnabled && systemBins.length === count;
        const isActive = hasSystemSpectrum ? systemBins.some((value) => value > 0.025) : isYouTubeActive || isLocalActive;
        const styleTarget = document.querySelector(".app") ?? canvas;
        const accent = getComputedStyle(styleTarget).getPropertyValue("--accent").trim() || "#8b7cff";
        const now = performance.now();
        ctx.strokeStyle = "#ffffff0c";
        ctx.lineWidth = 1 * dpr;
        for (let line = 1; line <= 3; line++) {
          const gridY = (height - 24 * dpr) - (height - 30 * dpr) * (line / 4);
          ctx.beginPath(); ctx.moveTo(0, gridY); ctx.lineTo(width, gridY); ctx.stroke();
        }
        ctx.fillStyle = "#ffffff18";
        ctx.fillRect(0, height - 24 * dpr, width, 1 * dpr);
        for (let i = 0; i < count; i++) {
          const idle = 0.025 + Math.abs(Math.sin(i * 0.43) * 0.045 + Math.sin(i * 0.16) * 0.025);
          const pulse = 0.10 + Math.abs(Math.sin(now / 190 + i * 0.43)) * 0.54 + Math.abs(Math.sin(now / 320 + i * 0.17)) * 0.22;
          const target = hasSystemSpectrum ? systemBins[i] : (isYouTubeActive || isLocalActive) ? Math.min(1, pulse) : idle;
          const prior = smoothedBins[i] ?? 0;
          const level = prior + (target - prior) * (target > prior ? 0.42 : 0.16);
          smoothedBins[i] = level;
          peakBins[i] = Math.max(level, (peakBins[i] ?? 0) - 0.006);
          const usableHeight = Math.max(1, height - 30 * dpr);
          const barHeight = Math.max(2 * dpr, level * usableHeight * 0.9);
          const x = i * (barWidth + gap);
          const y = height - 24 * dpr - barHeight;
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, accent);
          gradient.addColorStop(1, accent + "22");
          ctx.fillStyle = gradient;
          ctx.globalAlpha = isActive ? 0.96 : 0.42;
          ctx.shadowColor = accent;
          ctx.shadowBlur = isActive ? 8 * dpr : 0;
          ctx.fillRect(x, y, barWidth, barHeight);
          ctx.shadowBlur = 0;
          if (isActive && peakBins[i] > 0.025) {
            const peakY = height - 24 * dpr - peakBins[i] * usableHeight * 0.9;
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = accent;
            ctx.fillRect(x, Math.max(0, peakY - 1.5 * dpr), barWidth, 1.5 * dpr);
          }
        }
        ctx.globalAlpha = 1;
      }
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [selectedYouTubeVideo, youtubeIsPlaying, playing, current.path, showSettings, systemAudioEnabled]);

  const formatTime = (seconds: number) => { if (!Number.isFinite(seconds) || seconds < 0) return "0:00"; const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60).toString().padStart(2, "0"); return `${mins}:${secs}`; };

  const selectTrack = (index: number) => {
    const selected = availableTracks[index];
    if (!selected?.path) { setMessage("Add a local audio file before playing."); return; }
    setSelectedYouTubeVideo(null);
    setYoutubeIsPlaying(false);
    setTrack(index);
    setProgress(0);
    setCurrentTime(0);
    setMessage(`Loading ${selected.title}`);
    void invoke<PlaybackInfo>("play_local", { path: selected.path })
      .then((info) => { setPlaying(info.playing); setMessage(`Playing ${selected.title}`); })
      .catch((error) => { setPlaying(false); setMessage(error instanceof Error ? error.message : "Could not play this local audio file"); });
  };

  const importMusic = async () => {
    try {
      const files = await invoke<LocalAudioFile[]>("pick_audio_files");
      if (!files.length) return;
      await invoke("stop_audio").catch(() => undefined);
      setSelectedYouTubeVideo(null);
      setYoutubeIsPlaying(false);
      const imported: Track[] = files.map((file) => ({
        title: file.title, artist: "Local file", album: "Local library", duration: "—",
        accent: "#8b7cff", path: file.path, fileName: file.path.split(/[\\/]/).pop() ?? file.title,
      }));
      setLocalTracks(imported);
      setTrack(0);
      setProgress(0);
      setCurrentTime(0);
      setPlaying(false);
      setActive("Library");
      setMessage(`${imported.length} local track${imported.length === 1 ? "" : "s"} added`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open the audio file picker");
    }
  };

  const togglePlayback = async () => {
    if (selectedYouTubeVideo) {
      const nextPlaying = !youtubeIsPlaying;
      setYoutubeIsPlaying(nextPlaying);
      setPlaying(nextPlaying);
      return;
    }
    if (!current.path) { setMessage("Add a local audio file to start playback."); return; }
    try {
      const info = await invoke<PlaybackInfo>("get_playback_state");
      if (info.path !== current.path || (!info.playing && !info.paused)) {
        const nextInfo = await invoke<PlaybackInfo>("play_local", { path: current.path });
        setPlaying(nextInfo.playing);
      } else if (info.playing) {
        await invoke("pause_audio");
        setPlaying(false);
      } else {
        await invoke("resume_audio");
        setPlaying(true);
      }
    } catch (error) {
      setPlaying(false);
      setMessage(error instanceof Error ? error.message : "Playback command failed");
    }
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

          <div className="page-heading">
            <div><span className="kicker">MUSIC PLAYER</span><h1>{showSettings ? "Integrations" : active === "Home" ? "Home" : active}</h1></div>
            <div className="heading-actions"><button className="download-button" onClick={() => void importMusic()}><Icon name="download" size={14} /><span>Add Music</span></button><button className="settings" onClick={() => setShowSettings((value) => !value)}><Icon name="settings" size={15} /><span>Preferences</span></button></div>
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
            <p className="integration-footnote">YouTube search is connected to the key saved on this device. Spotify is paused for now. Restrict the API key in Google Cloud and never commit it to GitHub.</p>
          </section>}
          {selectedYouTubeVideo && <section className="youtube-player-panel persistent-youtube-player" aria-label="YouTube player">
            <div className="youtube-player-caption"><b title={selectedYouTubeVideo.snippet.title}>{selectedYouTubeVideo.snippet.title}</b><span>{selectedYouTubeVideo.snippet.channelTitle}</span><button className="settings" onClick={() => setShowYouTubeVideo((value) => !value)}>{showYouTubeVideo ? "Hide video" : "Show video"}</button><button className="settings" onClick={() => { setSelectedYouTubeVideo(null); setYoutubeIsPlaying(false); setShowYouTubeVideo(false); setPlaying(false); setMessage("YouTube playback stopped"); }}>Close</button></div>
            <div className={`youtube-player-frame${showYouTubeVideo ? "" : " youtube-player-frame-hidden"}`}><iframe ref={youtubeIframeRef} key={selectedYouTubeVideo.id.videoId} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(selectedYouTubeVideo.id.videoId)}?autoplay=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`} title={selectedYouTubeVideo.snippet.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onLoad={() => { const iframe = youtubeIframeRef.current; if (iframe?.contentWindow) { iframe.contentWindow.postMessage(JSON.stringify({ event: "listening", id: "aetherwave" }), "https://www.youtube-nocookie.com"); iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }), "https://www.youtube-nocookie.com"); iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [volume] }), "https://www.youtube-nocookie.com"); iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: youtubeIsPlaying ? "playVideo" : "pauseVideo", args: [] }), "https://www.youtube-nocookie.com"); } }} /></div>
          </section>}

          {!showSettings && active === "Search" && <section className="search-page">
            <div className="search-topline"><div><span className="kicker">DISCOVER SOMETHING NEW</span><h2>Search music</h2></div><span className="search-provider-label">{searchProvider === "Spotify" ? "SPOTIFY" : "YOUTUBE"}</span></div>
            <div className="search-workspace">
              <div className="provider-switch" data-provider="YouTube" role="group" aria-label="Search provider"><span className="provider-slider" aria-hidden="true" /><button className="provider-option active" onClick={() => setSearchProvider("YouTube")} aria-pressed={true}><Icon name="youtube" size={16} /><span>YouTube</span></button><button className="provider-option provider-disabled" onClick={() => { setSearchProvider("YouTube"); setMessage("Spotify is paused while we finish YouTube integration"); }} aria-pressed={false} title="Spotify integration is paused"><Icon name="spotify" size={16} /><span>Spotify · later</span></button></div>
              <label className="search-field"><Icon name="search" size={18} /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void searchYouTube(); }} placeholder="Search songs, artists, or music…" /><button className="youtube-search-button" onClick={() => void searchYouTube()} disabled={youtubeLoading} aria-label="Search YouTube">{youtubeLoading ? "…" : "Search"}</button>{searchQuery && <button className="clear-search" onClick={() => { setSearchQuery(""); setSearchedQuery(""); setYoutubeResults([]); setYoutubeError(""); }} aria-label="Clear search">×</button>}</label>
            </div>
            {!searchedQuery && !youtubeError ? <div className="browse-section"><div className="panel-heading"><div><span className="kicker">START EXPLORING</span><h3>Browse music</h3></div></div><div className="browse-grid">
              {[{name:"Electronic",tone:"violet",hint:"Synths & late nights"},{name:"Chill",tone:"blue",hint:"Slow down a little"},{name:"Indie",tone:"rose",hint:"Find your next favorite"},{name:"Ambient",tone:"teal",hint:"Soundscapes to drift to"}].map((item) => <button key={item.name} className={"browse-card " + item.tone} onClick={() => { setSearchQuery(item.name); void searchYouTube(item.name); }}><span>{item.name}</span><small>{item.hint}</small><i><Icon name="music" size={26} /></i></button>)}
            </div><p className="search-note">Searches real YouTube videos. Add your API key in Preferences if you haven’t already.</p></div> : <div className="search-results"><div className="panel-heading"><div><span className="kicker">YOUTUBE RESULTS</span><h3>{searchedQuery ? `Results for “${searchedQuery}”` : "Search YouTube"}</h3></div><span className="result-count">{youtubeLoading ? "SEARCHING…" : `${youtubeResults.length} VIDEOS`}</span></div>
              {youtubeError && <div className="youtube-error" role="alert"><Icon name="search" size={18} /><span>{youtubeError}</span>{!youtubeApiKey.trim() && <button className="settings" onClick={() => setShowSettings(true)}>Open Preferences</button>}</div>}
              {youtubeLoading && <div className="youtube-loading"><span className="youtube-spinner" /> Searching YouTube…</div>}
              {!youtubeLoading && !youtubeError && youtubeResults.map((item) => {
                const thumbnail = item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url;
                return <button className={selectedYouTubeVideo?.id.videoId === item.id.videoId ? "youtube-result-row selected" : "youtube-result-row"} key={item.id.videoId} onClick={() => playYouTubeVideo(item)} title="Play this video inside AetherWave">
                  {thumbnail ? <img className="youtube-thumbnail" src={thumbnail} alt="" loading="lazy" /> : <span className="youtube-thumbnail youtube-thumbnail-fallback"><Icon name="youtube" size={22} /></span>}
                  <span className="youtube-result-copy"><b>{item.snippet.title}</b><small>{item.snippet.channelTitle}</small><span>{item.snippet.description || "No description available."}</span></span>
                  <span className="youtube-open"><Icon name="play" size={15} /></span>
                </button>;
              })}
              {!youtubeLoading && !youtubeError && searchedQuery && !youtubeResults.length && <div className="search-no-results"><Icon name="search" size={22} /><b>No videos found</b><span>Try a different song title or artist.</span></div>}
              <p className="search-note">Select a result to play it here. Some videos may not allow embedded playback due to their owner’s settings or regional restrictions.</p>
            </div>}
          </section>}
          {!showSettings && active === "Library" && !localTracks.length && <section className="download-empty"><div className="download-icon"><Icon name="download" size={22} /></div><div><span className="kicker">OFFLINE LIBRARY</span><h3>Download Music</h3><p>Local music files will appear here and remain available offline.</p></div></section>}

          {!showSettings && <div className="now-playing-layout">
          <section className="now-playing">
            <div className="cover" style={{ background: current.accent }}>
              {selectedYouTubeVideo ? <img className="cover-artwork" src={selectedYouTubeVideo.snippet.thumbnails?.high?.url ?? selectedYouTubeVideo.snippet.thumbnails?.medium?.url ?? selectedYouTubeVideo.snippet.thumbnails?.default?.url} alt={`${selectedYouTubeVideo.snippet.title} thumbnail`} /> : <div className="cover-inner"><span className="cover-name">AETHER</span><span className="cover-title">WAVE</span></div>}
            </div>
            <div className="now-info">
              <span className="kicker">NOW PLAYING</span>
              <h2 title={current.title}>{current.title}</h2>
              <p>{current.artist} <span>·</span> {current.album}</p>
              <div className="format-line"><span>{current.path ? "LOCAL" : "DEMO"}</span><span>{current.path ? "FILE" : "24 bit"}</span><span>{current.path ? (current.fileName?.split(".").pop()?.toUpperCase() || "AUDIO") : "44.1 kHz"}</span></div>
              <div className="action-row">
                <button className="play-button" onClick={() => void togglePlayback()}><><Icon name={playing ? "pause" : "play"} size={15} /><span>{playing ? "Pause" : "Play"}</span></></button>
                <button className="small-button" onClick={previous} aria-label="Previous track"><Icon name="prev" /></button>
                <button className="small-button" onClick={next} aria-label="Next track"><Icon name="next" /></button>
              </div>
            </div>
          </section>

          <section className="visualizer-panel">
            <div className="panel-heading">
              <div><span className="kicker">VISUAL ENGINE</span><h3>Audio spectrum</h3></div>
              <span className="status"><i />{systemAudioEnabled ? "SYSTEM AUDIO" : playing ? "ACTIVE" : "IDLE"}<b />{message}</span><button className="settings" onClick={() => void toggleSystemAudioCapture()}>{systemAudioEnabled ? "Stop system audio" : "Enable system audio"}</button>
            </div>
            <div className="spectrum">
              <canvas ref={spectrumCanvasRef} className="spectrum-canvas" aria-label="Audio frequency spectrum visualizer" />

              <div className="spectrum-label">{systemAudioEnabled ? "live Windows audio spectrum" : playing ? "animated preview · enable system audio for real spectrum" : "enable system audio for live spectrum bars"}</div>
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
        <div className="player-song">{selectedYouTubeVideo ? <img className="mini-cover thumbnail-cover" src={selectedYouTubeVideo.snippet.thumbnails?.medium?.url ?? selectedYouTubeVideo.snippet.thumbnails?.default?.url} alt="" /> : <div className="mini-cover" style={{ background: current.accent }}>A</div>}<div><b title={current.title}>{current.title}</b><small>{current.artist}</small></div></div>
        <div className="transport">
          <div className="transport-buttons"><button onClick={previous} aria-label="Previous track"><Icon name="prev" size={18} /></button><button className="main-play" onClick={() => void togglePlayback()}><Icon name={playing ? "pause" : "play"} size={18} /></button><button onClick={next} aria-label="Next track"><Icon name="next" size={18} /></button></div>
          <div className="timeline"><span>{formatTime(currentTime)}</span><input type="range" min="0" max="100" value={progress} onChange={(e) => { const value = Number(e.target.value); setProgress(value); if (selectedYouTubeVideo) sendYouTubeCommand("seekTo", [youtubeDuration > 0 ? (value / 100) * youtubeDuration : currentTime, true]); else if (current.path && current.durationSeconds) void invoke("seek_audio", { positionSecs: (value / 100) * current.durationSeconds }).catch((error) => setMessage(error instanceof Error ? error.message : "Could not seek in this track")); }} /><span>{selectedYouTubeVideo ? formatTime(youtubeDuration) : current.duration}</span></div>
        </div>
        <div className="volume"><span className="volume-icon"><Icon name="volume" size={16} /></span><input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /><span>{volume}</span></div>
      </footer>
    </div>
  );
}

export default App;
