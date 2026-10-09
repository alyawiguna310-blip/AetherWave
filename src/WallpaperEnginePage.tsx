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
  const [thumbnailById, setThumbnailById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [silentOnly, setSilentOnly] = useState(true);
  const [selected, setSelected] = useState<WallpaperItem | null>(null);
  const [applying, setApplying] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const found = await invoke<WallpaperItem[]>("scan_wallpaper_engine_library");
      setItems(found);
      const thumbnails: Record<string, string> = {};
      await Promise.all(found.map(async (item) => {
        try {
          const image = await invoke<string | null>("load_wallpaper_thumbnail", { id: item.id });
          if (image) thumbnails[item.id] = image;
        } catch {
          // A missing or unreadable thumbnail should not prevent the library from loading.
        }
      }));
      setThumbnailById(thumbnails);
      setSelected((current) => current ? found.find((item) => item.id === current.id) ?? null : null);
    } catch (e) {
      setError(typeof e === "string" ? e : "Could not scan the Steam Workshop library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void scan(); }, [scan]);

  const visible = useMemo(
    () => items.filter((item) => !silentOnly || !item.has_audio_hint),
    [items, silentOnly],
  );

  const applySelected = async () => {
    if (!selected || applying) return;
    setApplying(true);
    setError("");
    setStatus("");
    try {
      const result = await invoke<string>("apply_wallpaper_engine_wallpaper", { id: selected.id });
      setStatus(result);
    } catch (e) {
      setError(typeof e === "string" ? e : "Could not send the wallpaper command.");
    } finally {
      setApplying(false);
    }
  };

  const closePreview = () => setSelected(null);

  return (
    <section className="wallpaper-page">
      <div className="wallpaper-intro">
        <div>
          <span className="kicker">STEAM WORKSHOP · 431960</span>
          <h2>Wallpaper Engine</h2>
          <p>Browse installed Workshop wallpapers and send an apply command to Wallpaper Engine. Your Workshop files are read-only.</p>
        </div>
        <button className="settings" onClick={() => void scan()} disabled={loading}>{loading ? "Scanning…" : "Rescan libraries"}</button>
      </div>

      <div className="wallpaper-toolbar">
        <label><input type="checkbox" checked={silentOnly} onChange={(e) => setSilentOnly(e.target.checked)} /> Hide wallpapers with audio-related metadata</label>
        <span>{visible.length} installed wallpaper{visible.length === 1 ? "" : "s"}</span>
      </div>

      {status && <div className="youtube-error" role="status">{status}</div>}
      {error && <div className="youtube-error" role="alert">{error}</div>}
      {!loading && !items.length && !error && (
        <div className="download-empty">
          <div className="download-icon">WE</div>
          <div><span className="kicker">NO LIBRARY FOUND</span><h3>Couldn’t find downloaded wallpapers</h3><p>Make sure Wallpaper Engine is installed and you have subscribed to Workshop wallpapers in Steam. Steam libraries are discovered from common locations and libraryfolders.vdf.</p></div>
        </div>
      )}
      {!loading && items.length > 0 && visible.length === 0 && (
        <div className="download-empty"><div className="download-icon">WE</div><div><h3>No wallpapers match this filter</h3><p>Turn off the audio-metadata filter to show every detected item. This metadata check is only a heuristic and cannot guarantee a wallpaper is silent.</p></div></div>
      )}

      <div className="wallpaper-grid">
        {visible.map((item) => (
          <button key={item.id} className={selected?.id === item.id ? "wallpaper-card selected" : "wallpaper-card"} onClick={() => { setSelected(item); setError(""); setStatus(""); }}>
            <div className="wallpaper-thumb">
              {thumbnailById[item.id] ? <img loading="lazy" src={thumbnailById[item.id]} alt="" /> : <span>{item.kind.toUpperCase()}</span>}
              <span className="wallpaper-play">Select</span>
            </div>
            <span className="wallpaper-title">{item.title}</span>
            <small>{item.kind} · Workshop {item.id}</small>
          </button>
        ))}
      </div>

      {selected && (
        <div className="wallpaper-preview-backdrop" role="presentation" onClick={closePreview}>
          <section className="wallpaper-preview" role="dialog" aria-modal="true" aria-label={selected.title} onClick={(e) => e.stopPropagation()}>
            <div className="wallpaper-preview-heading">
              <div><span className="kicker">WORKSHOP · {selected.id}</span><h3>{selected.title}</h3></div>
              <button className="settings" onClick={closePreview}>Close</button>
            </div>
            {selected.video_path
              ? <video key={selected.id} src={convertFileSrc(selected.video_path)} muted autoPlay loop playsInline controls={false} />
              : thumbnailById[selected.id]
                ? <img className="wallpaper-static-preview" src={thumbnailById[selected.id]} alt={selected.title} />
                : <div className="wallpaper-no-preview">No in-app preview available for this {selected.kind} wallpaper.</div>}
            <p>{selected.audio_note}. The audio-metadata filter is heuristic; applying a wallpaper uses Wallpaper Engine's own renderer.</p>
            <div className="wallpaper-apply-row">
              <button className="settings" onClick={() => void applySelected()} disabled={applying}>
                {applying ? "Sending command…" : "Apply to desktop"}
              </button>
              <span>Wallpaper Engine should already be running. Check the Windows desktop to confirm the change.</span>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
