import { Channel, invoke } from "@tauri-apps/api/core";

export interface StartCaptureOptions {
  sessionId: string;
  deviceId?: string;
  loopback?: boolean;
  processId?: number;
  sampleRate?: number;
  channels?: number;
}

export interface AudioChunk {
  sessionId: string;
  data: number[];
  sampleRate: number;
  channels: number;
  frames: number;
}

export type StreamEvent =
  | { event: "format"; data: { sessionId: string; sampleRate: number; channels: number; bitsPerSample: number; sampleFormat: string } }
  | { event: "data"; data: AudioChunk }
  | { event: "error"; data: { sessionId: string; message: string } }
  | { event: "stopped"; data: { sessionId: string } };

export async function startCapture(
  options: StartCaptureOptions,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const channel = new Channel<StreamEvent>();
  channel.onmessage = onEvent;
  await invoke("plugin:wasapi|start_capture", {
    request: options,
    onEvent: channel,
  });
}

export async function stopCapture(sessionId: string): Promise<void> {
  await invoke("plugin:wasapi|stop_capture", { request: { sessionId } });
}
