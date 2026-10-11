//! Native build: compiles the vendored 7-Zip sources + the shared FFI
//! bridge (both live in `src-tauri/`, reused by path — never duplicated)
//! into a static lib and emits the `qz_ffi` cfg. Mirrors
//! `src-tauri/build.rs::build_7zip_ffi` (same object set, same whole-archive
//! link); only the paths differ.

fn main() {
    println!("cargo::rustc-check-cfg=cfg(qz_ffi)");
    build_7zip_ffi();
}

#[allow(clippy::unwrap_used)]
fn build_7zip_ffi() {
    let target = std::env::var("TARGET").expect("TARGET is set by cargo");
    if !target.contains("apple") && !target.contains("linux") {
        return;
    }
    let manifest = std::env::var("CARGO_MANIFEST_DIR").expect("manifest dir");
    let root = std::path::PathBuf::from(&manifest);
    // Repo-root vendor tree; the bridge lives next to the Tauri backend.
    let vendor = root.join("../vendor/7zip");
    let ffi = root.join("../src-tauri/ffi");
    if !vendor.join("CPP/7zip/UI/Console/List.cpp").is_file() {
        println!("cargo:warning=7-Zip sources missing: FFI engine disabled");
        return;
    }
    println!("cargo:rerun-if-changed=../src-tauri/ffi/bridge.cpp");
    println!("cargo:rerun-if-changed=../src-tauri/ffi/bridge.h");
    println!("cargo:rerun-if-changed=../src-tauri/ffi/guids.cpp");
    println!("cargo:rerun-if-changed=../vendor/7zip");

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
    collect_sources(&vendor.join("C"), false, &mut files);
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
    files.push(ffi.join("bridge.cpp"));
    files.push(ffi.join("guids.cpp"));

    files.retain(|p| !p.ends_with("Archive/ArchiveExports.cpp"));
    files.retain(|p| {
        !p.file_name()
            .and_then(|n| n.to_str())
            .is_some_and(|n| n.starts_with("DllExports"))
    });
    files.retain(|p| p.file_name().is_none_or(|n| n != "StdAfx.cpp"));
    files.sort();

    let mut build = cc::Build::new();
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
    println!("cargo:rustc-link-lib=c++");
    println!("cargo:rustc-cfg=qz_ffi");
}

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
