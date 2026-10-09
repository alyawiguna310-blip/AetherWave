import { useCallback, useEffect, useMemo, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";

type WallpaperItem = {
  id: string;
  title: string;
  kind: string;
  preview_path: string | null;
  video_path: string | null;
  has_audio_hint: boolean;
  audio_note: string;
  folder_path: string;
};

export default function WallpaperEnginePage() {
  const [items, setItems] = useState<WallpaperItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [silentOnly, setSilentOnly] = useState(true);
  const [selected, setSelected] = useState<WallpaperItem | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const found = await invoke<WallpaperItem[]>("scan_wallpaper_engine_library");
      setItems(found);
      setSelected((current) => current ? found.find((item) => item.id === current.id) ?? null : null);
    } catch (e) {
      setError(typeof e === "string" ? e : "Could not scan the Steam Workshop library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void scan(); }, [scan]);

  const visible = useMemo(
    () => items.filter((item) => (!silentOnly || !item.has_audio_hint) && item.kind === "video" && Boolean(item.video_path)),
    [items, silentOnly],
  );

  const closePreview = () => setSelected(null);

  return (
    <section className="wallpaper-page">
      <div className="wallpaper-intro">
        <div>
          <span className="kicker">STEAM WORKSHOP · 431960</span>
          <h2>Wallpaper Engine</h2>
          <p>Scans common Steam library locations on C:, D:, E: and F:. Your Workshop files are only read, never moved or modified.</p>
        </div>
        <button className="settings" onClick={() => void scan()} disabled={loading}>{loading ? "Scanning…" : "Rescan libraries"}</button>
      </div>

      <div className="wallpaper-toolbar">
        <label><input type="checkbox" checked={silentOnly} onChange={(e) => setSilentOnly(e.target.checked)} /> Hide wallpapers with audio-related metadata</label>
        <span>{visible.length} playable video{visible.length === 1 ? "" : "s"}</span>
      </div>

      {error && <div className="youtube-error" role="alert">{error}</div>}
      {!loading && !items.length && !error && (
        <div className="download-empty">
          <div className="download-icon">WE</div>
          <div><span className="kicker">NO LIBRARY FOUND</span><h3>Couldn’t find downloaded wallpapers</h3><p>Make sure Wallpaper Engine is installed and you’re subscribed to Workshop wallpapers in Steam. Custom Steam library paths may need to be added.</p></div>
        </div>
      )}
      {!loading && items.length > 0 && visible.length === 0 && (
        <div className="download-empty"><div className="download-icon">WE</div><div><h3>No silent-looking video wallpapers</h3><p>Try disabling the audio-metadata filter, or use Wallpaper Engine for scene and web wallpapers that AetherWave can’t render directly.</p></div></div>
      )}

      <div className="wallpaper-grid">
        {visible.map((item) => (
          <button key={item.id} className={selected?.id === item.id ? "wallpaper-card selected" : "wallpaper-card"} onClick={() => setSelected(item)}>
            <div className="wallpaper-thumb">
              {item.preview_path ? <img loading="lazy" src={convertFileSrc(item.preview_path)} alt="" /> : <span>NO PREVIEW</span>}
              <span className="wallpaper-play">Preview</span>
            </div>
            <span className="wallpaper-title">{item.title}</span>
            <small>Workshop · {item.id}</small>
          </button>
        ))}
      </div>

      {selected?.video_path && (
        <div className="wallpaper-preview-backdrop" role="presentation" onClick={closePreview}>
          <section className="wallpaper-preview" role="dialog" aria-modal="true" aria-label={selected.title} onClick={(e) => e.stopPropagation()}>
            <div className="wallpaper-preview-heading"><div><span className="kicker">MUTED PREVIEW</span><h3>{selected.title}</h3></div><button className="settings" onClick={closePreview}>Close</button></div>
            <video key={selected.id} src={convertFileSrc(selected.video_path)} muted autoPlay loop playsInline controls={false} />
            <p>{selected.audio_note}. AetherWave keeps this preview muted so it won’t compete with your music.</p>
          </section>
        </div>
      )}
    </section>
  );
}
