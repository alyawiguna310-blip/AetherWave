#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use eframe::egui;
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Page {
    Home,
    Library,
    Visuals,
    Wallpaper,
    Settings,
}

impl Page {
    const ALL: [(Self, &'static str); 5] = [
        (Self::Home, "Home"),
        (Self::Library, "Library"),
        (Self::Visuals, "Visuals"),
        (Self::Wallpaper, "Wallpaper"),
        (Self::Settings, "Settings"),
    ];
}

#[derive(Default)]
struct AetherWaveNative {
    page: Option<Page>,
    audio_files: Vec<PathBuf>,
    status: String,
}

impl AetherWaveNative {
    fn page(&self) -> Page {
        self.page.unwrap_or(Page::Home)
    }

    fn pick_audio(&mut self) {
        let files = rfd::FileDialog::new()
            .set_title("Add music to AetherWave")
            .add_filter(
                "Audio files",
                &["mp3", "flac", "wav", "ogg", "oga", "m4a", "mp4", "aac", "opus", "aiff", "aif"],
            )
            .pick_files()
            .unwrap_or_default();

        if files.is_empty() {
            return;
        }

        let count = files.len();
        self.audio_files.extend(files);
        self.status = format!("Added {count} file(s) to the native UI prototype.");
    }
}

impl eframe::App for AetherWaveNative {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        ctx.set_visuals(egui::Visuals::dark());

        egui::SidePanel::left("navigation")
            .resizable(false)
            .exact_width(172.0)
            .show(ctx, |ui| {
                ui.add_space(8.0);
                ui.heading(egui::RichText::new("AETHERWAVE").size(20.0).strong());
                ui.label(egui::RichText::new("NATIVE EDITION").small().weak());
                ui.add_space(28.0);

                for (page, label) in Page::ALL {
                    if ui.selectable_label(self.page() == page, label).clicked() {
                        self.page = Some(page);
                    }
                }

                ui.with_layout(egui::Layout::bottom_up(egui::Align::Min), |ui| {
                    ui.separator();
                    ui.label(egui::RichText::new("Rust + egui").small().weak());
                    ui.label(egui::RichText::new("No WebView").small().weak());
                });
            });

        egui::TopBottomPanel::bottom("status_bar").show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.label(self.status.as_str());
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    ui.label(egui::RichText::new("Native migration prototype").small().weak());
                });
            });
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            ui.add_space(8.0);
            match self.page() {
                Page::Home => {
                    ui.heading("Your music, without the WebView");
                    ui.label("A native Rust + egui UI foundation for AetherWave.");
                    ui.add_space(18.0);

                    ui.group(|ui| {
                        ui.heading("Local music");
                        ui.label("Choose local audio files to populate the migration prototype.");
                        if ui.button("＋  Add audio files").clicked() {
                            self.pick_audio();
                        }
                        ui.label(format!("Selected files: {}", self.audio_files.len()));
                        for path in self.audio_files.iter().take(8) {
                            let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("Audio file");
                            ui.label(format!("♪  {name}"));
                        }
                        if self.audio_files.len() > 8 {
                            ui.label(format!("…and {} more", self.audio_files.len() - 8));
                        }
                    });

                    ui.add_space(14.0);
                    ui.group(|ui| {
                        ui.heading("Migration status");
                        ui.label("This is the first native UI slice, not a feature-complete replacement yet.");
                        ui.label("Playback, WASAPI capture, visualizer rendering, YouTube, queue, and Wallpaper Engine support must be ported and tested before retiring the Tauri app.");
                    });
                }
                Page::Library => {
                    ui.heading("Library");
                    ui.label("Native library view is scaffolded; persistent library and playback integration are still to be ported.");
                    ui.separator();
                    for path in &self.audio_files {
                        ui.label(path.display().to_string());
                    }
                }
                Page::Visuals => {
                    ui.heading("Visuals");
                    ui.label("The existing horizontal spectrum visualizer and system-audio capture are scheduled for the native port.");
                    ui.label("The Windows desktop wallpaper will not be changed by this app.");
                }
                Page::Wallpaper => {
                    ui.heading("Wallpaper Engine");
                    ui.label("The native port must browse and preview Wallpaper Engine content inside the app only.");
                    ui.label("It must never apply a wallpaper to the Windows desktop.");
                }
                Page::Settings => {
                    ui.heading("Settings");
                    ui.label("Native settings and persistence will be migrated after the core playback path.");
                }
            }
        });
    }
}

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_title("AetherWave")
            .with_inner_size([1080.0, 720.0])
            .with_min_inner_size([760.0, 520.0]),
        ..Default::default()
    };

    eframe::run_native(
        "AetherWave",
        options,
        Box::new(|_creation_context| Ok(Box::<AetherWaveNative>::default())),
    )
}
