// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod archive;

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
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Starts a native window drag (used by the custom header strip).
#[tauri::command]
fn drag_window(window: tauri::Window) {
    let _ = window.start_dragging();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, drag_window, list_archive])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
