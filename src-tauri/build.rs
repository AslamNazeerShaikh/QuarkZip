fn main() {
    tauri_build::build();
    copy_sidecar_for_dev();
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
    let exe_dir = out.ancestors().nth(3)
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
