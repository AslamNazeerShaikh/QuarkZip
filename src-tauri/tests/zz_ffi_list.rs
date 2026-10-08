//! In-process engine tests (list / extract / test) against committed
//! fixtures — no sidecar anywhere, on any target.
//!
//! Fixtures live in `tests/fixtures/` (regenerate with the dev sidecar,
//! then commit — they are small):
//!   basic.zip   — notes.txt, pics/a = b.png, pics/café.txt, empty.txt,
//!                   emptydir/, pics/  (mixed names, empty file + dirs)
//!   store.7z    — same tree, 7z format (different handler path)
//!   locked.zip  — ZipCrypto, password "secret" (names readable, data locked)
//!   locked7z.7z — header-encrypted 7z, password "secret" (nothing readable)
//!
//! Plus an ignored 10M benchmark (manual):
//!   QUARKZIP_BIG_ZIP=/path/to/files-10m.zip cargo test --release \
//!     --test zz_ffi_list -- --ignored --nocapture
//!
//! Requires `qz_ffi` (unix + committed vendor/7zip); skipped otherwise.

use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;

fn fixtures() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
}

fn work(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("quarkzip-ffi-{}-{}", std::process::id(), name));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

#[cfg(qz_ffi)]
fn enumerate(path: &Path, password: Option<&str>) -> quarkzip_lib::sevenzip::ListingData {
    let cancel = AtomicBool::new(false);
    quarkzip_lib::sevenzip::enumerate_detail(path.to_str().unwrap(), password, &mut |_| {}, &cancel)
        .expect("FFI enumeration works")
}

#[cfg(qz_ffi)]
fn entry_paths(data: &quarkzip_lib::sevenzip::ListingData) -> Vec<String> {
    let mut paths: Vec<String> = data.entries.iter().map(|e| e.path.clone()).collect();
    paths.sort();
    paths
}

#[test]
#[cfg(qz_ffi)]
fn should_list_every_entry_of_the_zip_fixture() {
    let data = enumerate(&fixtures().join("basic.zip"), None);
    assert_eq!(
        entry_paths(&data),
        vec![
            "empty.txt",
            "emptydir",
            "notes.txt",
            "pics",
            "pics/a = b.png",
            "pics/café.txt",
        ]
    );
    let note = data.entries.iter().find(|e| e.path == "notes.txt").unwrap();
    assert_eq!(note.size, Some(14));
    assert!(!note.is_folder);
}

#[test]
#[cfg(qz_ffi)]
fn should_list_the_7z_fixture_through_its_handler() {
    let data = enumerate(&fixtures().join("store.7z"), None);
    assert_eq!(
        entry_paths(&data),
        vec![
            "empty.txt",
            "emptydir",
            "notes.txt",
            "pics",
            "pics/a = b.png",
            "pics/café.txt",
        ]
    );
}

#[test]
#[cfg(qz_ffi)]
fn should_refuse_header_encrypted_list_without_password() {
    let cancel = AtomicBool::new(false);
    let res = quarkzip_lib::sevenzip::enumerate_detail(
        fixtures().join("locked7z.7z").to_str().unwrap(),
        None,
        &mut |_| {},
        &cancel,
    );
    let err = match res {
        Ok(_) => panic!("header-encrypted open must fail"),
        Err(e) => e,
    };
    assert!(
        err.contains("Enter password"),
        "password gate marker, got: {err}"
    );
}

#[test]
#[cfg(qz_ffi)]
fn should_extract_everything_and_restore_contents() {
    let work = work("extract-all");
    let dest = work.join("fresh").join("nested");
    // Destination need not exist (mirrors `7zz x -o` auto-create).
    let written = quarkzip_lib::sevenzip::extract_ffi(
        fixtures().join("basic.zip").to_str().unwrap(),
        dest.to_str().unwrap(),
        &[],
        None,
    )
    .expect("FFI extraction works");
    assert_eq!(written, 4, "four files (dirs are created, not counted)");
    assert_eq!(
        std::fs::read(dest.join("notes.txt")).unwrap(),
        b"hello quarkzip"
    );
    assert_eq!(
        std::fs::read(dest.join("pics").join("café.txt")).unwrap(),
        b"unicode"
    );
    assert!(dest.join("empty.txt").is_file());
    assert!(dest.join("emptydir").is_dir());
    let _ = std::fs::remove_dir_all(&work);
}

#[test]
#[cfg(qz_ffi)]
fn should_extract_a_folder_prefix_and_single_files() {
    let work = work("extract-sel");
    let dest = work.join("out");
    let written = quarkzip_lib::sevenzip::extract_ffi(
        fixtures().join("basic.zip").to_str().unwrap(),
        dest.to_str().unwrap(),
        &["notes.txt".to_string(), "pics".to_string()],
        None,
    )
    .expect("selective extraction works");
    assert_eq!(written, 3);
    assert!(dest.join("notes.txt").is_file());
    assert!(dest.join("pics").join("a = b.png").is_file());
    assert!(!dest.join("empty.txt").exists());
    let _ = std::fs::remove_dir_all(&work);
}

#[test]
#[cfg(qz_ffi)]
fn should_write_nothing_when_nothing_matches() {
    let work = work("extract-noop");
    let dest = work.join("out");
    let written = quarkzip_lib::sevenzip::extract_ffi(
        fixtures().join("basic.zip").to_str().unwrap(),
        dest.to_str().unwrap(),
        &["nope.txt".to_string()],
        None,
    )
    .expect("no-match is Ok(0); lib maps it to the noop error");
    assert_eq!(written, 0);
    let _ = std::fs::remove_dir_all(&work);
}

#[test]
#[cfg(qz_ffi)]
fn should_unlock_zipcrypto_with_the_password() {
    let work = work("extract-pw");
    let dest = work.join("out");
    let written = quarkzip_lib::sevenzip::extract_ffi(
        fixtures().join("locked.zip").to_str().unwrap(),
        dest.to_str().unwrap(),
        &[],
        Some("secret"),
    )
    .expect("correct password extracts");
    assert_eq!(written, 1);
    assert_eq!(
        std::fs::read(dest.join("notes.txt")).unwrap(),
        b"hello quarkzip"
    );
    let _ = std::fs::remove_dir_all(&work);
}

#[test]
#[cfg(qz_ffi)]
fn should_report_wrong_password_for_locked_data() {
    let work = work("extract-nopw");
    let dest = work.join("out");
    for pw in [None, Some("nope")] {
        let err = quarkzip_lib::sevenzip::extract_ffi(
            fixtures().join("locked.zip").to_str().unwrap(),
            dest.to_str().unwrap(),
            &[],
            pw,
        )
        .expect_err("locked data must fail");
        assert!(
            err.to_lowercase().contains("wrong password"),
            "password gate marker, got: {err}"
        );
    }
    let _ = std::fs::remove_dir_all(&work);
}

#[test]
#[cfg(qz_ffi)]
fn should_test_with_monotonic_whole_percent_progress() {
    let mut pcts = Vec::new();
    quarkzip_lib::sevenzip::test_ffi(
        fixtures().join("basic.zip").to_str().unwrap(),
        None,
        &mut |pct| {
            assert!(pct <= 100);
            if pcts.last() != Some(&pct) {
                pcts.push(pct);
            }
        },
    )
    .expect("clean archive tests Ok");
    assert!(!pcts.is_empty());
    let mut sorted = pcts.clone();
    sorted.sort_unstable();
    assert_eq!(pcts, sorted, "progress never goes backwards");
}

#[test]
#[cfg(qz_ffi)]
fn should_fail_the_test_on_corrupt_data() {
    let work = work("corrupt");
    let bytes = std::fs::read(fixtures().join("basic.zip")).unwrap();
    let mut bad = bytes.clone();
    // Flip a content byte (central directory stays valid, CRC must fail).
    let at = bytes
        .windows(b"hello quarkzip".len())
        .position(|w| w == b"hello quarkzip")
        .expect("fixture content present");
    bad[at] ^= 0xFF;
    let corrupt = work.join("corrupt.zip");
    std::fs::write(&corrupt, &bad).unwrap();
    let err = quarkzip_lib::sevenzip::test_ffi(corrupt.to_str().unwrap(), None, &mut |_| {})
        .expect_err("corrupt data must fail the test");
    assert!(
        err.contains("CRC Failed") || err.contains("Data Error"),
        "engine failure taxonomy, got: {err}"
    );
    let _ = std::fs::remove_dir_all(&work);
}

#[test]
#[cfg(qz_ffi)]
fn should_gate_locked_tests_behind_password() {
    let err = quarkzip_lib::sevenzip::test_ffi(
        fixtures().join("locked.zip").to_str().unwrap(),
        None,
        &mut |_| {},
    )
    .expect_err("locked test must fail");
    assert!(
        err.to_lowercase().contains("wrong password"),
        "password gate marker, got: {err}"
    );
    quarkzip_lib::sevenzip::test_ffi(
        fixtures().join("locked.zip").to_str().unwrap(),
        Some("secret"),
        &mut |_| {},
    )
    .expect("correct password tests Ok");
}

#[test]
#[cfg(not(qz_ffi))]
fn should_skip_without_engine() {
    // Stub test so the target exists on engine-less builds.
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
        t1.elapsed().as_secs_f32(),
    );
    assert_eq!(info.file_count + info.folder_count, data.entries.len());
}
