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

/**
 * Thin frontend bridge to the Rust WASAPI plugin. It works in Tauri; calls
 * made from a regular browser reject through Tauri's invoke API and are
 * surfaced by the caller as a friendly "desktop app only" message.
 */
export async function startCapture(
  options: CaptureOptions,
  callback: CaptureCallback,
): Promise<void> {
  const channel = new Channel<CaptureEvent>();
  channel.onmessage = callback;
  await invoke("plugin:wasapi|start_capture", {
    request: options,
    onEvent: channel,
  });
}

export async function stopCapture(sessionId: string): Promise<void> {
  await invoke("plugin:wasapi|stop_capture", {
    request: { sessionId },
  });
}
