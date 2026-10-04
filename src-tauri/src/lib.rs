// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod archive;

use tauri::Manager;
use tauri_plugin_shell::ShellExt;

/// Bounds for sidecar execution. A hung 7zz — notably a macOS Gatekeeper
/// block on the unsigned binary, which never exits — must surface as an
/// error, never an infinite "Reading…"/"Extracting…" spinner.
const LIST_TIMEOUT_SECS: u64 = 60;
const EXTRACT_TIMEOUT_SECS: u64 = 600;

/// Runs the pinned 7zz sidecar with `args`, killing it on timeout.
/// Collects stdout/stderr the same line-wise way `Command::output` does.
async fn run_sidecar(
    app: &tauri::AppHandle,
    args: Vec<String>,
    timeout_secs: u64,
) -> Result<(Option<i32>, Vec<u8>, Vec<u8>), String> {
    use tauri_plugin_shell::process::CommandEvent;
    let (mut rx, child) = app
        .shell()
        .sidecar("binaries/7zz")
        .map_err(|e| e.to_string())?
        .args(args)
        .spawn()
        .map_err(|e| e.to_string())?;
    let collect = async {
        let mut code = None;
        let mut stdout = Vec::new();
        let mut stderr = Vec::new();
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Terminated(payload) => code = payload.code,
                CommandEvent::Stdout(line) => {
                    stdout.extend(line);
                    stdout.push(b'\n');
                }
                CommandEvent::Stderr(line) => {
                    stderr.extend(line);
                    stderr.push(b'\n');
                }
                // Non-exhaustive enum: ignore anything else (e.g. Error).
                _ => {}
            }
        }
        (code, stdout, stderr)
    };
    match tokio::time::timeout(std::time::Duration::from_secs(timeout_secs), collect).await {
        Ok(done) => Ok(done),
        Err(_) => {
            let _ = child.kill();
            Err(format!(
                "7zz did not respond within {timeout_secs}s and was killed. \
                On macOS this usually means Gatekeeper blocked the unsigned \
                sidecar — clear it with `xattr -d com.apple.quarantine \
                src-tauri/binaries/7zz-*` (or re-run scripts/fetch-7zz.sh) \
                and try again."
            ))
        }
    }
}

/// Lists an archive's contents via the pinned 7zz sidecar.
///
/// Argv is built by [`archive::list_args`] (never from raw frontend input);
/// only the archive *path* crosses the IPC boundary.
#[tauri::command]
async fn list_archive(
    app: tauri::AppHandle,
    path: String,
) -> Result<Vec<archive::ArchiveEntry>, String> {
    let (code, stdout, stderr) =
        run_sidecar(&app, archive::list_args(&path), LIST_TIMEOUT_SECS).await?;
    if code != Some(0) {
        return Err(String::from_utf8_lossy(&stderr).into_owned());
    }
    Ok(archive::parse_list_slt(&String::from_utf8_lossy(&stdout)))
}
#[tauri::command]
async fn info_archive(
    app: tauri::AppHandle,
    path: String,
) -> Result<archive::ArchiveInfo, String> {
    let (code, stdout, stderr) =
        run_sidecar(&app, archive::list_args(&path), LIST_TIMEOUT_SECS).await?;
    if code != Some(0) {
        return Err(String::from_utf8_lossy(&stderr).into_owned());
    }
    let mut info = archive::parse_archive_info(&String::from_utf8_lossy(&stdout));
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
    let (code, stdout, stderr) = run_sidecar(
        &app,
        archive::extract_args(&path, &dest, None, &files),
        EXTRACT_TIMEOUT_SECS,
    )
    .await?;
    if code != Some(0) {
        return Err(String::from_utf8_lossy(&stderr).into_owned());
    }
    let stdout = String::from_utf8_lossy(&stdout).into_owned();
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
            // Per-platform chrome: Linux stays borderless with the custom
            // TitleBar (rounded corners need a transparent window). macOS
            // needs native traffic lights, so decorations are re-enabled —
            // but the two runtime calls below RACE if sent back-to-back:
            // `set_decorations` applies via an async main-queue block while
            // `set_title_bar_style` applies synchronously, so the style-mask
            // rewrite lands last and wipes the overlay state (leaving a
            // `Visible` strip above the content). Deferring the style past
            // the mask change fixes it (the light inset comes from
            // `trafficLightPosition`, applied at creation). The
            // window starts hidden (`visible: false`) and is shown only
            // after styling, so macOS never flashes the wrong state.
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                {
                    let _ = window.set_decorations(true);
                    let deferred = window.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(500));
                        let style =
                            deferred.set_title_bar_style(tauri::utils::TitleBarStyle::Overlay);
                        eprintln!("[quarkzip] overlay style applied: {style:?}");
                        let shown = deferred.show();
                        eprintln!("[quarkzip] window shown: {shown:?}");
                    });
                }
                #[cfg(not(target_os = "macos"))]
                {
                    let _ = window.show();
                }
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
