// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod archive;

use tauri::Manager;
use tauri_plugin_shell::ShellExt;

/// Lists an archive's contents via the pinned 7zz sidecar.
///
/// Argv is built by [`archive::list_args`] (never from raw frontend input);
/// only the archive *path* crosses the IPC boundary.
#[tauri::command]
async fn list_archive(
    app: tauri::AppHandle,
    path: String,
) -> Result<Vec<archive::ArchiveEntry>, String> {
    let output = app
        .shell()
        .sidecar("binaries/7zz")
        .map_err(|e| e.to_string())?
        .args(archive::list_args(&path))
        .output()
        .await
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }
    Ok(archive::parse_list_slt(&String::from_utf8_lossy(
        &output.stdout,
    )))
}
#[tauri::command]
async fn info_archive(
    app: tauri::AppHandle,
    path: String,
) -> Result<archive::ArchiveInfo, String> {
    let output = app
        .shell()
        .sidecar("binaries/7zz")
        .map_err(|e| e.to_string())?
        .args(archive::list_args(&path))
        .output()
        .await
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }
    let mut info = archive::parse_archive_info(&String::from_utf8_lossy(&output.stdout));
    // Filesystem truth for the container itself (size + mtime as epoch secs).
    if let Ok(meta) = std::fs::metadata(&path) {
        info.container_size = Some(meta.len());
        info.container_modified = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs());
    }
    Ok(info)
}

/// Extracts an archive via the pinned 7zz sidecar into `dest`
/// (`7zz x <archive> -o<dest> [files...] -y`, no password prompt). An empty
/// `files` list extracts everything; otherwise only those in-archive paths.
/// 7zz creates `dest` when missing. Returns 7zz's stdout; stderr becomes
/// the error.
#[tauri::command]
async fn extract_archive(
    app: tauri::AppHandle,
    path: String,
    dest: String,
    files: Vec<String>,
) -> Result<String, String> {
    let output = app
        .shell()
        .sidecar("binaries/7zz")
        .map_err(|e| e.to_string())?
        .args(archive::extract_args(&path, &dest, None, &files))
        .output()
        .await
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }
    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    if archive::extract_output_is_noop(&stdout) {
        return Err("No files to process — nothing matched the selection.".to_string());
    }
    Ok(stdout)
}

/// Starts a native window drag (used by the custom header strip).
#[tauri::command]
fn drag_window(window: tauri::Window) {
    let _ = window.start_dragging();
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            // Per-platform chrome: macOS gets the native title bar with
            // traffic lights; Linux stays borderless with the custom
            // TitleBar (rounded corners need a transparent window). The
            // window starts hidden (`visible: false`) so macOS never
            // flashes the borderless state.
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                {
                    let _ = window.set_decorations(true);
                    let _ =
                        window.set_title_bar_style(tauri::utils::TitleBarStyle::Visible);
                }
                let _ = window.show();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            drag_window,
            list_archive,
            info_archive,
            extract_archive
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
