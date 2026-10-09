# AetherWave native UI migration (Rust + egui)

## Goal

Replace the Tauri + React/WebView presentation with a native Rust desktop UI built on egui/eframe, prioritizing lower idle RAM usage and responsive rendering. The native app must not change, apply, or control the Windows desktop wallpaper. Wallpaper Engine content remains an in-app background/preview feature only.

## Important status

The first commit adds an isolated native UI prototype under `native-ui/`. It does not replace the current Tauri app, and it is not yet feature-complete. Keep the existing Tauri app available as the reference implementation until parity has been verified.

## Porting order

1. **Native shell and navigation** — prototype added under `native-ui/`.
2. **Local audio engine** — port file selection, playback, pause/resume, seek, volume, track metadata and queue using Rust-native services.
3. **System audio capture** — port WASAPI loopback capture without Tauri IPC; pass bounded audio frames to the visualizer.
4. **Visualizer** — preserve the horizontal bar spectrum as the default; use egui painting and avoid per-frame allocations.
5. **Library and search** — migrate persistence and supported integrations, including YouTube metadata where currently implemented.
6. **Wallpaper Engine browser** — preserve Steam library discovery, thumbnails, previews and in-app backgrounds only. Do not call wallpaper-application commands or modify Windows wallpaper settings.
7. **Settings and polish** — migrate settings, errors, accessibility, keyboard controls and layout.
8. **Performance and parity checks** — compare idle/playing RAM, CPU use, startup time, audio latency and feature coverage against the Tauri build on the same Windows machine.

## Performance constraints

- Keep audio capture and decoding off the UI thread.
- Use bounded channels/ring buffers between capture, analysis and UI.
- Avoid allocating a new spectrum buffer every frame.
- Repaint on a measured cadence while audio is active; use slower or on-demand repainting while idle.
- Avoid decoding large wallpaper/video assets on the UI thread.
- Measure memory and responsiveness before claiming a performance win.

## Run the prototype

From the repository root:

```powershell
cargo run --manifest-path native-ui/Cargo.toml
```

The existing Tauri build and its feature set remain unchanged while this migration is developed.
