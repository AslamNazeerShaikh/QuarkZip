//! Backend worker layer: the Tauri command logic (`src-tauri/src/lib.rs`)
//! re-expressed as threads + channels for egui. The engine itself
//! (`crate::archive`, `crate::sevenzip`) is shared by path — never forked.
//!
//! Contract mirrors the IPC one: listings stay backend-held (only totals
//! cross), children arrive in bounded chunks, password/permission markers
//! key the same dialogs.

use crate::{archive, sevenzip};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    mpsc::{channel, Receiver},
    Arc,
};
use std::thread;

// ——— error taxonomy (mirrors src/lib/password.ts + permissions.ts) ———

const PASSWORD_MARKERS: [&str; 5] = [
    "wrong password",
    "enter password",
    "cannot open encrypted archive",
    "headers error",
    "break signaled",
];

const PERMISSION_MARKERS: [&str; 5] = [
    "permission denied",
    "operation not permitted",
    "not permitted",
    "eacces",
    "eperm",
];

pub fn is_password_error(message: &str) -> bool {
    let lower = message.to_lowercase();
    PASSWORD_MARKERS.iter().any(|m| lower.contains(m))
}

pub fn is_permission_error(message: &str) -> bool {
    let lower = message.to_lowercase();
    PERMISSION_MARKERS.iter().any(|m| lower.contains(m))
}

pub fn map_fs_error(e: std::io::Error, path: &str) -> String {
    use std::io::ErrorKind;
    match e.kind() {
        ErrorKind::PermissionDenied => format!("Permission denied: {path}"),
        ErrorKind::NotFound => format!("No such file or directory: {path}"),
        _ => format!("{e}: {path}"),
    }
}

// ——— backend-held listing (mirrors ListingState/StoredListing) ———

pub struct ListingStore {
    pub path: String,
    pub header: std::collections::BTreeMap<String, String>,
    /// Shared with chunk workers: expanding a folder clones the `Arc`,
    /// never the 10M-entry vector.
    pub facts: Arc<Vec<archive::EntryFacts>>,
}

impl ListingStore {
    pub fn total(&self) -> usize {
        self.facts.len()
    }

    pub fn info(&self) -> archive::ArchiveInfo {
        let mut info = archive::summarize_archive_info(&self.header, &self.facts);
        if let Ok(meta) = std::fs::metadata(&self.path) {
            info.container_size = Some(meta.len());
            info.container_modified = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs());
        }
        info
    }
}

// ——— list worker ———

pub enum ListEvent {
    Progress(u64),
    Done(Result<ListingStore, String>),
}

pub struct ListHandle {
    pub rx: Receiver<ListEvent>,
    pub cancel: Arc<AtomicBool>,
}

pub fn spawn_list(path: String, password: Option<String>) -> ListHandle {
    let (tx, rx) = channel();
    let cancel = Arc::new(AtomicBool::new(false));
    let flag = cancel.clone();
    thread::spawn(move || {
        let tx_progress = tx.clone();
        let res = sevenzip::enumerate_detail(
            &path,
            password.as_deref(),
            &mut |n: u64| {
                let _ = tx_progress.send(ListEvent::Progress(n));
            },
            &flag,
        );
        let _ = tx.send(ListEvent::Done(res.map(|data| ListingStore {
            path,
            header: data.header,
            facts: Arc::new(data.facts),
        })));
    });
    ListHandle { rx, cancel }
}

// ——— extract worker ———

pub enum ExtractEvent {
    Done(Result<u64, String>),
}

pub fn spawn_extract(
    path: String,
    dest: String,
    files: Vec<String>,
    password: Option<String>,
) -> Receiver<ExtractEvent> {
    let (tx, rx) = channel();
    thread::spawn(move || {
        let res = (|| -> Result<u64, String> {
            if let Err(e) = std::fs::metadata(&path) {
                return Err(map_fs_error(e, &path));
            }
            if let Err(e) = std::fs::create_dir_all(&dest) {
                return Err(map_fs_error(e, &dest));
            }
            sevenzip::extract_ffi(&path, &dest, &files, password.as_deref())
        })();
        let _ = tx.send(ExtractEvent::Done(res));
    });
    rx
}

// ——— test worker ———

pub enum TestEvent {
    Pct(u32),
    Done(Result<(), String>),
}

pub fn spawn_test(path: String, password: Option<String>) -> Receiver<TestEvent> {
    let (tx, rx) = channel();
    thread::spawn(move || {
        if let Err(e) = std::fs::metadata(&path) {
            let _ = tx.send(TestEvent::Done(Err(map_fs_error(e, &path))));
            return;
        }
        let txp = tx.clone();
        let mut last = 0u32;
        let res = sevenzip::test_ffi(&path, password.as_deref(), &mut |pct| {
            if pct != last {
                last = pct;
                let _ = txp.send(TestEvent::Pct(pct));
            }
        });
        let _ = tx.send(TestEvent::Done(res));
    });
    rx
}

// ——— checksum worker (sync hashing on a thread; same digest crates) ———

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ChecksumAlgo {
    Md5,
    Sha1,
    Sha256,
    Sha512,
}

impl ChecksumAlgo {
    pub fn label(self) -> &'static str {
        match self {
            ChecksumAlgo::Md5 => "MD5",
            ChecksumAlgo::Sha1 => "SHA-1",
            ChecksumAlgo::Sha256 => "SHA-256",
            ChecksumAlgo::Sha512 => "SHA-512",
        }
    }
    pub fn all() -> [ChecksumAlgo; 4] {
        [
            ChecksumAlgo::Md5,
            ChecksumAlgo::Sha1,
            ChecksumAlgo::Sha256,
            ChecksumAlgo::Sha512,
        ]
    }
}

pub enum ChecksumEvent {
    Pct(u32),
    Done(Result<String, String>),
}

pub struct ChecksumHandle {
    pub rx: Receiver<ChecksumEvent>,
    pub cancel: Arc<AtomicBool>,
}

pub fn spawn_checksum(path: String, algo: ChecksumAlgo) -> ChecksumHandle {
    let (tx, rx) = channel();
    let cancel = Arc::new(AtomicBool::new(false));
    let flag = cancel.clone();
    thread::spawn(move || {
        let res = hash_file_sync(&path, algo, &flag, &mut |pct| {
            let _ = tx.send(ChecksumEvent::Pct(pct));
        });
        let _ = tx.send(ChecksumEvent::Done(res));
    });
    ChecksumHandle { rx, cancel }
}

/// Lowercase hex digest (mirrors `checksum::hex_of` upstream).
fn hex_of(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

fn hash_file_sync(
    path: &str,
    algo: ChecksumAlgo,
    cancel: &AtomicBool,
    on_progress: &mut dyn FnMut(u32),
) -> Result<String, String> {
    use digest::Digest;
    use std::io::Read;

    enum Hasher {
        Md5(md5::Md5),
        Sha1(sha1::Sha1),
        Sha256(sha2::Sha256),
        Sha512(sha2::Sha512),
    }
    macro_rules! feed {
        ($h:expr, $chunk:expr) => {{
            match $h {
                Hasher::Md5(h) => h.update($chunk),
                Hasher::Sha1(h) => h.update($chunk),
                Hasher::Sha256(h) => h.update($chunk),
                Hasher::Sha512(h) => h.update($chunk),
            }
        }};
    }
    macro_rules! finish {
        ($h:expr) => {{
            let bytes = match $h {
                Hasher::Md5(h) => h.finalize().to_vec(),
                Hasher::Sha1(h) => h.finalize().to_vec(),
                Hasher::Sha256(h) => h.finalize().to_vec(),
                Hasher::Sha512(h) => h.finalize().to_vec(),
            };
            hex_of(&bytes)
        }};
    }

    let mut file = std::fs::File::open(path).map_err(|e| map_fs_error(e, path))?;
    let total = file.metadata().map(|m| m.len()).unwrap_or(0);
    let mut hasher = match algo {
        ChecksumAlgo::Md5 => Hasher::Md5(md5::Md5::new()),
        ChecksumAlgo::Sha1 => Hasher::Sha1(sha1::Sha1::new()),
        ChecksumAlgo::Sha256 => Hasher::Sha256(sha2::Sha256::new()),
        ChecksumAlgo::Sha512 => Hasher::Sha512(sha2::Sha512::new()),
    };
    let mut buf = vec![0u8; 1024 * 1024];
    let mut read: u64 = 0;
    let mut last = 0u32;
    loop {
        if cancel.load(Ordering::SeqCst) {
            return Err("cancelled".to_string());
        }
        let n = file.read(&mut buf).map_err(|e| map_fs_error(e, path))?;
        if n == 0 {
            break;
        }
        feed!(&mut hasher, &buf[..n]);
        read += n as u64;
        if total > 0 {
            let pct = ((read * 100) / total).min(100) as u32;
            if pct != last {
                last = pct;
                on_progress(pct);
            }
        }
    }
    Ok(finish!(hasher))
}

// ——— desktop integration ———

pub const ARCHIVE_FILTERS: [&str; 14] = [
    "7z", "zip", "tar", "gz", "tgz", "bz2", "xz", "zst", "rar", "wim", "iso", "cab", "dmg", "lzma",
];

pub fn pick_archive() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("Archives", &ARCHIVE_FILTERS)
        .pick_file()
        .map(|p| p.to_string_lossy().into_owned())
}

pub fn pick_folder() -> Option<String> {
    rfd::FileDialog::new()
        .pick_folder()
        .map(|p| p.to_string_lossy().into_owned())
}

pub fn default_dest(archive_path: &str) -> String {
    std::path::Path::new(archive_path)
        .parent()
        .map(|p| p.to_string_lossy().into_owned())
        .filter(|s| !s.is_empty())
        .unwrap_or_default()
}

/// Reveal in Finder (the webview-era bridge; `open -R` selects the item).
pub fn reveal_in_dir(path: &str) {
    let _ = std::process::Command::new("open")
        .arg("-R")
        .arg(path)
        .spawn();
}

pub fn open_privacy_settings() {
    let _ = std::process::Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles")
        .spawn();
}

pub struct AppInfo {
    pub version: &'static str,
    pub release_date: &'static str,
    pub commit_id: &'static str,
    pub os: String,
    pub arch: String,
}

pub fn app_info() -> AppInfo {
    fn friendly_os(raw: &str) -> String {
        match raw {
            "macos" => "macOS".to_string(),
            "windows" => "Windows".to_string(),
            "linux" => "Linux".to_string(),
            _ => {
                if raw.is_empty() {
                    "unknown".to_string()
                } else {
                    raw.to_string()
                }
            }
        }
    }
    fn friendly_arch(raw: &str) -> String {
        match raw {
            "aarch64" => "Arm64 (aarch64)".to_string(),
            "x86_64" => "x64 (x86_64)".to_string(),
            "x86" => "x86 (x86)".to_string(),
            "arm" => "Arm (arm)".to_string(),
            _ => {
                if raw.is_empty() {
                    "unknown".to_string()
                } else {
                    raw.to_string()
                }
            }
        }
    }
    AppInfo {
        version: env!("CARGO_PKG_VERSION"),
        release_date: option_env!("QZ_RELEASE_DATE").unwrap_or("—"),
        commit_id: option_env!("QZ_COMMIT_ID").unwrap_or("dev"),
        os: friendly_os(std::env::consts::OS),
        arch: friendly_arch(std::env::consts::ARCH),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_route_engine_errors_to_dialogs() {
        assert!(is_password_error("Wrong password (exit 2)"));
        assert!(is_password_error("Enter password: Break signaled"));
        assert!(!is_password_error("Permission denied: /x"));
        assert!(is_permission_error("Permission denied: /x"));
        assert!(is_permission_error("Operation not permitted"));
        assert!(!is_permission_error("No such file or directory: /x"));
    }

    #[test]
    fn should_map_fs_errors() {
        let denied = map_fs_error(
            std::io::Error::new(std::io::ErrorKind::PermissionDenied, "x"),
            "/p",
        );
        assert!(is_permission_error(&denied));
    }
}
