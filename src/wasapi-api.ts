import { Channel, invoke } from "@tauri-apps/api/core";

export type CaptureOptions = {
  sessionId: string;
  deviceId?: string;
  loopback?: boolean;
  processId?: number;
  sampleRate?: number;
  channels?: number;
};

export type CaptureEvent =
  | { event: "format"; data: { sessionId: string; sampleRate: number; channels: number; bitsPerSample: number; sampleFormat: string } }
  | { event: "data"; data: { sessionId: string; data: number[]; sampleRate: number; channels: number; frames: number } }
  | { event: "error"; data: { sessionId: string; message: string } }
  | { event: "stopped"; data: { sessionId: string } };

export type CaptureCallback = (event: CaptureEvent) => void;

// Tauri rejects invoke() with a plain string, not an Error. Normalise it so the
// UI can show the real reason instead of a generic fallback message.
function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Starts WASAPI loopback capture of the default Windows playback device via the
 * app's own Rust module (src-tauri/src/system_audio.rs). Audio arrives as mono
 * f32 little-endian PCM at ~16 kHz. Only works inside the Tauri desktop app.
 */
export async function startCapture(
  options: CaptureOptions,
  callback: CaptureCallback,
): Promise<void> {
  const channel = new Channel<CaptureEvent>();
  channel.onmessage = callback;
  try {
    await invoke("start_system_audio", {
      sessionId: options.sessionId,
      onEvent: channel,
    });
  } catch (error) {
    throw toError(error);
  }
}

export async function stopCapture(sessionId: string): Promise<void> {
  try {
    await invoke("stop_system_audio", { sessionId });
  } catch (error) {
    throw toError(error);
  }
}
