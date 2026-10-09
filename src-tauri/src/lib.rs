use rodio::{Decoder, OutputStream, OutputStreamBuilder, Sink, Source};
use serde::Serialize;
use std::{
    fs::File,
    path::{Path, PathBuf},
    sync::Mutex,
    time::Duration,
};
use tauri::State;

struct CurrentTrack {
    // The output stream must stay alive while the Sink is playing.
    _stream: OutputStream,
    sink: Sink,
    path: String,
    duration_secs: Option<f64>,
}

struct AudioState {
    current: Mutex<Option<CurrentTrack>>,
    volume: Mutex<f32>,
}

impl Default for AudioState {
    fn default() -> Self {
        Self {
            current: Mutex::new(None),
            volume: Mutex::new(0.72),
        }
    }
}

#[derive(Serialize)]
struct LocalAudioFile {
    path: String,
    title: String,
}

#[derive(Serialize)]
struct PlaybackInfo {
    path: Option<String>,
    playing: bool,
    paused: bool,
    position_secs: f64,
    duration_secs: Option<f64>,
    volume: f32,
}

fn lock_current(
    state: &AudioState,
) -> Result<std::sync::MutexGuard<'_, Option<CurrentTrack>>, String> {
    state.current.lock().map_err(|_| "Audio state lock was poisoned".to_string())
}

fn supported_audio_path(path: &Path) -> Result<(), String> {
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    match extension.as_str() {
        "mp3" | "flac" | "wav" | "ogg" | "oga" | "m4a" | "mp4" | "aac"
        | "opus" | "aiff" | "aif" => Ok(()),
        _ => Err("Unsupported audio file format".into()),
    }
}

#[tauri::command]
fn pick_audio_files() -> Vec<LocalAudioFile> {
    let Some(paths) = rfd::FileDialog::new()
        .set_title("Add music to AetherWave")
        .add_filter(
            "Audio files",
            &["mp3", "flac", "wav", "ogg", "oga", "m4a", "mp4", "aac", "opus", "aiff", "aif"],
        )
        .pick_files()
    else {
        return Vec::new();
    };

    paths
        .into_iter()
        .filter_map(|path| {
            if supported_audio_path(&path).is_err() || !path.is_file() {
                return None;
            }

            let title = path
                .file_stem()
                .and_then(|name| name.to_str())
                .unwrap_or("Unknown track")
                .to_string();

            Some(LocalAudioFile {
                path: path.to_string_lossy().into_owned(),
                title,
            })
        })
        .collect()
}

#[tauri::command]
fn play_local(path: String, state: State<'_, AudioState>) -> Result<PlaybackInfo, String> {
    let path_buf = PathBuf::from(&path);
    supported_audio_path(&path_buf)?;

    if !path_buf.is_file() {
        return Err("The selected audio file no longer exists".into());
    }

    let file = File::open(&path_buf)
        .map_err(|error| format!("Could not open audio file: {error}"))?;
    let decoder = Decoder::try_from(file)
        .map_err(|error| format!("Could not decode this audio file: {error}"))?;
    let duration_secs = decoder.total_duration().map(|duration| duration.as_secs_f64());

    // Rodio uses CPAL for native output; on Windows CPAL uses the WASAPI backend.
    let stream = OutputStreamBuilder::open_default_stream()
        .map_err(|error| format!("Could not open Windows audio output: {error}"))?;
    let sink = Sink::connect_new(stream.mixer());

    let volume = *state
        .volume
        .lock()
        .map_err(|_| "Audio volume lock was poisoned".to_string())?;
    sink.set_volume(volume);
    sink.append(decoder);

    let track = CurrentTrack {
        _stream: stream,
        sink,
        path: path_buf.to_string_lossy().into_owned(),
        duration_secs,
    };

    let mut current = lock_current(&state)?;
    *current = Some(track);
    let track = current.as_ref().expect("track was just inserted");

    Ok(PlaybackInfo {
        path: Some(track.path.clone()),
        playing: !track.sink.is_paused() && !track.sink.empty(),
        paused: track.sink.is_paused(),
        position_secs: track.sink.get_pos().as_secs_f64(),
        duration_secs: track.duration_secs,
        volume,
    })
}

#[tauri::command]
fn pause_audio(state: State<'_, AudioState>) -> Result<(), String> {
    let current = lock_current(&state)?;
    let track = current.as_ref().ok_or("No local track is loaded")?;
    track.sink.pause();
    Ok(())
}

#[tauri::command]
fn resume_audio(state: State<'_, AudioState>) -> Result<(), String> {
    let current = lock_current(&state)?;
    let track = current.as_ref().ok_or("No local track is loaded")?;
    track.sink.play();
    Ok(())
}

#[tauri::command]
fn stop_audio(state: State<'_, AudioState>) -> Result<(), String> {
    let mut current = lock_current(&state)?;
    if let Some(track) = current.take() {
        track.sink.stop();
    }
    Ok(())
}

#[tauri::command]
fn set_volume(volume: f32, state: State<'_, AudioState>) -> Result<(), String> {
    if !volume.is_finite() {
        return Err("Volume must be a finite number".into());
    }

    let volume = volume.clamp(0.0, 1.0);
    *state
        .volume
        .lock()
        .map_err(|_| "Audio volume lock was poisoned".to_string())? = volume;

    let current = lock_current(&state)?;
    if let Some(track) = current.as_ref() {
        track.sink.set_volume(volume);
    }
    Ok(())
}

#[tauri::command]
fn seek_audio(position_secs: f64, state: State<'_, AudioState>) -> Result<(), String> {
    if !position_secs.is_finite() || position_secs < 0.0 {
        return Err("Seek position must be zero or greater".into());
    }

    let current = lock_current(&state)?;
    let track = current.as_ref().ok_or("No local track is loaded")?;
    track
        .sink
        .try_seek(Duration::from_secs_f64(position_secs))
        .map_err(|error| format!("Could not seek in this track: {error}"))?;
    Ok(())
}

#[tauri::command]
fn get_playback_state(state: State<'_, AudioState>) -> Result<PlaybackInfo, String> {
    let volume = *state
        .volume
        .lock()
        .map_err(|_| "Audio volume lock was poisoned".to_string())?;
    let current = lock_current(&state)?;

    Ok(match current.as_ref() {
        Some(track) => PlaybackInfo {
            path: Some(track.path.clone()),
            playing: !track.sink.is_paused() && !track.sink.empty(),
            paused: track.sink.is_paused(),
            position_secs: track.sink.get_pos().as_secs_f64(),
            duration_secs: track.duration_secs,
            volume,
        },
        None => PlaybackInfo {
            path: None,
            playing: false,
            paused: false,
            position_secs: 0.0,
            duration_secs: None,
            volume,
        },
    })
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_wasapi::init())
        .manage(AudioState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            pick_audio_files,
            play_local,
            pause_audio,
            resume_audio,
            stop_audio,
            set_volume,
            seek_audio,
            get_playback_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running application");
}
