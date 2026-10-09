use serde::Serialize;
use serde_json::Value;
use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
    process::Command,
};

const WORKSHOP_APP_ID: &str = "431960";

#[derive(Debug, Serialize)]
pub struct WallpaperItem {
    pub id: String,
    pub title: String,
    pub kind: String,
    pub preview_path: Option<String>,
    pub video_path: Option<String>,
    pub has_audio_hint: bool,
    pub audio_note: String,
    pub folder_path: String,
}

fn decode_vdf_paths(content: &str) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    for line in content.lines() {
        let trimmed = line.trim();
        let fields: Vec<&str> = trimmed.split('"').collect();
        if fields.len() >= 5 && fields[1] == "path" {
            paths.push(PathBuf::from(fields[3].replace("\\\\", "\\")));
        }
    }
    paths
}

fn steam_roots() -> Vec<PathBuf> {
    let mut roots = BTreeSet::new();
    if let Some(program_files) = std::env::var_os("ProgramFiles(x86)") {
        roots.insert(PathBuf::from(program_files).join("Steam"));
    }
    if let Some(program_files) = std::env::var_os("ProgramFiles") {
        roots.insert(PathBuf::from(program_files).join("Steam"));
    }
    if let Some(local) = std::env::var_os("LOCALAPPDATA") {
        roots.insert(PathBuf::from(local).join("Programs/Steam"));
    }
    for drive in ["C:/", "D:/", "E:/", "F:/", "G:/", "H:/"] {
        for suffix in ["Steam", "SteamLibrary", "Games/Steam", "Games/SteamLibrary"] {
            roots.insert(PathBuf::from(drive).join(suffix));
        }
    }
    roots.into_iter().collect()
}

fn steam_libraries() -> Vec<PathBuf> {
    let roots = steam_roots();
    let mut libraries = BTreeSet::new();
    for root in &roots {
        libraries.insert(root.clone());
        let vdf = root.join("steamapps/libraryfolders.vdf");
        if let Ok(contents) = fs::read_to_string(vdf) {
            for path in decode_vdf_paths(&contents) {
                libraries.insert(path);
            }
        }
    }
    libraries.into_iter().collect()
}

fn find_workshop_folders() -> Vec<PathBuf> {
    steam_libraries()
        .into_iter()
        .map(|library| library.join("steamapps/workshop/content").join(WORKSHOP_APP_ID))
        .filter(|path| path.is_dir())
        .collect()
}

fn first_existing_file(folder: &Path, names: &[&str]) -> Option<PathBuf> {
    names.iter().map(|name| folder.join(name)).find(|path| path.is_file())
}

fn find_file_recursive(folder: &Path, wanted_name: &str) -> Option<PathBuf> {
    let mut stack = vec![folder.to_path_buf()];
    let mut visited = 0usize;
    while let Some(dir) = stack.pop() {
        if visited >= 160 { break; }
        visited += 1;
        let Ok(entries) = fs::read_dir(dir) else { continue };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.file_name().and_then(|n| n.to_str())
                .is_some_and(|name| name.eq_ignore_ascii_case(wanted_name)) {
                return Some(path);
            }
        }
    }
    None
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
            if path.is_dir() {
                stack.push(path);
            } else if path.extension().and_then(|x| x.to_str()).is_some_and(|ext| {
                matches!(ext.to_ascii_lowercase().as_str(), "mp4" | "webm" | "m4v" | "mov")
            }) {
                return Some(path);
            }
        }
    }
    None
}

fn metadata(folder: &Path) -> Option<Value> {
    let path = folder.join("project.json");
    fs::read_to_string(path).ok().and_then(|raw| serde_json::from_str(&raw).ok())
}

fn value_string<'a>(value: &'a Value, keys: &[&str]) -> Option<&'a str> {
    keys.iter().find_map(|key| value.get(*key).and_then(Value::as_str))
}

fn contains_audio_hint(value: &Value) -> bool {
    let text = value.to_string().to_ascii_lowercase();
    ["audio", "sound", "music", "soundtrack", "sfx", "soundeffect", "sound_effect"]
        .iter()
        .any(|needle| text.contains(needle))
}

#[tauri::command]
pub fn scan_wallpaper_engine_library() -> Vec<WallpaperItem> {
    let mut items = Vec::new();
    let mut seen = BTreeSet::new();

    for workshop in find_workshop_folders() {
        let Ok(entries) = fs::read_dir(&workshop) else { continue };
        for entry in entries.flatten() {
            let folder = entry.path();
            if !folder.is_dir() { continue; }
            let id = folder.file_name().and_then(|x| x.to_str()).unwrap_or("").to_string();
            if !id.chars().all(|ch| ch.is_ascii_digit()) || id.is_empty() || !seen.insert(id.clone()) {
                continue;
            }

            let data = metadata(&folder);
            let title = data.as_ref()
                .and_then(|v| value_string(v, &["title", "name", "description"]))
                .filter(|s| !s.trim().is_empty())
                .map(str::to_owned)
                .unwrap_or_else(|| format!("Wallpaper {id}"));
            let type_hint = data.as_ref()
                .and_then(|v| value_string(v, &["type", "file"]))
                .unwrap_or("unknown")
                .to_ascii_lowercase();
            let has_audio_hint = data.as_ref().is_some_and(contains_audio_hint);
            let preview = first_existing_file(&folder, &["preview.jpg", "preview.png", "preview.gif", "screenshot.jpg"]);
            let video = find_video(&folder);
            let kind = if type_hint.contains("video") || video.is_some() { "video" }
                else if type_hint.contains("scene") { "scene" }
                else if type_hint.contains("web") { "web" }
                else { "other" };

            items.push(WallpaperItem {
                id,
                title,
                kind: kind.to_string(),
                preview_path: preview.map(|p| p.to_string_lossy().into_owned()),
                video_path: video.map(|p| p.to_string_lossy().into_owned()),
                has_audio_hint,
                audio_note: if has_audio_hint {
                    "Audio-related metadata detected; hidden by the silent-only filter".into()
                } else {
                    "No obvious audio metadata detected; embedded assets may still contain sound".into()
                },
                folder_path: folder.to_string_lossy().into_owned(),
            });
        }
    }
    items.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    items
}

fn find_wallpaper_engine_executable() -> Option<PathBuf> {
    for library in steam_libraries() {
        let folder = library.join("steamapps/common/wallpaper_engine");
        for name in ["wallpaper64.exe", "wallpaper32.exe"] {
            let candidate = folder.join(name);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

fn wallpaper_entry(folder: &Path) -> Result<PathBuf, String> {
    let data = metadata(folder);
    let kind = data.as_ref()
        .and_then(|v| value_string(v, &["type"]))
        .unwrap_or("")
        .to_ascii_lowercase();

    let candidate = if kind.contains("scene") {
        folder.join("project.json").is_file().then(|| folder.join("project.json"))
    } else if kind.contains("web") {
        find_file_recursive(folder, "index.html")
    } else if kind.contains("video") {
        find_video(folder)
    } else {
        find_video(folder)
            .or_else(|| folder.join("project.json").is_file().then(|| folder.join("project.json")))
            .or_else(|| find_file_recursive(folder, "index.html"))
    };

    candidate.filter(|path| path.is_file())
        .ok_or_else(|| "Could not find a supported wallpaper entry file in this Workshop item.".to_string())
}

#[tauri::command]
pub fn apply_wallpaper_engine_wallpaper(id: String) -> Result<String, String> {
    if id.is_empty() || !id.chars().all(|ch| ch.is_ascii_digit()) {
        return Err("Invalid Workshop ID.".into());
    }

    let mut matched_folder = None;
    for workshop in find_workshop_folders() {
        let candidate = workshop.join(&id);
        if candidate.is_dir() {
            matched_folder = Some((workshop, candidate));
            break;
        }
    }
    let (workshop, folder) = matched_folder.ok_or_else(|| {
        "That wallpaper was not found in the detected Steam Workshop libraries. Try Rescan libraries.".to_string()
    })?;

    let workshop_root = workshop.canonicalize().map_err(|e| format!("Could not resolve Workshop library: {e}"))?;
    let canonical_folder = folder.canonicalize().map_err(|e| format!("Could not resolve wallpaper folder: {e}"))?;
    if !canonical_folder.starts_with(&workshop_root) {
        return Err("Wallpaper path is outside the detected Workshop folder.".into());
    }

    let entry = wallpaper_entry(&canonical_folder)?
        .canonicalize()
        .map_err(|e| format!("Could not resolve wallpaper entry file: {e}"))?;
    if !entry.starts_with(&canonical_folder) || !entry.is_file() {
        return Err("Wallpaper entry file resolves outside its Workshop folder.".into());
    }
    let executable = find_wallpaper_engine_executable().ok_or_else(|| {
        "Wallpaper Engine executable was not found in detected Steam libraries. Open Steam and verify the Wallpaper Engine installation.".to_string()
    })?;

    Command::new(&executable)
        .args(["-control", "openWallpaper", "-file"])
        .arg(&entry)
        .spawn()
        .map_err(|e| format!("Could not send the wallpaper command to Wallpaper Engine: {e}"))?;

    Ok(format!("Wallpaper command sent for Workshop item {id}. Check your desktop to confirm it was applied; Wallpaper Engine should already be running."))
}
