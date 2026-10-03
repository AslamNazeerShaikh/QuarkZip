// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod archive;
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
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, drag_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
