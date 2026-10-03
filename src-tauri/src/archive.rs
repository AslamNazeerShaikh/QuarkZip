//! Pure 7zz helpers: argv builders + `7zz l -slt` parsing.
//!
//! Sidecar *spawning* lives in Tauri commands; everything here is pure so it
//! is unit-testable without a binary.

/// One entry from `7zz l -slt` output.
#[derive(Debug, PartialEq, serde::Serialize)]
pub struct ArchiveEntry {
    /// Path inside the archive.
    pub path: String,
    /// Unpacked size in bytes (`None` when 7zz reports no Size line).
    /// NOTE: `Some(0)` is an empty *file*, not a folder — use `is_folder`.
    pub size: Option<u64>,
    /// Last-modified timestamp as reported by 7zz (`None` when absent).
    pub modified: Option<String>,
    /// True for directories, read from the `Attributes` field (`D` flag).
    /// Never infer folders from size: empty files also report `Size = 0`.
    pub is_folder: bool,
}

/// Argv for `7zz l -slt <archive>` (technical listing, stable to parse).
pub fn list_args(archive: &str) -> Vec<String> {
    vec!["l".to_string(), "-slt".to_string(), archive.to_string()]
}

/// Argv for `7zz x <archive> -o<dest> [-p<pw>] -y`.
pub fn extract_args(archive: &str, dest: &str, password: Option<&str>) -> Vec<String> {
    let mut args = vec![
        "x".to_string(),
        archive.to_string(),
        format!("-o{dest}"),
        "-y".to_string(),
    ];
    if let Some(pw) = password {
        args.push(format!("-p{pw}"));
    }
    args
}

/// Argv for `7zz t <archive> [-p<pw>]` (integrity test).
pub fn test_args(archive: &str, password: Option<&str>) -> Vec<String> {
    let mut args = vec!["t".to_string(), archive.to_string()];
    if let Some(pw) = password {
        args.push(format!("-p{pw}"));
    }
    args
}

/// Parse `7zz l -slt` output into entries.
///
/// Blocks are separated by blank lines; each line is `Key = Value`.
/// Only `Path`, `Size`, `Modified` and `Attributes` are read; values may
/// themselves contain ` = `, so split on the first occurrence only.
/// Folders come from `Attributes` (DOS `D` flag or unix `d` prefix),
/// never from size — empty files legitimately report `Size = 0`.
pub fn parse_list_slt(output: &str) -> Vec<ArchiveEntry> {
    let mut entries = Vec::new();
    let mut path: Option<String> = None;
    let mut size: Option<u64> = None;
    let mut modified: Option<String> = None;
    let mut is_folder = false;

    let flush = |path: &mut Option<String>,
                 size: &mut Option<u64>,
                 modified: &mut Option<String>,
                 is_folder: &mut bool,
                 entries: &mut Vec<ArchiveEntry>| {
        if let Some(p) = path.take() {
            entries.push(ArchiveEntry {
                path: p,
                size: size.take(),
                modified: modified.take(),
                is_folder: std::mem::replace(is_folder, false),
            });
        }
    };

    for line in output.lines() {
        let line = line.trim_end();
        if line.trim().is_empty() {
            flush(
                &mut path,
                &mut size,
                &mut modified,
                &mut is_folder,
                &mut entries,
            );
            continue;
        }
        let Some((key, value)) = line.split_once(" = ") else {
            continue;
        };
        match key.trim() {
            "Path" => {
                flush(
                    &mut path,
                    &mut size,
                    &mut modified,
                    &mut is_folder,
                    &mut entries,
                );
                path = Some(value.to_string());
            }
            "Size" => size = value.trim().parse().ok(),
            "Modified" => modified = Some(value.to_string()),
            "Attributes" => is_folder = attributes_is_folder(value),
            _ => {}
        }
    }
    flush(
        &mut path,
        &mut size,
        &mut modified,
        &mut is_folder,
        &mut entries,
    );
    entries
}

/// True when a 7zz `Attributes` value marks a directory: DOS `D` flag
/// (`D ...`, `AD ...`) or a unix permission string (`drwxr-xr-x`).
fn attributes_is_folder(attrs: &str) -> bool {
    match attrs.split_whitespace().next() {
        Some(first) => first.contains('D') || first.starts_with('d'),
        None => false,
    }
}

/// Summary of an archive's container + content, derived from one
/// `7zz l -slt` listing plus filesystem metadata for the container file.
///
/// `container_size` / `container_modified` are filled by the Tauri command
/// (filesystem truth); the pure parser leaves them `None`.
/// `compression_ratio` is `packed / unpacked` (0 when unpacked is 0).
/// `max_depth` counts path segments (`a/b/c.txt` → 3), i.e. nesting levels.
/// `encryption_scheme` is `"None"` when nothing is encrypted, otherwise the
/// distinct cipher tokens seen in per-file `Method` values (e.g. `7zAES`)
/// joined with ` + `, falling back to `"Encrypted"`.
#[derive(Debug, PartialEq, Clone, serde::Serialize)]
pub struct ArchiveInfo {
    pub container_format: Option<String>,
    pub physical_size: Option<u64>,
    pub headers_size: Option<u64>,
    pub method: Option<String>,
    pub solid: Option<String>,
    pub blocks: Option<String>,
    pub file_count: usize,
    pub folder_count: usize,
    pub total_unpacked: u64,
    pub total_packed: u64,
    pub compression_ratio: f64,
    pub max_depth: usize,
    pub methods: Vec<String>,
    pub encrypted_files: usize,
    pub encryption_scheme: String,
    pub host_os: Vec<String>,
    pub container_size: Option<u64>,
    pub container_modified: Option<u64>,
    /// Header keys outside the known set (Code Page, Characteristics, …).
    pub extra: std::collections::BTreeMap<String, String>,
}

/// Parse `7zz l -slt` output into an [`ArchiveInfo`].
///
/// The header (between `Listing archive:` and the `----------` separator)
/// carries container keys (`Type`, `Physical Size`, …); every block after
/// the separator is one entry with `Size`, `Packed Size`, `Method`,
/// `Encrypted`, `Host OS` and either `Folder = +` (zip/tar) or `Attributes`
/// (7z) marking directories.
pub fn parse_archive_info(output: &str) -> ArchiveInfo {
    use std::collections::{BTreeMap, BTreeSet};

    let mut header: BTreeMap<String, String> = BTreeMap::new();
    let mut in_header = false;
    let mut header_done = false;
    let mut block: BTreeMap<String, String> = BTreeMap::new();
    let mut blocks: Vec<BTreeMap<String, String>> = Vec::new();

    for raw in output.lines() {
        let line = raw.trim_end();
        if line.trim() == "----------" {
            header_done = true;
            in_header = false;
            continue;
        }
        if !header_done {
            if line.starts_with("Listing archive:") {
                in_header = true;
                continue;
            }
            if !in_header {
                continue;
            }
            if line.trim().is_empty() || line.trim() == "--" {
                continue;
            }
            if let Some((k, v)) = line.split_once(" = ") {
                if k.trim() != "Path" {
                    header.insert(k.trim().to_string(), v.trim().to_string());
                }
            }
            continue;
        }
        if line.trim().is_empty() {
            if !block.is_empty() {
                blocks.push(std::mem::take(&mut block));
            }
            continue;
        }
        if let Some((k, v)) = line.split_once(" = ") {
            let key = k.trim();
            if key == "Path" && block.contains_key("Path") {
                blocks.push(std::mem::take(&mut block));
            }
            block.insert(key.to_string(), v.trim().to_string());
        }
    }
    if !block.is_empty() {
        blocks.push(block);
    }

    let mut file_count = 0usize;
    let mut folder_count = 0usize;
    let mut total_unpacked = 0u64;
    let mut total_packed = 0u64;
    let mut max_depth = 0usize;
    let mut encrypted_files = 0usize;
    let mut methods: BTreeSet<String> = BTreeSet::new();
    let mut cipher_tokens: BTreeSet<String> = BTreeSet::new();
    let mut host_os: BTreeSet<String> = BTreeSet::new();

    for b in &blocks {
        let Some(path) = b.get("Path") else { continue };
        let folder = b.get("Folder").is_some_and(|f| f == "+")
            || b.get("Attributes").is_some_and(|a| attributes_is_folder(a));
        if folder {
            folder_count += 1;
        } else {
            file_count += 1;
        }
        if let Some(s) = b.get("Size").and_then(|s| s.parse::<u64>().ok()) {
            if !folder {
                total_unpacked = total_unpacked.saturating_add(s);
            }
        }
        if let Some(p) = b
            .get("Packed Size")
            .and_then(|s| s.parse::<u64>().ok())
        {
            total_packed = total_packed.saturating_add(p);
        }
        let depth = path
            .split(['/', '\\'])
            .filter(|seg| !seg.is_empty())
            .count();
        max_depth = max_depth.max(depth);
        if let Some(m) = b.get("Method").filter(|m| !m.is_empty()) {
            methods.insert(m.clone());
        }
        if b.get("Encrypted").is_some_and(|e| e == "+") {
            encrypted_files += 1;
            if let Some(m) = b.get("Method") {
                for token in m.split_whitespace() {
                    let upper = token.to_ascii_uppercase();
                    if upper.contains("AES") || upper.contains("CRYPTO") {
                        let base = token.split(':').next().unwrap_or(token);
                        cipher_tokens.insert(base.to_string());
                    }
                }
            }
        }
        if let Some(os) = b.get("Host OS").filter(|s| !s.is_empty()) {
            host_os.insert(os.clone());
        }
    }

    let compression_ratio = if total_unpacked > 0 {
        total_packed as f64 / total_unpacked as f64
    } else {
        0.0
    };
    let encryption_scheme = if encrypted_files == 0 {
        "None".to_string()
    } else if cipher_tokens.is_empty() {
        "Encrypted".to_string()
    } else {
        cipher_tokens.into_iter().collect::<Vec<_>>().join(" + ")
    };

    let known = ["Type", "Physical Size", "Headers Size", "Method", "Solid", "Blocks"];
    let extra: BTreeMap<String, String> = header
        .iter()
        .filter(|(k, _)| !known.contains(&k.as_str()))
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();

    ArchiveInfo {
        container_format: header.remove("Type"),
        physical_size: header.remove("Physical Size").and_then(|s| s.parse().ok()),
        headers_size: header.remove("Headers Size").and_then(|s| s.parse().ok()),
        method: header.remove("Method"),
        solid: header.remove("Solid"),
        blocks: header.remove("Blocks"),
        file_count,
        folder_count,
        total_unpacked,
        total_packed,
        compression_ratio,
        max_depth,
        methods: methods.into_iter().collect(),
        encrypted_files,
        encryption_scheme,
        host_os: host_os.into_iter().collect(),
        container_size: None,
        container_modified: None,
        extra,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_build_technical_listing_args_when_archive_given() {
        assert_eq!(
            list_args("docs.7z"),
            vec!["l".to_string(), "-slt".to_string(), "docs.7z".to_string()]
        );
    }

    #[test]
    fn should_build_extract_args_without_password_when_none_given() {
        assert_eq!(
            extract_args("a.7z", "/tmp/out", None),
            vec![
                "x".to_string(),
                "a.7z".to_string(),
                "-o/tmp/out".to_string(),
                "-y".to_string(),
            ]
        );
    }

    #[test]
    fn should_append_password_flag_when_password_given() {
        let args = extract_args("a.7z", "/tmp/out", Some("s3cret"));
        assert!(args.contains(&"-ps3cret".to_string()));
        let args = test_args("a.7z", Some("s3cret"));
        assert_eq!(args[0], "t");
        assert!(args.contains(&"-ps3cret".to_string()));
    }

    #[test]
    fn should_parse_files_and_folders_when_slt_output_given() {
        let output = "\
Path = notes.txt
Size = 128
Modified = 2026-09-03 15:30:00
Attributes = A -rw-r--r--

Path = pics
Size = 0
Attributes = D drwxr-xr-x

Path = empty.txt
Size = 0
Attributes = A -rw-r--r--

Path = pics/a = b.png
Size = 2048
Modified = 2026-09-04 10:00:00
Attributes = A -rw-r--r--
";
        assert_eq!(
            parse_list_slt(output),
            vec![
                ArchiveEntry {
                    path: "notes.txt".to_string(),
                    size: Some(128),
                    modified: Some("2026-09-03 15:30:00".to_string()),
                    is_folder: false,
                },
                ArchiveEntry {
                    path: "pics".to_string(),
                    size: Some(0),
                    modified: None,
                    is_folder: true,
                },
                ArchiveEntry {
                    path: "empty.txt".to_string(),
                    size: Some(0),
                    modified: None,
                    is_folder: false,
                },
                ArchiveEntry {
                    path: "pics/a = b.png".to_string(),
                    size: Some(2048),
                    modified: Some("2026-09-04 10:00:00".to_string()),
                    is_folder: false,
                },
            ]
        );
    }

    #[test]
    fn should_detect_folders_from_attributes() {
        assert!(attributes_is_folder("D drwxr-xr-x"));
        assert!(attributes_is_folder("D"));
        assert!(attributes_is_folder("drwxr-xr-x"));
        assert!(!attributes_is_folder("A -rw-r--r--"));
        assert!(!attributes_is_folder("A"));
        assert!(!attributes_is_folder(""));
    }

    #[test]
    fn should_return_empty_when_output_has_no_paths() {
        assert!(parse_list_slt("7-Zip (z) 26.03\n\n").is_empty());
        assert!(parse_list_slt("").is_empty());
    }

    #[test]
    fn should_parse_header_and_stats_when_7z_listing_given() {
        let output = "\
Listing archive: /tmp/qz-sample.7z

--
Path = /tmp/qz-sample.7z
Type = 7z
Physical Size = 255
Headers Size = 234
Method = LZMA2:12
Solid = +
Blocks = 1

----------
Path = qz-sample
Size = 0
Packed Size = 0
Attributes = D drwxr-xr-x
Encrypted = -
Method =

Path = qz-sample/sub/nested/c.txt
Size = 5
Packed Size = 7
Attributes = A -rw-r--r--
Encrypted = -
Method = LZMA2:12
";
        let info = parse_archive_info(output);
        assert_eq!(info.container_format.as_deref(), Some("7z"));
        assert_eq!(info.physical_size, Some(255));
        assert_eq!(info.headers_size, Some(234));
        assert_eq!(info.method.as_deref(), Some("LZMA2:12"));
        assert_eq!(info.solid.as_deref(), Some("+"));
        assert_eq!(info.blocks.as_deref(), Some("1"));
        assert_eq!(info.file_count, 1);
        assert_eq!(info.folder_count, 1);
        assert_eq!(info.total_unpacked, 5);
        assert_eq!(info.total_packed, 7);
        assert_eq!(info.max_depth, 4);
        assert_eq!(info.methods, vec!["LZMA2:12".to_string()]);
        assert_eq!(info.encrypted_files, 0);
        assert_eq!(info.encryption_scheme, "None");
    }

    #[test]
    fn should_detect_encryption_scheme_when_encrypted_listing_given() {
        let output = "\
Listing archive: /tmp/qz-pw.7z

--
Path = /tmp/qz-pw.7z
Type = 7z
Physical Size = 287
Method = LZMA2:12 7zAES
Solid = +
Blocks = 1

----------
Path = a.txt
Size = 6
Packed Size = 32
Attributes = A -rw-r--r--
Encrypted = +
Method = LZMA2:12 7zAES:19
";
        let info = parse_archive_info(output);
        assert_eq!(info.encrypted_files, 1);
        assert_eq!(info.encryption_scheme, "7zAES");
    }

    #[test]
    fn should_parse_zip_folders_and_host_os_when_zip_listing_given() {
        let output = "\
Listing archive: /tmp/qz-fold.zip

--
Path = /tmp/qz-fold.zip
Type = zip
Physical Size = 921

----------
Path = qz-sample
Folder = +
Size = 0
Packed Size = 0
Encrypted = -
Method = Store
Host OS = Unix

Path = qz-sample/a.txt
Folder = -
Size = 6
Packed Size = 6
Encrypted = -
Method = Store
Host OS = Unix
";
        let info = parse_archive_info(output);
        assert_eq!(info.container_format.as_deref(), Some("zip"));
        assert_eq!(info.file_count, 1);
        assert_eq!(info.folder_count, 1);
        assert_eq!(info.max_depth, 2);
        assert_eq!(info.host_os, vec!["Unix".to_string()]);
    }
}
