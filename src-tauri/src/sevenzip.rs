//! In-process 7-Zip engine (list / extract / test, no sidecar).
//!
//! The `qz_ffi` cfg is emitted by build.rs when the vendored sources
//! compile on macOS/Linux. Other targets report so explicitly instead of
//! falling back anywhere: there is no legacy path anymore.
//!
//! Threading: one operation per thread, never shared (matches the engine's
//! per-handle model). Callers run blocking engine calls inside
//! `spawn_blocking`, never on async workers.

use std::sync::atomic::AtomicBool;

/// Error text for user-cancelled listings. Cancel never retries: the
/// caller surfaces it as-is.
pub const CANCELLED: &str = "Listing cancelled.";

#[cfg(qz_ffi)]
mod ffi {
    use std::ffi::{c_char, c_int};

    #[repr(C)]
    pub struct QzList {
        _private: [u8; 0],
    }

    pub type QzProgressCb =
        Option<unsafe extern "C" fn(ctx: *mut std::ffi::c_void, done: u64, total: u64)>;

    extern "C" {
        pub fn qz_list_open(
            path: *const c_char,
            password: *const c_char,
            count: *mut u64,
            errbuf: *mut c_char,
            errlen: usize,
        ) -> *mut QzList;
        #[allow(clippy::too_many_arguments)]
        pub fn qz_list_entry(
            list: *const QzList,
            index: u64,
            path_out: *mut *mut c_char,
            size_out: *mut u64,
            size_defined: *mut c_int,
            modified_out: *mut *mut c_char,
            is_dir_out: *mut c_int,
            packed_out: *mut u64,
            packed_defined: *mut c_int,
            method_out: *mut *mut c_char,
            encrypted_out: *mut c_int,
            host_os_out: *mut *mut c_char,
        ) -> c_int;
        pub fn qz_archive_prop_count(list: *const QzList, n_out: *mut u64) -> c_int;
        pub fn qz_archive_prop(
            list: *const QzList,
            index: u64,
            key_out: *mut *mut c_char,
            val_out: *mut *mut c_char,
        ) -> c_int;
        pub fn qz_list_close(list: *mut QzList);
        pub fn qz_string_free(s: *mut c_char);
        pub fn qz_extract(
            archive: *const c_char,
            password: *const c_char,
            dest: *const c_char,
            sel_paths: *const *const c_char,
            sel_count: usize,
            files_out: *mut u64,
            errbuf: *mut c_char,
            errlen: usize,
        ) -> c_int;
        pub fn qz_test(
            archive: *const c_char,
            password: *const c_char,
            progress: QzProgressCb,
            progress_ctx: *mut std::ffi::c_void,
            errbuf: *mut c_char,
            errlen: usize,
        ) -> c_int;
    }
}

/// Full in-process enumeration: display entries plus summary facts plus
/// the container header snapshot. `on_progress` receives completed entry
/// counts (callers throttle Channel sends); `cancel` is polled with it, so
/// worst-case latency is one progress interval, not one listing.
#[cfg(qz_ffi)]
pub struct ListingData {
    pub entries: Vec<crate::archive::ArchiveEntry>,
    pub facts: Vec<crate::archive::EntryFacts>,
    pub header: std::collections::BTreeMap<String, String>,
}

/// Take a malloc'd bridge string (NULL when absent), lossy like the text path.
#[cfg(qz_ffi)]
unsafe fn take_string(ptr: *mut std::ffi::c_char) -> Option<String> {
    if ptr.is_null() {
        return None;
    }
    // SAFETY: bridge guarantees malloc'd NUL-terminated strings.
    let s = unsafe { std::ffi::CStr::from_ptr(ptr) }
        .to_string_lossy()
        .into_owned();
    unsafe { ffi::qz_string_free(ptr) };
    Some(s)
}

#[cfg(qz_ffi)]
pub fn enumerate_detail(
    path: &str,
    password: Option<&str>,
    on_progress: &mut dyn FnMut(u64),
    cancel: &AtomicBool,
) -> Result<ListingData, String> {
    use std::ffi::CString;
    use std::sync::atomic::Ordering;

    let cpath = CString::new(path).map_err(|_| "Archive path contains NUL".to_string())?;
    let cpw: Option<CString> = password
        .filter(|p| !p.is_empty())
        .map(CString::new)
        .transpose()
        .map_err(|_| "Password contains NUL".to_string())?;
    let mut errbuf = [0 as std::ffi::c_char; 512];
    let mut count = 0u64;
    let handle = unsafe {
        ffi::qz_list_open(
            cpath.as_ptr(),
            cpw.as_ref().map_or(std::ptr::null(), |p| p.as_ptr()),
            &mut count,
            errbuf.as_mut_ptr(),
            errbuf.len(),
        )
    };
    if handle.is_null() {
        let msg = unsafe { std::ffi::CStr::from_ptr(errbuf.as_ptr()) }.to_string_lossy();
        return Err(if msg.is_empty() {
            "Cannot open archive".to_string()
        } else {
            msg.into_owned()
        });
    }
    struct Guard(*mut ffi::QzList);
    impl Drop for Guard {
        fn drop(&mut self) {
            unsafe { ffi::qz_list_close(self.0) };
        }
    }
    let _guard = Guard(handle);

    // Header snapshot (Type, Physical Size, archive props).
    let mut header = std::collections::BTreeMap::new();
    let mut prop_count = 0u64;
    // SAFETY: handle valid; snapshot filled at open.
    if unsafe { ffi::qz_archive_prop_count(handle, &mut prop_count) } == 0 {
        for j in 0..prop_count {
            let mut key: *mut std::ffi::c_char = std::ptr::null_mut();
            let mut val: *mut std::ffi::c_char = std::ptr::null_mut();
            // SAFETY: out-pointers are ours.
            let rc = unsafe { ffi::qz_archive_prop(handle, j, &mut key, &mut val) };
            if rc != 0 {
                continue;
            }
            // SAFETY: bridge guarantees malloc'd strings on success.
            if let (Some(k), Some(v)) = unsafe { (take_string(key), take_string(val)) } {
                // Empty values never survive (bridge omits them like -slt).
                if !v.is_empty() {
                    header.insert(k, v);
                }
            }
        }
    }

    // Exact capacity: the count is known, growth reallocs would copy ~GBs.
    let n = usize::try_from(count).unwrap_or(usize::MAX);
    let mut entries = Vec::with_capacity(n);
    let mut facts = Vec::with_capacity(n);
    for index in 0..count {
        if index % 1000 == 0 {
            if cancel.load(Ordering::SeqCst) {
                return Err(CANCELLED.to_string());
            }
            on_progress(index);
        }
        let mut path_out: *mut std::ffi::c_char = std::ptr::null_mut();
        let mut size_out = 0u64;
        let mut size_defined = 0 as std::ffi::c_int;
        let mut modified_out: *mut std::ffi::c_char = std::ptr::null_mut();
        let mut is_dir_out = 0 as std::ffi::c_int;
        let mut packed_out = 0u64;
        let mut packed_defined = 0 as std::ffi::c_int;
        let mut method_out: *mut std::ffi::c_char = std::ptr::null_mut();
        let mut encrypted_out = 0 as std::ffi::c_int;
        let mut host_os_out: *mut std::ffi::c_char = std::ptr::null_mut();
        // SAFETY: handle is valid for this scope; out-pointers are ours.
        let rc = unsafe {
            ffi::qz_list_entry(
                handle,
                index,
                &mut path_out,
                &mut size_out,
                &mut size_defined,
                &mut modified_out,
                &mut is_dir_out,
                &mut packed_out,
                &mut packed_defined,
                &mut method_out,
                &mut encrypted_out,
                &mut host_os_out,
            )
        };
        if rc != 0 || path_out.is_null() {
            return Err(format!("Cannot read entry {index}"));
        }
        // SAFETY: bridge guarantees malloc'd NUL-terminated strings.
        let path = unsafe { take_string(path_out) }.unwrap_or_default();
        let modified = unsafe { take_string(modified_out) };
        let method = unsafe { take_string(method_out) };
        let host_os = unsafe { take_string(host_os_out) };
        let is_folder = is_dir_out != 0;
        entries.push(crate::archive::ArchiveEntry {
            path: path.clone(),
            size: if size_defined != 0 {
                Some(size_out)
            } else {
                None
            },
            modified: modified.clone(),
            is_folder,
            index: entries.len(),
        });
        facts.push(crate::archive::EntryFacts {
            path,
            size: if size_defined != 0 {
                Some(size_out)
            } else {
                None
            },
            packed_size: if packed_defined != 0 {
                Some(packed_out)
            } else {
                None
            },
            method,
            encrypted: encrypted_out != 0,
            host_os,
            modified,
            is_folder,
        });
    }
    Ok(ListingData {
        entries,
        facts,
        header,
    })
}

/// In-process extraction (`7zz x -o<dest> -y` semantics, no sidecar):
/// `files` holds exact in-archive paths (empty = everything; a chosen
/// folder also matches everything under it). `dest` is created with
/// parents by the caller (lib.rs maps those io errors); the engine also
/// creates nested dirs. Returns files written. Errors mirror the sidecar
/// contract: password markers for the gate, per-file engine failures,
/// errno-mapped filesystem failures for the permission dialog.
#[cfg(qz_ffi)]
pub fn extract_ffi(
    path: &str,
    dest: &str,
    files: &[String],
    password: Option<&str>,
) -> Result<u64, String> {
    use std::ffi::CString;

    let cpath = CString::new(path).map_err(|_| "Archive path contains NUL".to_string())?;
    let cpw: Option<CString> = password
        .filter(|p| !p.is_empty())
        .map(CString::new)
        .transpose()
        .map_err(|_| "Password contains NUL".to_string())?;
    let cdest = CString::new(dest).map_err(|_| "Destination path contains NUL".to_string())?;
    let cfiles: Vec<CString> = files
        .iter()
        .map(|f| CString::new(f.as_str()))
        .collect::<Result<_, _>>()
        .map_err(|_| "Entry path contains NUL".to_string())?;
    let ptrs: Vec<*const std::ffi::c_char> = cfiles.iter().map(|s| s.as_ptr()).collect();
    let mut errbuf = [0 as std::ffi::c_char; 512];
    let mut written = 0u64;
    // SAFETY: all pointers borrow live CStrings for the call; the engine
    // copies what it needs synchronously and never retains them.
    let rc = unsafe {
        ffi::qz_extract(
            cpath.as_ptr(),
            cpw.as_ref().map_or(std::ptr::null(), |p| p.as_ptr()),
            cdest.as_ptr(),
            if ptrs.is_empty() {
                std::ptr::null()
            } else {
                ptrs.as_ptr()
            },
            ptrs.len(),
            &mut written,
            errbuf.as_mut_ptr(),
            errbuf.len(),
        )
    };
    if rc != 0 {
        let msg = unsafe { std::ffi::CStr::from_ptr(errbuf.as_ptr()) }.to_string_lossy();
        return Err(if msg.is_empty() {
            "Extraction failed".to_string()
        } else {
            msg.into_owned()
        });
    }
    Ok(written)
}

/// In-process integrity test (`7zz t` semantics, no sidecar): whole
/// archive, whole-percent progress. Success is silent like the console.
#[cfg(qz_ffi)]
pub fn test_ffi(
    path: &str,
    password: Option<&str>,
    on_progress: &mut dyn FnMut(u32),
) -> Result<(), String> {
    use std::ffi::CString;

    // Trampoline: the engine calls back on the calling (blocking) thread
    // with file counts; the closure lives on our stack for the call.
    unsafe extern "C" fn trampoline(ctx: *mut std::ffi::c_void, done: u64, total: u64) {
        if ctx.is_null() || total == 0 {
            return;
        }
        let pct = ((done.saturating_mul(100)) / total).min(100) as u32;
        // SAFETY: ctx is our live closure (set below, cleared after).
        let cb = unsafe { &mut *(ctx as *mut &mut dyn FnMut(u32)) };
        cb(pct);
    }

    let cpath = CString::new(path).map_err(|_| "Archive path contains NUL".to_string())?;
    let cpw: Option<CString> = password
        .filter(|p| !p.is_empty())
        .map(CString::new)
        .transpose()
        .map_err(|_| "Password contains NUL".to_string())?;
    let mut errbuf = [0 as std::ffi::c_char; 512];
    let mut cb: &mut dyn FnMut(u32) = on_progress;
    let ctx: *mut std::ffi::c_void = &mut cb as *mut &mut dyn FnMut(u32) as *mut std::ffi::c_void;
    // SAFETY: ctx borrows our stack closure; the engine invokes it
    // synchronously before returning and never retains it.
    let rc = unsafe {
        ffi::qz_test(
            cpath.as_ptr(),
            cpw.as_ref().map_or(std::ptr::null(), |p| p.as_ptr()),
            Some(trampoline),
            ctx,
            errbuf.as_mut_ptr(),
            errbuf.len(),
        )
    };
    if rc != 0 {
        let msg = unsafe { std::ffi::CStr::from_ptr(errbuf.as_ptr()) }.to_string_lossy();
        return Err(if msg.is_empty() {
            "Integrity test failed.".to_string()
        } else {
            msg.into_owned()
        });
    }
    Ok(())
}

/// Stub when the engine didn't compile (other targets, missing sources).
#[cfg(not(qz_ffi))]
pub struct ListingData {
    pub entries: Vec<crate::archive::ArchiveEntry>,
    pub facts: Vec<crate::archive::EntryFacts>,
    pub header: std::collections::BTreeMap<String, String>,
}

/// Stub when the engine didn't compile (other targets, missing sources).
#[cfg(not(qz_ffi))]
pub fn extract_ffi(
    _path: &str,
    _dest: &str,
    _files: &[String],
    _password: Option<&str>,
) -> Result<u64, String> {
    Err("In-process engine not built for this target".to_string())
}

/// Stub when the engine didn't compile (other targets, missing sources).
#[cfg(not(qz_ffi))]
pub fn test_ffi(
    _path: &str,
    _password: Option<&str>,
    _on_progress: &mut dyn FnMut(u32),
) -> Result<(), String> {
    Err("In-process engine not built for this target".to_string())
}

/// Stub when the engine didn't compile (other targets, missing sources).
#[cfg(not(qz_ffi))]
pub fn enumerate_detail(
    _path: &str,
    _password: Option<&str>,
    _on_progress: &mut dyn FnMut(u64),
    _cancel: &AtomicBool,
) -> Result<ListingData, String> {
    Err("In-process engine not built (run scripts/fetch-7z-src.sh)".to_string())
}
