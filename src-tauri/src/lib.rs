// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod archive;
pub mod checksum;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

/// Bounds for sidecar execution. A hung 7zz — notably a macOS Gatekeeper
/// block on the unsigned binary, which never exits — must surface as an
/// error, never an infinite "Reading…"/"Extracting…" spinner.
const LIST_TIMEOUT_SECS: u64 = 60;
const EXTRACT_TIMEOUT_SECS: u64 = 600;
const TEST_TIMEOUT_SECS: u64 = 600;

/// Long 7zz output is truncated for IPC: the frontend shows the tail.
const ERROR_TAIL_CHARS: usize = 4000;

/// Cooperative cancel flag for [`checksum_file`]. Single-window app, one
/// checksum at a time: starting resets it, [`cancel_checksum`] sets it.
static CHECKSUM_CANCEL: AtomicBool = AtomicBool::new(false);

/// Runs the pinned 7zz sidecar with `args`, killing it on timeout.
/// Collects stdout/stderr the same line-wise way `Command::output` does.
/// Stdout chunks are additionally scanned for `NN%` progress (7zz `-bsp1`
/// separates updates with `\r` inside one chunk); `on_progress` fires only
/// when the max percent grows.
async fn run_sidecar_progress(
    app: &tauri::AppHandle,
    args: Vec<String>,
    timeout_secs: u64,
    mut on_progress: impl FnMut(u32),
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
        let mut last_pct: u32 = 0;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Terminated(payload) => code = payload.code,
                CommandEvent::Stdout(line) => {
                    if let Some(pct) =
                        archive::parse_progress_percent(&String::from_utf8_lossy(&line))
                    {
                        if pct > last_pct {
                            last_pct = pct;
                            on_progress(pct);
                        }
                    }
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

/// Same as [`run_sidecar_progress`] with progress discarded.
async fn run_sidecar(
    app: &tauri::AppHandle,
    args: Vec<String>,
    timeout_secs: u64,
) -> Result<(Option<i32>, Vec<u8>, Vec<u8>), String> {
    run_sidecar_progress(app, args, timeout_secs, |_| {}).await
}

/// Last ~`ERROR_TAIL_CHARS` chars of long output (char-boundary safe).
fn tail(text: &str) -> String {
    if text.len() <= ERROR_TAIL_CHARS {
        return text.to_string();
    }
    let start = text.len() - ERROR_TAIL_CHARS;
    let idx = (start..text.len())
        .find(|i| text.is_char_boundary(*i))
        .unwrap_or(text.len());
    format!("…{}", &text[idx..])
}

/// Lists an archive's contents via the pinned 7zz sidecar.
///
/// Argv is built by [`archive::list_args`] (never from raw frontend input);
/// only the archive *path* (and optional password) cross the IPC boundary.
#[tauri::command]
async fn list_archive(
    app: tauri::AppHandle,
    path: String,
    password: Option<String>,
) -> Result<Vec<archive::ArchiveEntry>, String> {
    let (code, stdout, stderr) = run_sidecar(
        &app,
        archive::list_args(&path, password.as_deref()),
        LIST_TIMEOUT_SECS,
    )
    .await?;
    if code != Some(0) {
        return Err(String::from_utf8_lossy(&stderr).into_owned());
    }
    Ok(archive::parse_list_slt(&String::from_utf8_lossy(&stdout)))
}
#[tauri::command]
async fn info_archive(
    app: tauri::AppHandle,
    path: String,
    password: Option<String>,
) -> Result<archive::ArchiveInfo, String> {
    let (code, stdout, stderr) = run_sidecar(
        &app,
        archive::list_args(&path, password.as_deref()),
        LIST_TIMEOUT_SECS,
    )
    .await?;
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
/// (`7zz x <archive> -o<dest> [files...] [-p<pw>] -y`, no password prompt).
/// An empty `files` list extracts everything; otherwise only those
/// in-archive paths. 7zz creates `dest` when missing. Returns 7zz's stdout;
/// stderr becomes the error.
#[tauri::command]
async fn extract_archive(
    app: tauri::AppHandle,
    path: String,
    dest: String,
    files: Vec<String>,
    password: Option<String>,
) -> Result<String, String> {
    let (code, stdout, stderr) = run_sidecar(
        &app,
        archive::extract_args(&path, &dest, password.as_deref(), &files),
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

/// Tests an archive's integrity via the pinned 7zz sidecar
/// (`7zz t <archive> [-p<pw>] -bsp1`). Whole-percent progress streams over
/// `on_progress`; success returns the `Everything is Ok` marker, anything
/// else (bad CRC, wrong password, truncated output) becomes the error.
///
/// NOTE: `#[tauri::command]` camelCases argument names on the IPC boundary
/// by default, so the frontend sends `onProgress` (not `on_progress`).
#[tauri::command]
async fn test_archive(
    app: tauri::AppHandle,
    path: String,
    password: Option<String>,
    on_progress: tauri::ipc::Channel<u32>,
) -> Result<String, String> {
    let (code, stdout, stderr) = run_sidecar_progress(
        &app,
        archive::test_progress_args(&path, password.as_deref()),
        TEST_TIMEOUT_SECS,
        |pct| {
            let _ = on_progress.send(pct);
        },
    )
    .await?;
    if code != Some(0) {
        let detail = String::from_utf8_lossy(&stderr).into_owned();
        return Err(if detail.trim().is_empty() {
            "Integrity test failed.".to_string()
        } else {
            tail(&detail)
        });
    }
    let stdout = String::from_utf8_lossy(&stdout).into_owned();
    if !archive::test_output_ok(&stdout) {
        return Err(if stdout.trim().is_empty() {
            "Integrity test failed.".to_string()
        } else {
            tail(&stdout)
        });
    }
    let _ = on_progress.send(100);
    Ok("Everything is Ok".to_string())
}

/// Calculates a file checksum (MD5 / SHA-1 / SHA-256 / SHA-512) with
/// whole-percent progress over `on_progress`. Returns the lowercase hex
/// digest. Abort mid-run with [`cancel_checksum`].
///
/// NOTE: like [`test_archive`], the frontend sends `onProgress` (Tauri
/// camelCases command args on IPC by default).
#[tauri::command]
async fn checksum_file(
    path: String,
    algorithm: String,
    on_progress: tauri::ipc::Channel<u32>,
) -> Result<String, String> {
    let algo = checksum::ChecksumAlgo::parse(&algorithm).ok_or_else(|| {
        format!(
            "Unsupported checksum algorithm \"{algorithm}\". Use MD5, SHA-1, SHA-256 or SHA-512."
        )
    })?;
    CHECKSUM_CANCEL.store(false, Ordering::SeqCst);
    checksum::hash_file_async(&path, algo, &CHECKSUM_CANCEL, |pct| {
        let _ = on_progress.send(pct);
    })
    .await
}

/// Cancels an in-flight [`checksum_file`]. The dialog stays open; the
/// command surfaces the cancellation as its error.
#[tauri::command]
fn cancel_checksum() {
    CHECKSUM_CANCEL.store(true, Ordering::SeqCst);
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
            extract_archive,
            test_archive,
            checksum_file,
            cancel_checksum
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
