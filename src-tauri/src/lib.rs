// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod archive;
pub mod checksum;
pub mod sevenzip;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

/// Bounds for sidecar execution. A hung 7zz — notably a macOS Gatekeeper
/// block on the unsigned binary, which never exits — must surface as an
/// error, never an infinite "Reading…"/"Extracting…" spinner.
/// Listing budget: measured 2026-10 — a 10M-entry `7zz l -slt` emits
/// ~3 GB in ~25 s, then parsing takes ~5 s release / ~48 s debug and the
/// 1 GB JSON response still has to cross IPC. 60 s killed real listings.
const LIST_TIMEOUT_SECS: u64 = 600;
const EXTRACT_TIMEOUT_SECS: u64 = 600;
const TEST_TIMEOUT_SECS: u64 = 600;

/// Long 7zz output is truncated for IPC: the frontend shows the tail.
const ERROR_TAIL_CHARS: usize = 4000;

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
    /// Last applied server sort (key + desc). A page request with the same
    /// pair skips re-sorting; anything else re-sorts in place first.
    sort: Option<(crate::archive::PageSortKey, bool)>,
}

/// P2: listings stay backend-held; only the total crosses IPC on open.
/// A 10M listing no longer materializes in the renderer (that peaked at
/// ~5GB and killed WebContent) — pages arrive via [`get_page`].
#[derive(serde::Serialize)]
struct ListingOpened {
    total: usize,
}

/// Listing progress snapshot streamed over a Channel while `7zz l -slt`
/// runs: raw stdout bytes collected plus entry blocks completed so far.
/// The total is unknowable upfront (`l` reports no percent — verified
/// against 7zz 26.03), so the frontend shows counters + an indeterminate
/// bar, never a fake ETA. `bytes` is None on the in-process path, which
/// has no stdout to measure.
#[derive(serde::Serialize, Clone)]
struct ListProgress {
    bytes: Option<u64>,
    entries: u64,
}

/// Runs the pinned 7zz sidecar with `args`, killing it on timeout.
/// Collects stdout/stderr the same line-wise way `Command::output` does.
/// Stdout chunks are additionally scanned for `NN%` progress (7zz `-bsp1`
/// separates updates with `\r` inside one chunk); `on_progress` fires only
/// when the max percent grows. `on_line` sees every stdout line (without
/// its newline) for streaming consumers; `cancel` is polled per event and
/// kills the child promptly with a cancellation error.
async fn run_sidecar_progress(
    app: &tauri::AppHandle,
    args: Vec<String>,
    timeout_secs: u64,
    mut on_progress: impl FnMut(u32) + Send,
    mut on_line: Option<&mut (dyn FnMut(&[u8]) + Send)>,
    cancel: Option<&'static AtomicBool>,
) -> Result<(Option<i32>, Vec<u8>, Vec<u8>), String> {
    use tauri_plugin_shell::process::CommandEvent;
    let (mut rx, child) = app
        .shell()
        .sidecar("binaries/7zz")
        .map_err(|e| e.to_string())?
        .args(args)
        .spawn()
        .map_err(|e| e.to_string())?;
    // Collect outcome: the event loop never touches `child`, so the kill
    // stays with the caller for timeouts and cooperative cancels alike.
    enum Collected {
        Done((Option<i32>, Vec<u8>, Vec<u8>)),
        Cancelled,
    }
    let collect = async {
        let mut code = None;
        let mut stdout = Vec::new();
        let mut stderr = Vec::new();
        let mut last_pct: u32 = 0;
        while let Some(event) = rx.recv().await {
            if cancel.is_some_and(|c| c.load(Ordering::SeqCst)) {
                return Collected::Cancelled;
            }
            match event {
                CommandEvent::Terminated(payload) => code = payload.code,
                CommandEvent::Stdout(line) => {
                    if let Some(hook) = on_line.as_mut() {
                        hook(&line);
                    }
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
        Collected::Done((code, stdout, stderr))
    };
    match tokio::time::timeout(std::time::Duration::from_secs(timeout_secs), collect).await {
        Ok(Collected::Done(done)) => Ok(done),
        Ok(Collected::Cancelled) => {
            let _ = child.kill();
            Err("Listing cancelled.".to_string())
        }
        Err(_) => {
            let _ = child.kill();
            Err(format!(
                "7zz did not respond within {timeout_secs}s and was killed. \
                Large archives can exceed this (listing millions of entries \
                takes minutes: emit + parse + transfer). On macOS a fast \
                failure usually means Gatekeeper blocked the unsigned \
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
    run_sidecar_progress(app, args, timeout_secs, |_| {}, None, None).await
}

/// Runs a `7zz l -slt` listing like [`run_sidecar`], additionally folding
/// every stdout line into an [`archive::ListCounter`] and forwarding
/// throttled [`ListProgress`] snapshots over `on_progress`. Abort mid-run
/// with [`cancel_list_archive`].
async fn run_listing(
    app: &tauri::AppHandle,
    args: Vec<String>,
    on_progress: &tauri::ipc::Channel<ListProgress>,
) -> Result<(Option<i32>, Vec<u8>, Vec<u8>), String> {
    let mut counter = archive::ListCounter::default();
    let mut last_send = std::time::Instant::now();
    let mut on_line = |line: &[u8]| {
        counter.push_line(line);
        if last_send.elapsed() >= std::time::Duration::from_millis(200) {
            last_send = std::time::Instant::now();
            let _ = on_progress.send(ListProgress {
                bytes: Some(counter.bytes()),
                entries: counter.entries(),
            });
        }
    };
    run_sidecar_progress(
        app,
        args,
        LIST_TIMEOUT_SECS,
        |_| {},
        Some(&mut on_line),
        Some(&LIST_CANCEL),
    )
    .await
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
/// Streaming [`ListProgress`] snapshots arrive over `on_progress` while the
/// listing runs (totals are unknowable upfront); abort with
/// [`cancel_list_archive`].
///
/// P2: returns only the entry total — rows arrive page by page through
/// [`get_page`], so the renderer never holds the full listing.
///
/// NOTE: like [`test_archive`], the frontend sends `onProgress` (Tauri
/// camelCases command args on IPC by default).
#[tauri::command]
async fn list_archive(
    app: tauri::AppHandle,
    state: tauri::State<'_, ListingState>,
    path: String,
    password: Option<String>,
    on_progress: tauri::ipc::Channel<ListProgress>,
) -> Result<ListingOpened, String> {
    LIST_CANCEL.store(false, Ordering::SeqCst);
    // P1: in-process engine first (unix), sidecar fallback on any engine
    // error. QUARKZIP_LIST_ENGINE=sidecar forces the legacy path.
    // Cancel never falls back: re-running a cancelled listing is wrong.
    #[cfg(qz_ffi)]
    let try_ffi = std::env::var("QUARKZIP_LIST_ENGINE").as_deref() != Ok("sidecar");
    #[cfg(not(qz_ffi))]
    let try_ffi = false;
    if try_ffi {
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
        match res {
            Ok(data) => {
                let total = data.facts.len();
                *state.current.lock().expect("listing state") = Some(StoredListing {
                    path: path.clone(),
                    header: data.header,
                    facts: data.facts,
                    sort: None,
                });
                return Ok(ListingOpened { total });
            }
            Err(e) if e == crate::sevenzip::CANCELLED => return Err(e),
            Err(e) => {
                eprintln!("[quarkzip] FFI listing failed ({e}), falling back to sidecar");
            }
        }
    }
    let (code, stdout, stderr) = run_listing(
        &app,
        archive::list_args(&path, password.as_deref()),
        &on_progress,
    )
    .await?;
    if code != Some(0) {
        return Err(String::from_utf8_lossy(&stderr).into_owned());
    }
    // Store for paging + info (no second 7zz run); only the total crosses.
    let (header, facts) = archive::parse_listing_parts(&String::from_utf8_lossy(&stdout));
    let total = facts.len();
    *state.current.lock().expect("listing state") = Some(StoredListing {
        path: path.clone(),
        header,
        facts,
        sort: None,
    });
    Ok(ListingOpened { total })
}

/// Serves one page of the stored listing, sorting server-side on demand.
/// `path` must match the open archive (a newer open replaces the store, so
/// a mismatched path means this request is stale). `page_size` is capped at
/// [`archive::MAX_PAGE_SIZE`]; `sort_dir` needs no `sort_key` to be absent —
/// a lone direction is ignored. Sorting 10M rows takes seconds in release;
/// the frontend disables paging controls while a page is in flight.
#[tauri::command]
async fn get_page(
    state: tauri::State<'_, ListingState>,
    path: String,
    page: usize,
    page_size: usize,
    sort_key: Option<String>,
    sort_dir: Option<String>,
) -> Result<archive::Page, String> {
    if page_size == 0 || page_size > archive::MAX_PAGE_SIZE {
        return Err(format!("page_size must be 1..={}", archive::MAX_PAGE_SIZE));
    }
    let key = match sort_key.as_deref() {
        None => None,
        Some(k) => {
            Some(archive::PageSortKey::parse(k).ok_or_else(|| format!("unknown sort key: {k}"))?)
        }
    };
    let desc = sort_dir.as_deref() == Some("desc");
    let mut store = state.current.lock().expect("listing state");
    let stored = store.as_mut().ok_or("no open archive")?;
    if stored.path != path {
        return Err("listing changed; page request is stale".to_string());
    }
    let want = key.map(|k| (k, desc));
    if want != stored.sort {
        if let Some((k, d)) = want {
            archive::sort_facts(&mut stored.facts, k, d);
        }
        // Clearing the sort restores enumerate order only on a fresh open;
        // within one listing, going back to "unsorted" keeps current order
        // (documented: the table never un-sorts mid-listing).
        stored.sort = want;
    }
    let total = stored.facts.len();
    let rows = archive::page_of(&stored.facts, page, page_size)
        .iter()
        .map(archive::entry_from_facts)
        .collect();
    Ok(archive::Page { rows, total })
}
#[tauri::command]
async fn info_archive(
    app: tauri::AppHandle,
    state: tauri::State<'_, ListingState>,
    path: String,
    password: Option<String>,
    on_progress: tauri::ipc::Channel<ListProgress>,
) -> Result<archive::ArchiveInfo, String> {
    // Fast path: summarize the stored in-process listing (no second 7zz
    // run). Path must match — a stale store belongs to another archive.
    // The sidecar path below stays for fallback opens.
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
    // No flag reset here: info runs second in the same open flow, so a
    // cancel landing between the two invokes must still abort it.
    // No flag reset here: info runs second in the same open flow, so a
    // cancel landing between the two invokes must still abort it.
    let (code, stdout, stderr) = run_listing(
        &app,
        archive::list_args(&path, password.as_deref()),
        &on_progress,
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
        None,
        None,
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
            get_page,
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
