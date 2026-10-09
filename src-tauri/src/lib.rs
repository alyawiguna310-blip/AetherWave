// Native Windows WASAPI loopback capture for a real system-audio spectrum.
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Emitter;

static CAPTURE_RUNNING: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(target_os = "windows")]
fn capture_system_audio(app: tauri::AppHandle) -> Result<(), String> {
    use std::collections::VecDeque;
    use rustfft::{num_complex::Complex, FftPlanner};
    use wasapi::*;

    let com_result = initialize_mta();
    if com_result.is_err() {
        return Err(format!("COM initialization failed: {com_result:?}"));
    }
    let enumerator = DeviceEnumerator::new().map_err(|e| e.to_string())?;
    let device = enumerator.get_default_device(&Direction::Render).map_err(|e| e.to_string())?;
    let mut audio_client = device.get_iaudioclient().map_err(|e| e.to_string())?;
    let sample_rate = 44_100usize;
    const FFT_SIZE: usize = 2048;
    const CHANNELS: usize = 2;
    const BYTES_PER_FRAME: usize = 8;

    let format = WaveFormat::new(32, 32, &SampleType::Float, sample_rate, CHANNELS, None);
    let (_, min_period) = audio_client.get_device_period().map_err(|e| e.to_string())?;
    let mode = StreamMode::EventsShared {
        autoconvert: true,
        buffer_duration_hns: min_period,
    };
    // Direction::Render selects the output endpoint; WASAPI exposes its mix in loopback mode.
    audio_client.initialize_client(&format, &Direction::Render, &mode).map_err(|e| e.to_string())?;
    let event = audio_client.set_get_eventhandle().map_err(|e| e.to_string())?;
    let capture = audio_client.get_audiocaptureclient().map_err(|e| e.to_string())?;
    let mut bytes = VecDeque::<u8>::with_capacity(FFT_SIZE * BYTES_PER_FRAME * 4);
    let mut planner = FftPlanner::<f32>::new();
    let fft = planner.plan_fft_forward(FFT_SIZE);
    let mut window = vec![0.0f32; FFT_SIZE];
    for (i, sample) in window.iter_mut().enumerate() {
        *sample = 0.5 - 0.5 * (2.0 * std::f32::consts::PI * i as f32 / (FFT_SIZE - 1) as f32).cos();
    }

    audio_client.start_stream().map_err(|e| e.to_string())?;
    while CAPTURE_RUNNING.load(Ordering::SeqCst) {
        capture.read_from_device_to_deque(&mut bytes).map_err(|e| e.to_string())?;
        while bytes.len() >= FFT_SIZE * BYTES_PER_FRAME {
            let mut spectrum = vec![Complex::new(0.0f32, 0.0f32); FFT_SIZE];
            for i in 0..FFT_SIZE {
                let mut left = [0u8; 4];
                let mut right = [0u8; 4];
                for b in left.iter_mut() { *b = bytes.pop_front().unwrap_or(0); }
                for b in right.iter_mut() { *b = bytes.pop_front().unwrap_or(0); }
                let mono = (f32::from_le_bytes(left) + f32::from_le_bytes(right)) * 0.5;
                spectrum[i].re = mono * window[i];
            }
            fft.process(&mut spectrum);

            let mut bars = Vec::with_capacity(56);
            for bar in 0..56 {
                let low_hz = 35.0f32 * (16_000.0f32 / 35.0f32).powf(bar as f32 / 56.0);
                let high_hz = 35.0f32 * (16_000.0f32 / 35.0f32).powf((bar + 1) as f32 / 56.0);
                let start = ((low_hz * FFT_SIZE as f32 / sample_rate as f32).floor() as usize).max(1);
                let end = ((high_hz * FFT_SIZE as f32 / sample_rate as f32).ceil() as usize).max(start + 1).min(FFT_SIZE / 2);
                let mut power = 0.0f32;
                let mut count = 0usize;
                for bin in start..end {
                    power += spectrum[bin].norm_sqr();
                    count += 1;
                }
                let rms = if count > 0 { (power / count as f32).sqrt() } else { 0.0 };
                bars.push(((rms / FFT_SIZE as f32) * 18.0).sqrt().clamp(0.0, 1.0));
            }
            let _ = app.emit("system-audio-spectrum", bars);
        }
        // The event is signaled by the output audio engine as new samples arrive.
        let _ = event.wait_for_event(100_000);
    }
    let _ = audio_client.stop_stream();
    Ok(())
}

#[tauri::command]
fn start_system_audio_capture(app: tauri::AppHandle) -> Result<(), String> {
    if CAPTURE_RUNNING.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_err() {
        return Ok(());
    }
    std::thread::spawn(move || {
        if let Err(error) = capture_system_audio(app.clone()) {
            let _ = app.emit("system-audio-error", error);
        }
        CAPTURE_RUNNING.store(false, Ordering::SeqCst);
    });
    Ok(())
}

#[tauri::command]
fn stop_system_audio_capture() {
    CAPTURE_RUNNING.store(false, Ordering::SeqCst);
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
fn start_system_audio_capture() -> Result<(), String> {
    Err("Native system-audio capture is currently supported on Windows only.".into())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
fn stop_system_audio_capture() {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            start_system_audio_capture,
            stop_system_audio_capture
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
