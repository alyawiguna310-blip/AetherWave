# AetherWave

A desktop music app for Windows and Linux that combines music playback with reactive visuals.

AetherWave is being built around the idea that music should not only sound good — it should look good too.

> **Under Construction — Still developing :v**
>
> The project is actively being developed. Features, architecture, and implementation details may change as AetherWave grows.

## What is AetherWave?

AetherWave aims to combine:

- Spotify integration
- YouTube integration
- Local MP3/FLAC playback
- Navidrome support
- Music-reactive sound waves and spectrum visualizers
- Animated backgrounds and visual effects
- Playlists and queue management
- A dark, Linux-inspired desktop interface
- Windows and Linux support

## Current Status

**Phase 3 — Local music engine:** in progress.

Phase 2, the Linux-inspired UI foundation, is now considered the current UI baseline. Further UI changes will only be made when needed for functionality, bugs, usability, or future features.

The current build is transitioning from the frontend prototype into real local music playback. Online music services and the full reactive visual system will come later.

## Planned Architecture

```
AetherWave
   ├── Spotify API (metadata)
   ├── YouTube API (metadata)
   └── Navidrome / Local Library
              ↓
         Music Engine
              ↓
        Player Engine
              ↓
        Visual Engine
          ├── waveform
          ├── spectrum
          ├── particles
          └── shaders/effects
```

The visual engine is intended to work independently from the music source, so the same visual system can react to local music, Navidrome music, and supported online music sources.

## Tech Stack

- Tauri
- React
- TypeScript
- Rust
- Vite
- Web Audio API
- Spotify Web API
- YouTube Data API
- Navidrome

## Development

Requirements:

- Node.js
- pnpm
- Rust
- Tauri prerequisites for your operating system

Install dependencies:

```bash
pnpm install
```

Run the development build:

```bash
pnpm tauri dev
```

Build the application:

```bash
pnpm tauri build
```

## Contributing

Contributions are welcome.

You can help with UI, visual effects, music playback, performance, bug fixes, documentation, Linux support, Windows support, and other parts of the project.

See `CONTRIBUTING.md` for contribution guidelines when available.

## About AI

Yeah, I'm using ChatGPT while making this project — but only for fun and educational purposes.

The source code is public because I want everyone to be able to see how the project is made, learn from it, experiment with it, and contribute to it.

AI assistance does not replace learning or understanding the code. The goal is to use AI as a tool while still building the project openly and learning along the way.

## API, Copyright & Legal

AetherWave will use official APIs and user-provided/local music where possible.

The project will not intentionally bypass DRM, authentication, API restrictions, or other protections to obtain copyrighted music.

Spotify and YouTube remain the property of their respective owners. AetherWave is an independent project and is not affiliated with them.

## Roadmap

- **Phase 1 — Project foundation** — complete
- **Phase 2 — Linux-inspired UI** — complete / baseline established
- **Phase 3 — Local music engine** — in progress
- **Phase 4 — Web Audio visualizer** — planned
- **Phase 5 — Reactive animated scenes** — planned
- **Phase 6 — Spotify / YouTube / Navidrome integration** — planned
- **Phase 7 — Windows + Linux packaging and polish** — planned

## License

This project is open source. See the repository license for details.

---

**Music shouldn't just sound good. It should look good too.**
