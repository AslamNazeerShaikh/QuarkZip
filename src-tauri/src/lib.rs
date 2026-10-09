// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod archive;
pub mod checksum;
pub mod sevenzip;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;

/// Cooperative cancel flag for [`checksum_file`]. Single-window app, one
/// checksum at a time: starting resets it, [`cancel_checksum`] sets it.
static CHECKSUM_CANCEL: AtomicBool = AtomicBool::new(false);

/// Cooperative cancel flag for [`list_archive`]/[`info_archive`], same
/// single-operation contract. Reset when a listing starts (only there —
/// `info_archive` runs second in the same open flow, so a cancel landing
/// between the two must still abort it instead of being cleared).
static LIST_CANCEL: AtomicBool = AtomicBool::new(false);

/// Backend-held listing for the in-process engine: one open flow's full
/// detail set, so `info_archive` summarizes without re-running 7zz and
/// future paging serves slices without re-enumerating. Single-window app:
/// one listing at a time, replaced on every successful open.
#[derive(Default)]
struct ListingState {
    current: std::sync::Mutex<Option<StoredListing>>,
}

struct StoredListing {
    path: String,
    header: std::collections::BTreeMap<String, String>,
    facts: Vec<crate::archive::EntryFacts>,
}

/// Listings stay backend-held; only the total crosses IPC on open.
/// A 10M listing never materializes in the renderer — tree folders arrive
/// via [`get_children`] in bounded chunks.
#[derive(serde::Serialize)]
struct ListingOpened {
    total: usize,
}

/// Listing progress snapshot streamed over a Channel while the
/// in-process listing runs: entries completed so far (totals are
/// unknowable upfront), so the frontend shows counters + an indeterminate
/// bar, never a fake ETA. `bytes` stays None (no stdout to measure).
#[derive(serde::Serialize, Clone)]
struct ListProgress {
    bytes: Option<u64>,
    entries: u64,
}

/// Lists an archive's contents with the in-process 7-Zip engine.
///
/// Only the archive *path* (and optional password) cross the IPC boundary.
/// Streaming [`ListProgress`] snapshots arrive over `on_progress` while the
/// listing runs (totals are unknowable upfront); abort with
/// [`cancel_list_archive`]. No sidecar anywhere: the engine enumerates
/// in-process on unix targets, and reports explicitly elsewhere.
///
/// P2: returns only the entry total — rows arrive per folder through
/// [`get_children`], so the renderer never holds the full listing.
///
/// NOTE: like [`test_archive`], the frontend sends `onProgress` (Tauri
/// camelCases command args on IPC by default).
#[tauri::command]
async fn list_archive(
    state: tauri::State<'_, ListingState>,
    path: String,
    password: Option<String>,
    on_progress: tauri::ipc::Channel<ListProgress>,
) -> Result<ListingOpened, String> {
    LIST_CANCEL.store(false, Ordering::SeqCst);
    let owned_path = path.clone();
    let owned_pw = password.clone();
    let progress_ffi = on_progress.clone();
    let res = tokio::task::spawn_blocking(move || {
        crate::sevenzip::enumerate_detail(
            &owned_path,
            owned_pw.as_deref(),
            &mut |n: u64| {
                let _ = progress_ffi.send(ListProgress {
                    bytes: None,
                    entries: n,
                });
            },
            &LIST_CANCEL,
        )
    })
    .await
    .map_err(|e| format!("listing task failed: {e}"))?;
    // Store for paging + info (no second engine run); only the total crosses.
    match res {
        Ok(data) => {
            let total = data.facts.len();
            *state.current.lock().expect("listing state") = Some(StoredListing {
                path: path.clone(),
                header: data.header,
                facts: data.facts,
            });
            Ok(ListingOpened { total })
        }
        Err(e) => Err(e),
    }
}

/// Serves one children chunk of the stored listing for the tree view,
/// sorted server-side on demand. `path` must match the open archive (a
/// newer open replaces the store, so a mismatched path means this request
/// is stale). `parent` is the in-archive folder path (`""` = root);
/// `offset`/`limit` page through that folder's immediate children only, so
/// a 1M-child folder arrives in bounded `MAX_CHILD_CHUNK` pieces behind
/// "Show more" rows. `limit` is capped at
/// [`archive::MAX_CHILD_CHUNK`]. Sorting 10M root indices takes seconds in
/// release; the frontend shows a loading row while a chunk is in flight.
#[tauri::command]
async fn get_children(
    state: tauri::State<'_, ListingState>,
    path: String,
    parent: String,
    offset: usize,
    limit: usize,
    sort_key: Option<String>,
    sort_dir: Option<String>,
) -> Result<archive::ChildrenPage, String> {
    if limit == 0 || limit > archive::MAX_CHILD_CHUNK {
        return Err(format!("limit must be 1..={}", archive::MAX_CHILD_CHUNK));
    }
    let key = match sort_key.as_deref() {
        None => archive::PageSortKey::Path,
        Some(k) => {
            archive::PageSortKey::parse(k).ok_or_else(|| format!("unknown sort key: {k}"))?
        }
    };
    let desc = sort_dir.as_deref() == Some("desc");
    let store = state.current.lock().expect("listing state");
    let stored = store.as_ref().ok_or("no open archive")?;
    if stored.path != path {
        return Err("listing changed; children request is stale".to_string());
    }
    Ok(archive::children_of(
        &stored.facts,
        &parent,
        offset,
        limit,
        key,
        desc,
    ))
}
#[tauri::command]
async fn info_archive(
    state: tauri::State<'_, ListingState>,
    path: String,
) -> Result<archive::ArchiveInfo, String> {
    // Summarize the stored in-process listing (no second engine run).
    // Path must match — a stale store belongs to another archive.
    if let Some(stored) = state.current.lock().expect("listing state").as_ref() {
        if stored.path == path {
            let mut info = archive::summarize_archive_info(&stored.header, &stored.facts);
            // Filesystem truth for the container itself (size + mtime).
            if let Ok(meta) = std::fs::metadata(&path) {
                info.container_size = Some(meta.len());
                info.container_modified = meta
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs());
            }
            return Ok(info);
        }
    }
    Err("no open archive".to_string())
}

/// Maps a filesystem io error to the user-facing contract: permission
/// denials carry "Permission denied" (the frontend permission dialog keys
/// off it), missing paths stay "No such file or directory".
fn map_fs_error(e: std::io::Error, path: &str) -> String {
    use std::io::ErrorKind;
    match e.kind() {
        ErrorKind::PermissionDenied => format!("Permission denied: {path}"),
        ErrorKind::NotFound => format!("No such file or directory: {path}"),
        _ => format!("{}: {path}", e),
    }
}

/// Extracts an archive in-process into `dest` (overwrite always, no
/// password prompt). An empty `files` list extracts everything; otherwise
/// only those in-archive paths (a chosen folder matches everything under
/// it). `dest` is created with parents; io failures map to the
/// permission/missing contract above. Empty match → the noop error.
#[tauri::command]
async fn extract_archive(
    path: String,
    dest: String,
    files: Vec<String>,
    password: Option<String>,
) -> Result<String, String> {
    if let Err(e) = std::fs::metadata(&path) {
        return Err(map_fs_error(e, &path));
    }
    if let Err(e) = std::fs::create_dir_all(&dest) {
        return Err(map_fs_error(e, &dest));
    }
    let owned_path = path.clone();
    let owned_dest = dest.clone();
    let owned_pw = password.clone();
    let selective = !files.is_empty();
    let written = tokio::task::spawn_blocking(move || {
        crate::sevenzip::extract_ffi(&owned_path, &owned_dest, &files, owned_pw.as_deref())
    })
    .await
    .map_err(|e| format!("extraction task failed: {e}"))??;
    if written == 0 && selective {
        return Err("No files to process — nothing matched the selection.".to_string());
    }
    Ok(format!("Extracted {written} files"))
}

/// Starts a native window drag (used by the custom header strip).
#[tauri::command]
fn drag_window(window: tauri::Window) {
    let _ = window.start_dragging();
}

/// Tests an archive's integrity in-process (decode everything, write
/// nothing). Whole-percent progress streams over `on_progress`; success
/// returns the `Everything is Ok` marker, anything else (bad CRC, wrong
/// password, missing archive) becomes the error.
///
/// NOTE: `#[tauri::command]` camelCases argument names on the IPC boundary
/// by default, so the frontend sends `onProgress` (not `on_progress`).
#[tauri::command]
async fn test_archive(
    path: String,
    password: Option<String>,
    on_progress: tauri::ipc::Channel<u32>,
) -> Result<String, String> {
    if let Err(e) = std::fs::metadata(&path) {
        return Err(map_fs_error(e, &path));
    }
    let owned_path = path.clone();
    let owned_pw = password.clone();
    let progress = on_progress.clone();
    tokio::task::spawn_blocking(move || {
        let mut last = 0u32;
        crate::sevenzip::test_ffi(&owned_path, owned_pw.as_deref(), &mut |pct| {
            if pct != last {
                last = pct;
                let _ = progress.send(pct);
            }
        })
    })
    .await
    .map_err(|e| format!("test task failed: {e}"))??;
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

/// Cancels an in-flight [`list_archive`]/[`info_archive`]. The open flow
/// keeps the previous listing; the command surfaces the cancellation as
/// its error, which the frontend ignores when it initiated the cancel.
#[tauri::command]
fn cancel_list_archive() {
    LIST_CANCEL.store(true, Ordering::SeqCst);
}

/// Cancels an in-flight [`checksum_file`]. The dialog stays open; the
/// command surfaces the cancellation as its error.
#[tauri::command]
fn cancel_checksum() {
    CHECKSUM_CANCEL.store(true, Ordering::SeqCst);
}

/// Reports whether a filesystem path already exists (one `metadata` call).
/// Backs the extract dialog's subfolder uniqueness check: `dest/<name>`
/// must not exist, so extraction never merges into a colliding folder.
#[tauri::command]
fn path_exists(path: String) -> bool {
    std::fs::metadata(&path).is_ok()
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Frosted window background, macOS only. Native Liquid Glass
/// (`NSGlassEffectView`, Sidebar style) behind the transparent webview;
/// the CSS `--qz-frame-bg` tint lays over it. Idempotent (clears first)
/// so re-application never stacks glass views. Falls back to the
/// `NSVisualEffectView` WindowBackground standard material on macOS <26.
/// Best-effort throughout: failures log to stderr and the CSS tint
/// still renders.
#[cfg(target_os = "macos")]
fn apply_window_glass(window: &tauri::WebviewWindow) {
    let _ = window_vibrancy::clear_liquid_glass(window);
    let glass =
        window_vibrancy::LiquidGlassOptions::new(window_vibrancy::NSGlassEffectViewStyle::Sidebar)
            // Radius 0 on purpose: the native decorated window owns the
            // corner shape and clips content to it. A non-zero radius draws
            // the glass's own highlight ring inside the window rounding —
            // a visible double-corner seam at all four corners.
            .radius(0.0)
            .opaque(false)
            .interactive(true);
    if let Err(e) = window_vibrancy::apply_liquid_glass(window, glass) {
        eprintln!("[quarkzip] liquid glass unavailable ({e}); trying vibrancy");
        if let Err(e2) = window_vibrancy::apply_vibrancy(
            window,
            window_vibrancy::NSVisualEffectMaterial::WindowBackground,
            None,
            None,
        ) {
            eprintln!("[quarkzip] vibrancy unavailable: {e2}");
        }
    }
}

/// Toggles the frosted window background (macOS only; no-op elsewhere).
/// Backs the future appearance control in settings. [`apply_window_glass`]
/// is the enable path; disable clears the glass and restores the plain
/// translucent frame.
#[tauri::command]
fn set_liquid_glass(window: tauri::WebviewWindow, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if enabled {
            apply_window_glass(&window);
            Ok(())
        } else {
            window_vibrancy::clear_liquid_glass(&window)
                .map(|_| ())
                .map_err(|e| e.to_string())
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, enabled);
        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ListingState::default())
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
                    // Glass first (main thread here), then re-asserted after
                    // the deferred overlay-style change below: the style-mask
                    // rewrite can disturb inserted AppKit views, and the
                    // helper is idempotent (clears before applying).
                    apply_window_glass(&window);
                    let _ = window.set_decorations(true);
                    let deferred = window.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(500));
                        let style =
                            deferred.set_title_bar_style(tauri::utils::TitleBarStyle::Overlay);
                        eprintln!("[quarkzip] overlay style applied: {style:?}");
                        let shown = deferred.show();
                        eprintln!("[quarkzip] window shown: {shown:?}");
                        let glass = deferred.clone();
                        let _ = deferred.run_on_main_thread(move || apply_window_glass(&glass));
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
            get_children,
            info_archive,
            cancel_list_archive,
            extract_archive,
            test_archive,
            checksum_file,
            cancel_checksum,
            path_exists,
            set_liquid_glass
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_report_existing_and_missing_paths() {
        // The live file is taken; a unique sibling is free (process id +
        // nanos make collisions across parallel runs implausible).
        let taken = std::env::current_exe().expect("test binary path");
        assert!(path_exists(taken.to_string_lossy().into_owned()));
        let free = std::env::temp_dir().join(format!(
            "quarkzip-probe-{}-{}.zip",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        assert!(!free.exists());
        assert!(!path_exists(free.to_string_lossy().into_owned()));
    }
}
