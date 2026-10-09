//! System-audio ("what you hear") capture for the visualizer.
//!
//! cpal 0.16 implements WASAPI loopback natively: building an *input* stream on
//! an *output* (render) device sets AUDCLNT_STREAMFLAGS_LOOPBACK for us. The
//! old external plugin failed with 0x88890003 (AUDCLNT_E_WRONG_ENDPOINT_TYPE)
//! because it asked for loopback on the wrong kind of endpoint.
//!
//! Output format sent to the frontend: mono f32 little-endian PCM at ~16 kHz,
//! wrapped in the same event shape the React side already understands.

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::Serialize;
use std::{
    collections::HashMap,
    sync::{
        mpsc::{self, Sender},
        Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{ipc::Channel, State};

const TARGET_RATE: f64 = 16_000.0;
/// ~32 ms of audio per event at 16 kHz.
const CHUNK_SAMPLES: usize = 512;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FormatPayload {
    session_id: String,
    sample_rate: u32,
    channels: u16,
    bits_per_sample: u16,
    sample_format: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataPayload {
    session_id: String,
    data: Vec<u8>,
    sample_rate: u32,
    channels: u16,
    frames: usize,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessagePayload {
    session_id: String,
    message: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionPayload {
    session_id: String,
}

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "lowercase")]
pub enum CaptureEvent {
    Format(FormatPayload),
    Data(DataPayload),
    Error(MessagePayload),
    Stopped(SessionPayload),
}

#[derive(Default)]
pub struct SystemCaptureState {
    sessions: Mutex<HashMap<String, Sender<()>>>,
}

/// Downmixes interleaved frames to mono, box-filter resamples to ~16 kHz and
/// ships fixed-size chunks to the frontend.
struct Pipeline {
    session_id: String,
    channel: Channel<CaptureEvent>,
    channels: usize,
    step: f64,
    pos: f64,
    acc: f32,
    n: u32,
    frame_sum: f32,
    frame_i: usize,
    out: Vec<f32>,
}

impl Pipeline {
    fn new(session_id: String, channel: Channel<CaptureEvent>, channels: usize, rate: u32) -> Self {
        Self {
            session_id,
            channel,
            channels: channels.max(1),
            step: (rate as f64 / TARGET_RATE).max(1.0),
            pos: 0.0,
            acc: 0.0,
            n: 0,
            frame_sum: 0.0,
            frame_i: 0,
            out: Vec::with_capacity(CHUNK_SAMPLES * 2),
        }
    }

    fn push(&mut self, samples: impl Iterator<Item = f32>) {
        for s in samples {
            self.frame_sum += if s.is_finite() { s } else { 0.0 };
            self.frame_i += 1;
            if self.frame_i < self.channels {
                continue;
            }
            let mono = self.frame_sum / self.channels as f32;
            self.frame_sum = 0.0;
            self.frame_i = 0;

            self.acc += mono;
            self.n += 1;
            self.pos += 1.0;
            if self.pos >= self.step {
                self.out.push(self.acc / self.n.max(1) as f32);
                self.acc = 0.0;
                self.n = 0;
                self.pos -= self.step;
            }
        }
        while self.out.len() >= CHUNK_SAMPLES {
            let chunk: Vec<f32> = self.out.drain(..CHUNK_SAMPLES).collect();
            let mut bytes = Vec::with_capacity(chunk.len() * 4);
            for v in &chunk {
                bytes.extend_from_slice(&v.to_le_bytes());
            }
            let _ = self.channel.send(CaptureEvent::Data(DataPayload {
                session_id: self.session_id.clone(),
                data: bytes,
                sample_rate: TARGET_RATE as u32,
                channels: 1,
                frames: chunk.len(),
            }));
        }
    }
}

fn build_stream<T>(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    mut pipeline: Pipeline,
    error_channel: Channel<CaptureEvent>,
    session_id: String,
    convert: fn(T) -> f32,
) -> Result<cpal::Stream, String>
where
    T: cpal::SizedSample + Send + 'static,
{
    device
        .build_input_stream(
            config,
            move |data: &[T], _| pipeline.push(data.iter().map(|&s| convert(s))),
            move |err| {
                let _ = error_channel.send(CaptureEvent::Error(MessagePayload {
                    session_id: session_id.clone(),
                    message: err.to_string(),
                }));
            },
            None,
        )
        .map_err(|e| format!("Could not open loopback stream: {e}"))
}

/// Opens a loopback stream on the DEFAULT PLAYBACK device (speakers/headphones).
fn open_loopback(session_id: &str, channel: &Channel<CaptureEvent>) -> Result<cpal::Stream, String> {
    let host = cpal::default_host();
    let device = host
        .default_output_device()
        .ok_or("No default Windows playback device found")?;
    let supported = device
        .default_output_config()
        .map_err(|e| format!("Could not read the playback format: {e}"))?;

    let format = supported.sample_format();
    let config: cpal::StreamConfig = supported.config();
    let channels = config.channels;
    let rate = config.sample_rate.0;

    let pipeline = Pipeline::new(session_id.to_string(), channel.clone(), channels as usize, rate);
    let err_ch = channel.clone();
    let sid = session_id.to_string();

    let stream = match format {
        cpal::SampleFormat::F32 => build_stream::<f32>(&device, &config, pipeline, err_ch, sid, |s| s)?,
        cpal::SampleFormat::I16 => build_stream::<i16>(&device, &config, pipeline, err_ch, sid, |s| s as f32 / 32768.0)?,
        cpal::SampleFormat::I32 => build_stream::<i32>(&device, &config, pipeline, err_ch, sid, |s| s as f32 / 2_147_483_648.0)?,
        cpal::SampleFormat::U16 => build_stream::<u16>(&device, &config, pipeline, err_ch, sid, |s| (s as f32 - 32768.0) / 32768.0)?,
        other => return Err(format!("Unsupported playback sample format: {other:?}")),
    };
    stream
        .play()
        .map_err(|e| format!("Could not start loopback capture: {e}"))?;

    let _ = channel.send(CaptureEvent::Format(FormatPayload {
        session_id: session_id.to_string(),
        sample_rate: rate,
        channels,
        bits_per_sample: 32,
        sample_format: format!("{format:?}"),
    }));
    Ok(stream)
}

fn stop_session(state: &SystemCaptureState, session_id: &str) {
    if let Ok(mut sessions) = state.sessions.lock() {
        if let Some(stop) = sessions.remove(session_id) {
            let _ = stop.send(());
        }
    }
}

#[tauri::command]
pub fn start_system_audio(
    session_id: String,
    on_event: Channel<CaptureEvent>,
    state: State<'_, SystemCaptureState>,
) -> Result<(), String> {
    stop_session(&state, &session_id);

    let (stop_tx, stop_rx) = mpsc::channel::<()>();
    let (ready_tx, ready_rx) = mpsc::channel::<Result<(), String>>();

    let sid = session_id.clone();
    let channel = on_event.clone();
    // cpal streams are not Send on every platform, so the stream lives (and
    // dies) on its own thread.
    thread::spawn(move || match open_loopback(&sid, &channel) {
        Ok(stream) => {
            let _ = ready_tx.send(Ok(()));
            let _ = stop_rx.recv(); // blocks until stop (or app shutdown)
            drop(stream);
            let _ = channel.send(CaptureEvent::Stopped(SessionPayload { session_id: sid }));
        }
        Err(error) => {
            let _ = ready_tx.send(Err(error));
        }
    });

    match ready_rx.recv_timeout(Duration::from_secs(5)) {
        Ok(Ok(())) => {
            state
                .sessions
                .lock()
                .map_err(|_| "System audio state lock was poisoned".to_string())?
                .insert(session_id, stop_tx);
            Ok(())
        }
        Ok(Err(error)) => Err(error),
        Err(_) => Err("Timed out while opening the Windows playback device".into()),
    }
}

#[tauri::command]
pub fn stop_system_audio(session_id: String, state: State<'_, SystemCaptureState>) -> Result<(), String> {
    stop_session(&state, &session_id);
    Ok(())
}
