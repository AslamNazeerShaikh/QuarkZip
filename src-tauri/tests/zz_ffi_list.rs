//! A/B parity: the in-process engine must enumerate exactly what the
//! sidecar text path parses. Packs a nasty fixture (spaces, ` = `,
//! unicode, empty files, dirs) with the pinned sidecar, lists it both
//! ways, and asserts identical entry sets.
//!
//! Plus an ignored 10M benchmark (manual):
//!   QUARKZIP_BIG_ZIP=/path/to/files-10m.zip cargo test --release \
//!     --test zz_ffi_list -- --ignored --nocapture
//! Peak RSS: prefix with `/usr/bin/time -l`.
//!
//! Requires `qz_ffi` (unix + `scripts/fetch-7z-src.sh`); skipped otherwise.

use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::AtomicBool;

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

fn fixture_archive(work: &std::path::Path, name: &str, extra: &[&str]) -> PathBuf {
    let bin = sidecar();
    assert!(bin.is_file(), "fetch sidecars first: {}", bin.display());
    let src = work.join("src");
    std::fs::create_dir_all(src.join("pics")).unwrap();
    std::fs::write(src.join("notes.txt"), "hello quarkzip").unwrap();
    std::fs::write(src.join("pics/a = b.png"), "fake-png").unwrap();
    std::fs::write(src.join("pics/café.txt"), "unicode").unwrap();
    std::fs::write(src.join("empty.txt"), "").unwrap();
    let archive = work.join(name);
    let mut args: Vec<&str> = vec!["a"];
    args.extend_from_slice(extra);
    args.push(archive.to_str().unwrap());
    args.extend_from_slice(&["notes.txt", "pics", "empty.txt"]);
    run(&bin, &args, &src);
    archive
}

#[cfg(qz_ffi)]
fn enumerate(path: &std::path::Path) -> quarkzip_lib::sevenzip::ListingData {
    let cancel = AtomicBool::new(false);
    quarkzip_lib::sevenzip::enumerate_detail(path.to_str().unwrap(), None, &mut |_| {}, &cancel)
        .expect("FFI enumeration works")
}

#[cfg(qz_ffi)]
fn check_parity(work: &std::path::Path, archive: &std::path::Path, label: &str) {
    let bin = sidecar();
    let slt = run(&bin, &["l", "-slt", archive.to_str().unwrap()], work);
    let mut expected = quarkzip_lib::archive::parse_list_slt(&slt);
    let data = enumerate(&archive);
    let mut actual = data.entries;
    // Order is engine-defined on both paths; compare as sorted sets, then
    // field-for-field per path.
    expected.sort_by(|a, b| a.path.cmp(&b.path));
    actual.sort_by(|a, b| a.path.cmp(&b.path));
    assert_eq!(actual.len(), expected.len(), "{label}: entry count");
    for (a, e) in actual.iter().zip(expected.iter()) {
        assert_eq!(a.path, e.path, "{label}: path");
        assert_eq!(a.size, e.size, "{label}: size of {}", a.path);
        assert_eq!(a.modified, e.modified, "{label}: modified of {}", a.path);
        assert_eq!(a.is_folder, e.is_folder, "{label}: is_folder of {}", a.path);
    }
    // Same for the container summary (header snapshot + shared summarize).
    let expected_info = quarkzip_lib::archive::parse_archive_info(&slt);
    let actual_info = quarkzip_lib::archive::summarize_archive_info(&data.header, &data.facts);
    assert_eq!(actual_info, expected_info, "{label}: archive info");
}

#[test]
#[cfg(qz_ffi)]
fn should_match_sidecar_listing_entry_for_entry() {
    let work = std::env::temp_dir().join(format!("quarkzip-ffi-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&work);
    std::fs::create_dir_all(&work).unwrap();
    let archive = fixture_archive(&work, "fixture.zip", &["-tzip"]);
    check_parity(&work, &archive, "zip");
    let _ = std::fs::remove_dir_all(&work);
}

#[test]
#[cfg(qz_ffi)]
fn should_match_sidecar_listing_for_7z() {
    let work = std::env::temp_dir().join(format!("quarkzip-ffi7z-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&work);
    std::fs::create_dir_all(&work).unwrap();
    let archive = fixture_archive(&work, "fixture.7z", &["-t7z"]);
    check_parity(&work, &archive, "7z");
    let _ = std::fs::remove_dir_all(&work);
}

#[test]
#[cfg(qz_ffi)]
fn should_match_sidecar_listing_for_tar_gz() {
    let work = std::env::temp_dir().join(format!("quarkzip-ffitar-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&work);
    std::fs::create_dir_all(&work).unwrap();
    let src = work.join("src");
    std::fs::create_dir_all(&src).unwrap();
    std::fs::write(src.join("notes.txt"), "hello quarkzip").unwrap();
    let bin = sidecar();
    assert!(bin.is_file(), "fetch sidecars first: {}", bin.display());
    let archive = work.join("fixture.tar.gz");
    run(&bin, &["a", "-ttar", "inner.tar", "notes.txt"], &src);
    run(
        &bin,
        &["a", "-tgzip", archive.to_str().unwrap(), "inner.tar"],
        &src,
    );
    check_parity(&work, &archive, "tar.gz");
    let _ = std::fs::remove_dir_all(&work);
}

#[test]
#[cfg(not(qz_ffi))]
fn should_skip_without_engine() {
    // Stub test so the target exists on sidecar-only builds.
}

#[test]
#[ignore]
#[cfg(qz_ffi)]
fn bench_ten_million_listing() {
    let path =
        std::env::var("QUARKZIP_BIG_ZIP").expect("set QUARKZIP_BIG_ZIP=/path/to/files-10m.zip");
    let cancel = AtomicBool::new(false);
    let t0 = std::time::Instant::now();
    let mut last = 0u64;
    let data = quarkzip_lib::sevenzip::enumerate_detail(
        &path,
        None,
        &mut |n| {
            last = n;
            if n % 1_000_000 == 0 {
                println!("  ...{n} entries ({:.0}s)", t0.elapsed().as_secs_f32());
            }
        },
        &cancel,
    )
    .expect("FFI enumeration works");
    let dt = t0.elapsed().as_secs_f64();
    println!(
        "FFI LIST: {} entries in {:.1}s ({:.0}/s), last progress {last}",
        data.entries.len(),
        dt,
        data.entries.len() as f64 / dt,
    );
    assert!(data.entries.len() > 10_000_000, "all rows enumerated");
    let t1 = std::time::Instant::now();
    let info = quarkzip_lib::archive::summarize_archive_info(&data.header, &data.facts);
    println!(
        "FFI INFO: {} files + {} folders, {:?} unpacked in {:.2}s",
        info.file_count,
        info.folder_count,
        info.total_unpacked,
        t1.elapsed().as_secs_f64(),
    );
    assert_eq!(info.file_count + info.folder_count, data.entries.len());
}
