//! End-to-end parser check against REAL 7zz output.
//!
//! Packs a fixture tree with the pinned sidecar binary, lists it back with
//! `7zz l -slt`, and asserts [`quarkzip_lib::archive::parse_list_slt`]
//! reads every entry. This is what keeps the parser honest when the 7zz pin
//! bumps: hand-written sample strings in unit tests cannot drift from the
//! real format without this test failing.
//!
//! Runs against the sidecar matching the host triple in
//! `src-tauri/binaries/` (dev-machine only; CI must fetch sidecars first
//! via `scripts/fetch-7zz.sh`).

use std::path::PathBuf;
use std::process::Command;

fn sidecar() -> PathBuf {
    let triple = if cfg!(target_os = "macos") {
        if cfg!(target_arch = "aarch64") {
            "aarch64-apple-darwin"
        } else {
            "x86_64-apple-darwin"
        }
    } else if cfg!(target_os = "windows") {
        if cfg!(target_arch = "aarch64") {
            "aarch64-pc-windows-msvc.exe"
        } else {
            "x86_64-pc-windows-msvc.exe"
        }
    } else if cfg!(target_arch = "aarch64") {
        "aarch64-unknown-linux-gnu"
    } else {
        "x86_64-unknown-linux-gnu"
    };
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("binaries")
        .join(format!("7zz-{triple}"))
}

fn run(bin: &std::path::Path, args: &[&str], cwd: &std::path::Path) -> String {
    let out = Command::new(bin)
        .args(args)
        .current_dir(cwd)
        .output()
        .expect("sidecar runs");
    assert!(
        out.status.success(),
        "7zz {} failed: {}",
        args.join(" "),
        String::from_utf8_lossy(&out.stderr)
    );
    String::from_utf8(out.stdout).expect("7zz output is utf-8")
}

#[test]
fn should_parse_every_entry_of_real_7z_listing() {
    let bin = sidecar();
    assert!(bin.is_file(), "fetch sidecars first: {}", bin.display());

    let work = std::env::temp_dir().join(format!("quarkzip-e2e-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&work);
    let src = work.join("src");
    std::fs::create_dir_all(src.join("pics")).unwrap();
    std::fs::write(src.join("notes.txt"), "hello quarkzip").unwrap();
    // Names that break naive parsers: spaces, ` = `, unicode.
    std::fs::write(src.join("pics/a = b.png"), "fake-png").unwrap();
    std::fs::write(src.join("pics/café.txt"), "unicode").unwrap();

    let archive = work.join("fixture.7z");
    run(
        &bin,
        &["a", archive.to_str().unwrap(), "notes.txt", "pics"],
        &src,
    );

    let slt = run(&bin, &["l", "-slt", archive.to_str().unwrap()], &src);
    let entries = quarkzip_lib::archive::parse_list_slt(&slt);
    let paths: Vec<&str> = entries.iter().map(|e| e.path.as_str()).collect();

    for expected in ["notes.txt", "pics", "pics/a = b.png", "pics/café.txt"] {
        assert!(paths.contains(&expected), "missing {expected} in {paths:?}");
    }
    let notes = entries.iter().find(|e| e.path == "notes.txt").unwrap();
    assert_eq!(notes.size, Some(14));
    assert!(!notes.is_folder);

    let _ = std::fs::remove_dir_all(&work);
}

#[test]
fn should_mark_only_directories_as_folders() {
    let bin = sidecar();
    assert!(bin.is_file(), "fetch sidecars first: {}", bin.display());

    let work = std::env::temp_dir().join(format!("quarkzip-e2e-dir-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&work);
    let src = work.join("src");
    std::fs::create_dir_all(src.join("sub")).unwrap();
    std::fs::write(src.join("empty.txt"), "").unwrap();
    std::fs::write(src.join("full.txt"), "hi").unwrap();

    let archive = work.join("dirs.7z");
    run(
        &bin,
        &[
            "a",
            archive.to_str().unwrap(),
            "sub",
            "empty.txt",
            "full.txt",
        ],
        &src,
    );

    let slt = run(&bin, &["l", "-slt", archive.to_str().unwrap()], &src);
    let entries = quarkzip_lib::archive::parse_list_slt(&slt);
    let flag = |name: &str| entries.iter().find(|e| e.path == name).unwrap().is_folder;
    assert!(flag("sub"), "directory must be folder");
    assert!(!flag("empty.txt"), "0-byte file must NOT be folder");
    assert!(!flag("full.txt"), "file must NOT be folder");

    let _ = std::fs::remove_dir_all(&work);
}
