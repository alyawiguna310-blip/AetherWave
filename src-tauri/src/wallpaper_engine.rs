use serde::Serialize;
use serde_json::Value;
use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
    process::Command,
};

const WORKSHOP_APP_ID: &str = "431960";
const MAX_THUMBNAIL_BYTES: u64 = 2 * 1024 * 1024;

#[derive(Debug, Serialize, Clone)]
pub struct WallpaperItem {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub kind: String,
    pub preview_path: Option<String>,
    pub image_path: Option<String>,
    pub video_path: Option<String>,
    pub has_audio_hint: bool,
    pub audio_note: String,
    pub folder_path: String,
}

#[derive(Debug, Serialize)]
pub struct WallpaperEngineStatus {
    pub installed: bool,
    pub executable_path: Option<String>,
    pub library_count: usize,
    pub message: String,
}

fn decode_vdf_paths(content: &str) -> Vec<PathBuf> {
    content.lines().filter_map(|line| {
        let fields: Vec<&str> = line.trim().split('"').collect();
        (fields.len() >= 5 && fields[1] == "path")
            .then(|| PathBuf::from(fields[3].replace("\\\\", "\\")))
    }).collect()
}

#[cfg(windows)]
fn registry_steam_roots() -> Vec<PathBuf> {
    let queries = [
        ("HKCU\\Software\\Valve\\Steam", "SteamPath"),
        ("HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam", "InstallPath"),
        ("HKLM\\SOFTWARE\\Valve\\Steam", "InstallPath"),
    ];
    queries.iter().filter_map(|(key, value)| {
        let output = Command::new("reg.exe").args(["query", key, "/v", value]).output().ok()?;
        if !output.status.success() { return None; }
        String::from_utf8_lossy(&output.stdout).lines().find_map(|line| {
            let trimmed = line.trim();
            if !trimmed.starts_with(value) { return None; }
            let path = trimmed.split_whitespace().last()?;
            (!path.is_empty()).then(|| PathBuf::from(path))
        })
    }).collect()
}

#[cfg(not(windows))]
fn registry_steam_roots() -> Vec<PathBuf> { Vec::new() }

fn steam_roots() -> BTreeSet<PathBuf> {
    let mut roots = BTreeSet::new();
    if let Some(path) = std::env::var_os("STEAM_DIR") { roots.insert(PathBuf::from(path)); }
    roots.extend(registry_steam_roots());
    if let Some(path) = std::env::var_os("ProgramFiles(x86)") { roots.insert(PathBuf::from(path).join("Steam")); }
    if let Some(path) = std::env::var_os("ProgramFiles") { roots.insert(PathBuf::from(path).join("Steam")); }
    if let Some(path) = std::env::var_os("LOCALAPPDATA") { roots.insert(PathBuf::from(path).join("Programs/Steam")); }
    for drive in ["C:/", "D:/", "E:/", "F:/", "G:/", "H:/"] {
        for suffix in ["Steam", "SteamLibrary", "Games/Steam", "Games/SteamLibrary"] {
            roots.insert(PathBuf::from(drive).join(suffix));
        }
    }
    roots
}

fn steam_libraries() -> BTreeSet<PathBuf> {
    let roots = steam_roots();
    let mut libraries = roots.clone();
    for root in &roots {
        if let Ok(contents) = fs::read_to_string(root.join("steamapps/libraryfolders.vdf")) {
            libraries.extend(decode_vdf_paths(&contents));
        }
    }
    libraries
}

fn workshop_folders() -> Vec<PathBuf> {
    steam_libraries().into_iter()
        .map(|library| library.join("steamapps/workshop/content").join(WORKSHOP_APP_ID))
        .filter(|path| path.is_dir())
        .collect()
}

fn wallpaper_executable() -> Option<PathBuf> {
    steam_libraries().into_iter().flat_map(|library| {
        let install = library.join("steamapps/common/wallpaper_engine");
        [install.join("wallpaper64.exe"), install.join("wallpaper32.exe")]
    }).find(|path| path.is_file())
}

fn first_existing_file(folder: &Path, names: &[&str]) -> Option<PathBuf> {
    names.iter().map(|name| folder.join(name)).find(|path| path.is_file())
}

fn find_video(folder: &Path) -> Option<PathBuf> {
    let mut stack = vec![folder.to_path_buf()];
    let mut visited = 0usize;
    while let Some(dir) = stack.pop() {
        if visited >= 160 { break; }
        visited += 1;
        let Ok(entries) = fs::read_dir(dir) else { continue };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() { stack.push(path); }
            else if path.extension().and_then(|x| x.to_str()).is_some_and(|ext| {
                matches!(ext.to_ascii_lowercase().as_str(), "mp4" | "webm" | "m4v" | "mov")
            }) { return Some(path); }
        }
    }
    None
}

fn find_image(folder: &Path) -> Option<PathBuf> {
    let mut stack = vec![folder.to_path_buf()];
    let mut visited = 0usize;
    let mut candidates: Vec<(u64, PathBuf)> = Vec::new();
    while let Some(dir) = stack.pop() {
        if visited >= 160 { break; }
        visited += 1;
        let Ok(entries) = fs::read_dir(dir) else { continue };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            let name = path.file_name().and_then(|x| x.to_str()).unwrap_or("").to_ascii_lowercase();
            if ["preview.", "screenshot.", "thumbnail."].iter().any(|prefix| name.starts_with(prefix)) {
                continue;
            }
            let is_image = path.extension().and_then(|x| x.to_str()).is_some_and(|ext| {
                matches!(ext.to_ascii_lowercase().as_str(), "jpg" | "jpeg" | "png" | "webp" | "bmp")
            });
            if !is_image { continue; }
            let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
            candidates.push((size, path));
        }
    }
    candidates.into_iter().max_by_key(|(size, _)| *size).map(|(_, path)| path)
}

fn metadata(folder: &Path) -> Option<Value> {
    fs::read_to_string(folder.join("project.json")).ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
}

fn value_string<'a>(value: &'a Value, keys: &[&str]) -> Option<&'a str> {
    keys.iter().find_map(|key| value.get(*key).and_then(Value::as_str))
}

fn contains_audio_hint(value: &Value) -> bool {
    let text = value.to_string().to_ascii_lowercase();
    ["audio", "sound", "music", "soundtrack", "sfx", "soundeffect", "sound_effect"]
        .iter().any(|needle| text.contains(needle))
}

fn preview_file(folder: &Path) -> Option<PathBuf> {
    first_existing_file(folder, &["preview.jpg", "preview.png", "preview.jpeg", "preview.gif", "screenshot.jpg"])
}

fn scan_items() -> Vec<WallpaperItem> {
    let mut items = Vec::new();
    let mut seen = BTreeSet::new();
    for workshop in workshop_folders() {
        let Ok(entries) = fs::read_dir(&workshop) else { continue };
        for entry in entries.flatten() {
            let folder = entry.path();
            if !folder.is_dir() { continue; }
            let id = folder.file_name().and_then(|x| x.to_str()).unwrap_or("").to_string();
            if id.is_empty() || !id.chars().all(|c| c.is_ascii_digit()) || !seen.insert(id.clone()) { continue; }
            let data = metadata(&folder);
            let title = data.as_ref().and_then(|v| value_string(v, &["title", "name"]))
                .filter(|s| !s.trim().is_empty()).map(str::to_owned)
                .unwrap_or_else(|| format!("Wallpaper {id}"));
            let description = data.as_ref().and_then(|v| value_string(v, &["description"]))
                .map(str::trim).filter(|s| !s.is_empty()).map(str::to_owned);
            let type_hint = data.as_ref().and_then(|v| value_string(v, &["type"]))
                .unwrap_or("unknown").to_ascii_lowercase();
            let has_audio_hint = data.as_ref().is_some_and(contains_audio_hint);
            let preview = preview_file(&folder);
            let video = find_video(&folder);
            let image = find_image(&folder);
            let kind = if type_hint.contains("video") || (type_hint == "unknown" && video.is_some()) { "video" }
                else if type_hint.contains("image") { "image" }
                else if type_hint.contains("scene") { "scene" }
                else if type_hint.contains("web") { "web" }
                else if type_hint.contains("application") { "application" }
                else { "other" };
            items.push(WallpaperItem {
                id, title, description, kind: kind.to_string(),
                preview_path: preview.map(|p| p.to_string_lossy().into_owned()),
                image_path: if type_hint.contains("image") { image.map(|p| p.to_string_lossy().into_owned()) } else { None },
                video_path: video.map(|p| p.to_string_lossy().into_owned()),
                has_audio_hint,
                audio_note: if has_audio_hint {
                    "Audio-related metadata was detected; this is only a hint, not a guarantee.".into()
                } else {
                    "No obvious audio metadata was detected; the wallpaper may still contain sound.".into()
                },
                folder_path: folder.to_string_lossy().into_owned(),
            });
        }
    }
    items.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    items
}

#[tauri::command]
pub fn scan_wallpaper_engine_library() -> Vec<WallpaperItem> { scan_items() }

#[tauri::command]
pub fn get_wallpaper_engine_status() -> WallpaperEngineStatus {
    let libraries = steam_libraries();
    let executable = wallpaper_executable();
    let workshop_count = workshop_folders().len();
    let installed = executable.is_some();
    WallpaperEngineStatus {
        installed,
        executable_path: executable.map(|p| p.to_string_lossy().into_owned()),
        library_count: workshop_count,
        message: if installed {
            format!("Wallpaper Engine was found. Workshop libraries detected: {workshop_count}.")
        } else {
            format!("Wallpaper Engine executable was not found in the {0} detected Steam library/root locations.", libraries.len())
        },
    }
}

fn encode_base64(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut output = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        let a = chunk[0] as u32;
        let b = *chunk.get(1).unwrap_or(&0) as u32;
        let c = *chunk.get(2).unwrap_or(&0) as u32;
        let n = (a << 16) | (b << 8) | c;
        output.push(TABLE[((n >> 18) & 63) as usize] as char);
        output.push(TABLE[((n >> 12) & 63) as usize] as char);
        output.push(if chunk.len() > 1 { TABLE[((n >> 6) & 63) as usize] as char } else { '=' });
        output.push(if chunk.len() > 2 { TABLE[(n & 63) as usize] as char } else { '=' });
    }
    output
}

#[tauri::command]
pub fn load_wallpaper_thumbnail(id: String) -> Result<Option<String>, String> {
    if id.is_empty() || !id.chars().all(|c| c.is_ascii_digit()) {
        return Err("Invalid Workshop wallpaper ID".into());
    }
    for workshop in workshop_folders() {
        let folder = workshop.join(&id);
        if !folder.is_dir() { continue; }
        let canonical_workshop = workshop.canonicalize()
            .map_err(|e| format!("Could not resolve Workshop directory: {e}"))?;
        let canonical_folder = folder.canonicalize()
            .map_err(|e| format!("Could not resolve wallpaper folder: {e}"))?;
        if !canonical_folder.starts_with(&canonical_workshop) {
            return Err("Wallpaper folder resolves outside its Workshop directory.".into());
        }
        let Some(path) = preview_file(&canonical_folder) else { return Ok(None); };
        let canonical_path = path.canonicalize()
            .map_err(|e| format!("Could not resolve thumbnail: {e}"))?;
        if !canonical_path.starts_with(&canonical_folder) || !canonical_path.is_file() {
            return Err("Thumbnail resolves outside its wallpaper folder.".into());
        }
        let metadata = fs::metadata(&canonical_path)
            .map_err(|e| format!("Could not inspect thumbnail: {e}"))?;
        if metadata.len() > MAX_THUMBNAIL_BYTES { return Ok(None); }
        let bytes = fs::read(&canonical_path)
            .map_err(|e| format!("Could not read thumbnail: {e}"))?;
        let mime = match canonical_path.extension().and_then(|x| x.to_str()).unwrap_or("").to_ascii_lowercase().as_str() {
            "png" => "image/png", "gif" => "image/gif", _ => "image/jpeg",
        };
        return Ok(Some(format!("data:{mime};base64,{}", encode_base64(&bytes))));
    }
    Ok(None)
}
