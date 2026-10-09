/**
 * wasapi-stub.ts
 *
 * Always aliased in vite.config.ts instead of tauri-plugin-wasapi-api.
 *
 * At runtime it checks whether the real Tauri WASAPI plugin is available
 * (it will be when running as `pnpm tauri dev` or `pnpm tauri build`).
 * If it is, it proxies through to the real implementation.
 * If not (plain `pnpm dev` in a browser), capture throws a clear error.
 *
 * This way vite.config.ts can always alias to this file — no env-var
 * detection needed — and the desktop app still gets real system audio.
 */

export type CaptureOptions = {
  sessionId: string;
  loopback?: boolean;
  sampleRate?: number;
  channels?: number;
};

export type CaptureEvent =
  | { event: "data"; data: { sessionId: string; data: number[] } }
  | { event: "error"; data: { message: string } }
  | { event: "stopped"; data?: unknown };

export type CaptureCallback = (event: CaptureEvent) => void;

// Try to load the real plugin lazily at runtime.
// When running inside Tauri, window.__TAURI__ exists and the plugin's
// JS bindings are available via the Tauri IPC bridge.
// When running in a plain browser, this will throw and we fall back gracefully.
async function getRealPlugin() {
  // Tauri v2 injects window.__TAURI_INTERNALS__ when running as a desktop app.
  const isTauriRuntime =
    typeof window !== "undefined" &&
    // @ts-expect-error __TAURI_INTERNALS__ is injected by Tauri at runtime
    (window.__TAURI_INTERNALS__ != null || window.__TAURI__ != null);

  if (!isTauriRuntime) return null;

  try {
    // Dynamic import so Vite doesn't try to statically resolve the module
    // (which would fail in browser-only mode).
    // The real package IS installed when building with Tauri.
    const mod = await import(/* @vite-ignore */ "tauri-plugin-wasapi-api");
    return mod as { startCapture: typeof startCapture; stopCapture: typeof stopCapture };
  } catch {
    return null;
  }
}

export async function startCapture(
  options: CaptureOptions,
  callback: CaptureCallback
): Promise<void> {
  const plugin = await getRealPlugin();
  if (plugin) {
    return plugin.startCapture(options, callback);
  }
  throw new Error(
    "System audio capture is only available in the desktop app. " +
      "Run `pnpm tauri dev` instead of `pnpm dev`."
  );
}

export async function stopCapture(sessionId: string): Promise<void> {
  const plugin = await getRealPlugin();
  if (plugin) {
    return plugin.stopCapture(sessionId);
  }
  // No-op in the browser — nothing was started, nothing to stop.
}
