fn main() {
    tauri_build::build();
    copy_sidecar_for_dev();
    // Custom cfg for the in-process 7-Zip engine (declared always so
    // check-cfg stays quiet on targets without it).
    println!("cargo::rustc-check-cfg=cfg(qz_ffi)");
    build_7zip_ffi();
}

/// `tauri dev` resolves `sidecar("binaries/7zz")` to
/// `<exe-dir>/binaries/7zz`, but the triple-suffixed sources live in
/// `src-tauri/binaries/`. The release bundler renames them on copy, so only
/// debug builds need this staging step.
#[allow(clippy::unwrap_used)]
fn copy_sidecar_for_dev() {
    if std::env::var("PROFILE").as_deref() != Ok("debug") {
        return;
    }
    let target = std::env::var("TARGET").expect("TARGET is set by cargo");
    let manifest = std::env::var("CARGO_MANIFEST_DIR").expect("manifest dir");
    let mut src = std::path::PathBuf::from(&manifest);
    src.push("binaries");
    src.push(format!("7zz-{target}"));
    if target.contains("windows") {
        src.set_extension("exe");
    }
    // OUT_DIR = target/debug/build/<pkg>-<hash>/out → exe dir is 3 levels up.
    let out = std::path::PathBuf::from(std::env::var("OUT_DIR").expect("OUT_DIR"));
    let exe_dir = out
        .ancestors()
        .nth(3)
        .expect("exe dir above OUT_DIR")
        .to_path_buf();
    let dest_dir = exe_dir.join("binaries");
    std::fs::create_dir_all(&dest_dir).expect("create dev binaries dir");
    let dest = dest_dir.join(if target.contains("windows") {
        "7zz.exe"
    } else {
        "7zz"
    });
    println!("cargo:rerun-if-changed=binaries/");
    if src.is_file() {
        std::fs::copy(&src, &dest).expect("stage dev sidecar");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&dest).expect("meta").permissions();
            perms.set_mode(0o755);
            std::fs::set_permissions(&dest, perms).expect("chmod");
        }
    } else {
        println!(
            "cargo:warning=dev sidecar missing (run scripts/fetch-7zz.sh): {}",
            src.display()
        );
    }
}

/// In-process 7-Zip engine (P1): compiles the vendored sources
/// (`scripts/fetch-7z-src.sh`) into a static lib on macOS/Linux and emits
/// the `qz_ffi` cfg. Other targets, and checkouts without sources, keep
/// the sidecar only (warning instead of failure).
///
/// Object set mirrors the upstream `Alone2` static console build minus its
/// CLI frontend: all archive handlers (static REGISTER_ARC registry via
/// LoadCodecs.cpp — ArchiveExports.cpp is DLL-only and must stay out),
/// codecs, crypto, common, Windows shims (explicit list; the rest of
/// CPP/Windows is GUI/Win32-only), C sources, the open machinery, and our
/// bridge. No ASM sources: the pure C fallbacks compile everywhere.
#[allow(clippy::unwrap_used)]
fn build_7zip_ffi() {
    let target = std::env::var("TARGET").expect("TARGET is set by cargo");
    if !target.contains("apple") && !target.contains("linux") {
        return;
    }
    let manifest = std::env::var("CARGO_MANIFEST_DIR").expect("manifest dir");
    let root = std::path::PathBuf::from(&manifest);
    // Sources live in the workspace-root vendor/ dir (repo convention,
    // like vendor/7zz-cache); fall back to a crate-local vendor/.
    let vendor = root.join("vendor/7zip");
    let vendor = if vendor.is_dir() {
        vendor
    } else {
        root.join("../vendor/7zip")
    };
    if !vendor.join("CPP/7zip/UI/Console/List.cpp").is_file() {
        println!("cargo:warning=7-Zip sources missing (run scripts/fetch-7z-src.sh): FFI engine disabled");
        return;
    }
    println!("cargo:rerun-if-changed=ffi/bridge.cpp");
    println!("cargo:rerun-if-changed=ffi/bridge.h");
    println!("cargo:rerun-if-changed=ffi/guids.cpp");
    println!("cargo:rerun-if-changed=vendor/7zip");

    let mut files: Vec<std::path::PathBuf> = Vec::new();
    for dir in [
        "CPP/7zip/Archive",
        "CPP/7zip/Compress",
        "CPP/7zip/Crypto",
        "CPP/7zip/Common",
        "CPP/Common",
    ] {
        collect_sources(&vendor.join(dir), true, &mut files);
    }
    // C sources, top level only (C/Util/* holds demo mains).
    collect_sources(&vendor.join("C"), false, &mut files);
    // Windows shims: explicit union of the Alone2 WIN_OBJS lists.
    // Everything else under CPP/Windows is GUI/Win32-only.
    // Synchronization.cpp provides the WFMO event emulation used by the
    // multithreaded update/decoder paths.
    for name in [
        "FileDir",
        "FileFind",
        "FileIO",
        "FileName",
        "PropVariant",
        "PropVariantConv",
        "PropVariantUtils",
        "System",
        "TimeUtils",
        "ErrorMsg",
        "FileLink",
        "SystemInfo",
        "Synchronization",
    ] {
        files.push(vendor.join(format!("CPP/Windows/{name}.cpp")));
    }
    // Open machinery (console frontend excluded). ArchiveExtractCallback
    // comes along only for IsSafePath (multivolume reopen guard used by
    // ArchiveOpenCallback) — reimplementing it would risk diverging the
    // zip-slip check, so compile the upstream file instead.
    for name in [
        "LoadCodecs",
        "OpenArchive",
        "DefaultName",
        "SetProperties",
        "ArchiveOpenCallback",
        "ArchiveExtractCallback",
        "ExtractingFilePath",
        "PropIDUtils",
    ] {
        files.push(vendor.join(format!("CPP/7zip/UI/Common/{name}.cpp")));
    }
    files.push(root.join("ffi/bridge.cpp"));
    files.push(root.join("ffi/guids.cpp"));

    // DLL-export registry (LoadCodecs.cpp provides the static one;
    // linking both duplicates RegisterArc).
    files.retain(|p| !p.ends_with("Archive/ArchiveExports.cpp"));
    // Windows-DLL entry points (HINSTANCE/DllMain); static builds exclude them.
    files.retain(|p| {
        !p.file_name()
            .and_then(|n| n.to_str())
            .is_some_and(|n| n.starts_with("DllExports"))
    });
    // StdAfx.cpp files are precompiled-header stubs; skip them.
    files.retain(|p| p.file_name().is_none_or(|n| n != "StdAfx.cpp"));
    files.sort();

    let mut build = cc::Build::new();
    // NOTE: no `.cpp(true)` — it would force the C files through the C++
    // compiler, where `struct CMtDec;` + `typedef struct CMtDec_ {...} CMtDec`
    // (legal C tag/typedef namespaces) becomes a redefinition error.
    // Let cc pick the compiler per extension: C++ for .cpp, C for .c.
    //
    // `.cargo_metadata(false)`: WE own all link directives below. In
    // particular the engine must link whole-archive: handler objects
    // contribute only static `CRegisterArc` initializers (no referenced
    // symbols), so a normal archive pull drops every format registrar and
    // all opens fail. Whole-archive keeps them.
    build
        .cargo_metadata(false)
        .opt_level(2)
        .debug(false)
        .pic(true)
        .warnings(false)
        .include(vendor.join("CPP"))
        .define("_FILE_OFFSET_BITS", "64")
        .define("_LARGEFILE_SOURCE", None)
        .define("_REENTRANT", None)
        .define("NDEBUG", None)
        .flag("-fPIC");
    for file in &files {
        build.file(file);
    }
    let out = std::path::PathBuf::from(std::env::var("OUT_DIR").expect("OUT_DIR"));
    build.out_dir(&out).compile("qz7zip");
    let lib = out.join("libqz7zip.a");
    if target.contains("apple") {
        println!("cargo:rustc-link-arg=-Wl,-force_load,{}", lib.display());
    } else {
        println!(
            "cargo:rustc-link-arg=-Wl,--whole-archive,{},--no-whole-archive",
            lib.display()
        );
    }
    // C++ standard library for the static engine (typeinfo, terminate…).
    println!("cargo:rustc-link-lib=c++");
    println!("cargo:rustc-cfg=qz_ffi");
}

/// Collects `.cpp`/`.c` files (skipping nothing here; filtering happens in
/// the caller). No new dependencies: plain `read_dir` recursion.
fn collect_sources(dir: &std::path::Path, recursive: bool, out: &mut Vec<std::path::PathBuf>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if recursive {
                collect_sources(&path, true, out);
            }
        } else if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            if ext == "cpp" || ext == "c" {
                out.push(path);
            }
        }
    }
}
