//! Pure 7zz helpers: argv builders + `7zz l -slt` parsing.
//!
//! Sidecar *spawning* lives in Tauri commands; everything here is pure so it
//! is unit-testable without a binary.

/// One entry from `7zz l -slt` output.
#[derive(Debug, PartialEq)]
pub struct ArchiveEntry {
    /// Path inside the archive.
    pub path: String,
    /// Unpacked size in bytes (`None` for folders).
    pub size: Option<u64>,
    /// Last-modified timestamp as reported by 7zz (`None` when absent).
    pub modified: Option<String>,
}

/// Argv for `7zz l -slt <archive>` (technical listing, stable to parse).
pub fn list_args(archive: &str) -> Vec<String> {
    vec![
        "l".to_string(),
        "-slt".to_string(),
        archive.to_string(),
    ]
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
/// Only `Path`, `Size` and `Modified` are read; values may themselves
/// contain ` = `, so split on the first occurrence only.
pub fn parse_list_slt(output: &str) -> Vec<ArchiveEntry> {
    let mut entries = Vec::new();
    let mut path: Option<String> = None;
    let mut size: Option<u64> = None;
    let mut modified: Option<String> = None;

    let flush = |path: &mut Option<String>,
                     size: &mut Option<u64>,
                     modified: &mut Option<String>,
                     entries: &mut Vec<ArchiveEntry>| {
        if let Some(p) = path.take() {
            entries.push(ArchiveEntry {
                path: p,
                size: size.take(),
                modified: modified.take(),
            });
        }
    };

    for line in output.lines() {
        let line = line.trim_end();
        if line.trim().is_empty() {
            flush(&mut path, &mut size, &mut modified, &mut entries);
            continue;
        }
        let Some((key, value)) = line.split_once(" = ") else {
            continue;
        };
        match key.trim() {
            "Path" => {
                flush(&mut path, &mut size, &mut modified, &mut entries);
                path = Some(value.to_string());
            }
            "Size" => size = value.trim().parse().ok(),
            "Modified" => modified = Some(value.to_string()),
            _ => {}
        }
    }
    flush(&mut path, &mut size, &mut modified, &mut entries);
    entries
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

Path = pics
Size = 0

Path = pics/a = b.png
Size = 2048
Modified = 2026-09-04 10:00:00
";
        assert_eq!(
            parse_list_slt(output),
            vec![
                ArchiveEntry {
                    path: "notes.txt".to_string(),
                    size: Some(128),
                    modified: Some("2026-09-03 15:30:00".to_string()),
                },
                ArchiveEntry {
                    path: "pics".to_string(),
                    size: Some(0),
                    modified: None,
                },
                ArchiveEntry {
                    path: "pics/a = b.png".to_string(),
                    size: Some(2048),
                    modified: Some("2026-09-04 10:00:00".to_string()),
                },
            ]
        );
    }

    #[test]
    fn should_return_empty_when_output_has_no_paths() {
        assert!(parse_list_slt("7-Zip (z) 26.03\n\n").is_empty());
        assert!(parse_list_slt("").is_empty());
    }
}
