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
    /// Enumerate-order serial (position in the stored facts): stable entry
    /// identity for the tree's index column, assigned once at open. Display
    /// order (folders-first natural) differs — the number is identity, not
    /// rank.
    pub index: usize,
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
    /// Unconsumed header keys (`64-bit`, `Characteristics`, `Code Page`,
    /// …): shown only in the card's More panel for advanced users, never
    /// in the fixed 16-cell grid.
    pub extra: std::collections::BTreeMap<String, String>,
}

/// One entry's summary facts, whether parsed from `-slt` text or pulled
/// from the in-process engine: identical input, one [`summarize_archive_info`].
#[derive(Debug, PartialEq, Clone)]
pub struct EntryFacts {
    pub path: String,
    pub size: Option<u64>,
    pub packed_size: Option<u64>,
    pub method: Option<String>,
    pub encrypted: bool,
    pub host_os: Option<String>,
    pub is_folder: bool,
    /// Raw 7zz `Modified` stamp for display + sorting (mirrors
    /// [`ArchiveEntry::modified`]; kept here so pages serve from facts).
    pub modified: Option<String>,
}

/// Builds an [`ArchiveInfo`] from a header map plus per-entry facts —
/// shared by the `-slt` text path and the in-process engine, so the two
/// can never drift (A/B-tested on fixtures and the 10M archive).
pub fn summarize_archive_info(
    header: &std::collections::BTreeMap<String, String>,
    facts: &[EntryFacts],
) -> ArchiveInfo {
    use std::collections::BTreeSet;

    let mut header = header.clone();
    let mut file_count = 0usize;
    let mut folder_count = 0usize;
    let mut total_unpacked = 0u64;
    let mut total_packed = 0u64;
    let mut max_depth = 0usize;
    let mut encrypted_files = 0usize;
    let mut methods: BTreeSet<String> = BTreeSet::new();
    let mut cipher_tokens: BTreeSet<String> = BTreeSet::new();
    let mut host_os: BTreeSet<String> = BTreeSet::new();

    for f in facts {
        if f.is_folder {
            folder_count += 1;
        } else {
            file_count += 1;
        }
        if let Some(s) = f.size {
            if !f.is_folder {
                total_unpacked = total_unpacked.saturating_add(s);
            }
        }
        if let Some(p) = f.packed_size {
            total_packed = total_packed.saturating_add(p);
        }
        let depth = f
            .path
            .split(['/', '\\'])
            .filter(|seg| !seg.is_empty())
            .count();
        max_depth = max_depth.max(depth);
        if let Some(m) = f.method.as_ref().filter(|m| !m.is_empty()) {
            methods.insert(m.clone());
        }
        if f.encrypted {
            encrypted_files += 1;
            if let Some(m) = &f.method {
                for token in m.split_whitespace() {
                    let upper = token.to_ascii_uppercase();
                    if upper.contains("AES") || upper.contains("CRYPTO") {
                        let base = token.split(':').next().unwrap_or(token);
                        cipher_tokens.insert(base.to_string());
                    }
                }
            }
        }
        if let Some(os) = f.host_os.as_ref().filter(|s| !s.is_empty()) {
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

    // Fixed 16-cell grid (see ArchiveOverview) consumes only the six
    // known header keys. Everything else the engine reports (`64-bit`,
    // `Characteristics`, `Code Page`, `Multivolume`, …) is an unbounded,
    // per-format-varying set: it ships in `extra` for the card's More
    // panel (advanced users) and never grows the fixed grid.
    let known = [
        "Type",
        "Physical Size",
        "Headers Size",
        "Method",
        "Solid",
        "Blocks",
    ];
    let extra: std::collections::BTreeMap<String, String> = header
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

/// Sort column for server-side tree chunks (mirrors the tree's `SortKey`).
/// Folders always lead within a folder listing (Finder-style), in both
/// directions; `desc` reverses within each group only.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PageSortKey {
    Path,
    Size,
    Type,
    Modified,
}

impl PageSortKey {
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "path" => Some(Self::Path),
            "size" => Some(Self::Size),
            "type" => Some(Self::Type),
            "modified" => Some(Self::Modified),
            _ => None,
        }
    }
}

/// Display row for one facts entry (mirrors the FFI enumerate mapping).
/// `index` is the entry's facts position (enumerate-order serial).
pub fn entry_from_facts(f: &EntryFacts, index: usize) -> ArchiveEntry {
    ArchiveEntry {
        path: f.path.clone(),
        size: f.size,
        modified: f.modified.clone(),
        is_folder: f.is_folder,
        index,
    }
}

/// Natural order for archive paths: case-folded, digit runs by numeric
/// value. Mirrors the table's `localeCompare(numeric: true)` for ASCII
/// paths (the 10M fixture is zero-padded, where byte order agrees too).
/// Fully-equal strings compare `Equal` so the stable sort below keeps
/// input order — same as the table's comparator returning 0.
pub fn cmp_natural(a: &str, b: &str) -> std::cmp::Ordering {
    use std::cmp::Ordering;
    fn runs(s: &str) -> Vec<(bool, &str)> {
        let mut out = Vec::new();
        let mut start = 0;
        let mut digit: Option<bool> = None;
        for (i, c) in s.char_indices() {
            let d = c.is_ascii_digit();
            match digit {
                Some(cur) if cur == d => {}
                _ => {
                    if i > start || digit.is_some() {
                        out.push((digit.unwrap_or(false), &s[start..i]));
                    }
                    start = i;
                    digit = Some(d);
                }
            }
        }
        if digit.is_some() {
            out.push((digit.unwrap_or(false), &s[start..]));
        }
        out
    }
    fn digits_value(run: &str) -> &str {
        let trimmed = run.trim_start_matches('0');
        if trimmed.is_empty() {
            "0"
        } else {
            trimmed
        }
    }
    let (mut ra, mut rb) = (runs(a).into_iter(), runs(b).into_iter());
    loop {
        match (ra.next(), rb.next()) {
            (None, None) => return Ordering::Equal,
            (None, _) => return Ordering::Less,
            (_, None) => return Ordering::Greater,
            (Some((da, xa)), Some((db, xb))) => {
                if da && db {
                    let (va, vb) = (digits_value(xa), digits_value(xb));
                    match va.len().cmp(&vb.len()).then(va.cmp(vb)) {
                        Ordering::Equal => {}
                        other => return other,
                    }
                } else {
                    // Case-folded compare; ties fall through to later runs
                    // and finally `Equal` (stable order, like the table).
                    let (fa, fb) = (xa.to_lowercase(), xb.to_lowercase());
                    match fa.cmp(&fb) {
                        Ordering::Equal => {}
                        other => return other,
                    }
                }
            }
        }
    }
}

/// Extension rule mirroring `fileKind`: from the file *name* only, after
/// the last `.`, lowercased (`""` when none). Dots in directory names
/// (`.opencode`, `.bin`) are not extensions — the full-path `rfind` once
/// labeled `.bin/download-msgpackr-prebuilds` as `BIN/DOWNLOAD-…`.
fn type_key(f: &EntryFacts) -> (u8, String, &str) {
    if f.is_folder {
        return (0, String::new(), f.path.as_str());
    }
    let base = f.path.rsplit(['/', '\\']).next().unwrap_or(&f.path);
    let ext = base
        .rfind('.')
        .filter(|&i| i > 0)
        .map(|i| base[i + 1..].to_lowercase())
        .unwrap_or_default();
    (1, ext, f.path.as_str())
}

/// Max children served per `get_children` call (one tree chunk): bounds
/// webview RAM the way `MAX_PAGE_SIZE` bounded the table. A folder with
/// more children grows a "Show more" row per chunk.
pub const MAX_CHILD_CHUNK: usize = 10_000;

/// One served children chunk: immediate-child rows plus the folder total
/// (unchanged by chunking, so the UI can label pager rows without a second
/// call) plus immediate-child counts for the folder rows in this chunk
/// (keyed by trimmed folder path — every visible subfolder shows its item
/// count without further round-trips).
#[derive(Debug, serde::Serialize, PartialEq)]
pub struct ChildrenPage {
    pub rows: Vec<ArchiveEntry>,
    pub total: usize,
    pub child_counts: std::collections::HashMap<String, usize>,
}

/// Immediate-child counts for `folders` in one linear pass: each fact
/// contributes to its own parent only. Requested paths are trimmed, so
/// `pics/` and `pics` are one folder and read under the trimmed key.
pub fn immediate_child_counts(
    facts: &[EntryFacts],
    folders: &std::collections::HashSet<String>,
) -> std::collections::HashMap<String, usize> {
    fn trim(p: &str) -> &str {
        p.trim_end_matches(['/', '\\'])
    }
    let want: std::collections::HashSet<&str> = folders.iter().map(|f| trim(f)).collect();
    let mut out: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    if want.is_empty() {
        return out;
    }
    for f in facts {
        let p = trim(&f.path);
        let parent = match p.rfind(['/', '\\']) {
            Some(i) => &p[..i],
            None => "",
        };
        // The root ("") is never a requested folder; the folder itself
        // (empty remainder) is never its own child.
        if parent.is_empty() || !want.contains(parent) {
            continue;
        }
        *out.entry(parent.to_string()).or_insert(0) += 1;
    }
    // Requested folders with no children read as zero, not missing.
    for folder in want {
        out.entry(folder.to_string()).or_insert(0);
    }
    out
}

/// Immediate children of `parent` (`""` = archive root), sorted
/// folders-first (Finder-style tree: folders always lead, in both
/// directions) then by `key`/`desc` within each group, sliced
/// `[offset, offset+limit)`. Out-of-range offsets yield `[]`.
///
/// Paths are matched verbatim — including any trailing slash the engine
/// reported for directories (`pics/`) — but the self entry (empty
/// remainder) is never its own child. Sorting touches indices only, so a
/// 10M root expansion never clones the facts vec.
pub fn children_of(
    facts: &[EntryFacts],
    parent: &str,
    offset: usize,
    limit: usize,
    key: PageSortKey,
    desc: bool,
) -> ChildrenPage {
    let trimmed_parent = parent.trim_end_matches(['/', '\\']);
    let mut idx: Vec<usize> = Vec::new();
    for (i, f) in facts.iter().enumerate() {
        let p = f.path.as_str();
        let rest = if trimmed_parent.is_empty() {
            Some(p)
        } else {
            p.strip_prefix(trimmed_parent)
                .and_then(|r| r.strip_prefix(['/', '\\']))
        };
        let Some(rest) = rest else { continue };
        let rest = rest.trim_end_matches(['/', '\\']);
        // Empty remainder = the folder itself; a remainder with a separator
        // is a grandchild, not an immediate child.
        if rest.is_empty() || rest.contains(['/', '\\']) {
            continue;
        }
        idx.push(i);
    }
    let total = idx.len();
    idx.sort_by(|&a, &b| {
        let (fa, fb) = (&facts[a], &facts[b]);
        // Folders first in both directions; `desc` reverses within groups.
        let folders = (fb.is_folder as u8).cmp(&(fa.is_folder as u8));
        if folders != std::cmp::Ordering::Equal {
            return folders;
        }
        let ord = match key {
            PageSortKey::Path => cmp_natural(&fa.path, &fb.path),
            PageSortKey::Size => (fa.size.unwrap_or(0)).cmp(&fb.size.unwrap_or(0)),
            PageSortKey::Type => {
                let (ka, kb) = (type_key(fa), type_key(fb));
                ka.0.cmp(&kb.0)
                    .then(cmp_natural(&ka.1, &kb.1))
                    .then(cmp_natural(ka.2, kb.2))
            }
            PageSortKey::Modified => fa
                .modified
                .as_deref()
                .unwrap_or("")
                .cmp(fb.modified.as_deref().unwrap_or("")),
        };
        if desc {
            ord.reverse()
        } else {
            ord
        }
    });
    let rows = idx
        .into_iter()
        .skip(offset)
        .take(limit)
        .map(|i| entry_from_facts(&facts[i], i))
        .collect();
    // Counts ride the command layer (memoized per listing in lib.rs), so
    // pure index math here stays allocation-free.
    ChildrenPage {
        rows,
        total,
        child_counts: std::collections::HashMap::new(),
    }
}

/// Archive extensions stripped (case-insensitive, innermost first) when
/// deriving the default extract subfolder from the archive file name
/// (`data.tar.gz` → `data`, `photo.ZIP` → `photo`). Kept in sync with the
/// frontend's `defaultFolderName` — same list, same loop.
const ARCHIVE_EXTENSIONS: &[&str] = &[
    "7z", "zip", "tar", "gz", "tgz", "bz2", "xz", "zst", "rar", "wim", "iso", "cab", "dmg", "lzma",
];

/// Default extract subfolder for an archive path: file name without
/// directories and without archive extensions. Falls back to `"extracted"`
/// when nothing usable remains (extension-only names like `.7z`).
pub fn default_folder_name(archive_path: &str) -> String {
    let base = archive_path
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or(archive_path);
    let mut stem = base;
    loop {
        let Some(dot) = stem.rfind('.') else { break };
        let (head, ext) = (&stem[..dot], &stem[dot + 1..]);
        if ext.is_empty() || head.is_empty() {
            break;
        }
        if ARCHIVE_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()) {
            stem = head;
        } else {
            break;
        }
    }
    if stem.is_empty() || stem == "." || stem == ".." {
        return "extracted".to_string();
    }
    // Dotfiles with no real stem (`.7z`) have nothing usable left — but
    // `.bashrc` (or `.bashrc.zip` → `.bashrc`) is a real name, kept.
    if let Some(rest) = stem.strip_prefix('.') {
        if !rest.contains('.')
            && (rest.is_empty() || ARCHIVE_EXTENSIONS.contains(&rest.to_ascii_lowercase().as_str()))
        {
            return "extracted".to_string();
        }
    }
    stem.to_string()
}

/// Validation failure code for [`validate_folder_name`] (the frontend maps
/// each to its localized message; the codes are the contract).
pub type FolderNameError = &'static str;

/// Validates a user-typed extract subfolder name for APFS creation under a
/// chosen destination: non-empty after trimming, ≤255 UTF-8 bytes (APFS
/// limit), not `.`/`..`, and free of `/`, NUL, `:` (Finder swaps it with
/// `/`) and other C0 controls. Lone surrogates cannot occur in Rust `&str`
/// (always valid Unicode) — the TypeScript mirror adds that check for
/// UTF-16 input. Uniqueness (`dest/<name>` must not exist) is checked
/// separately via [`path_exists`] — one `metadata` call, O(1).
pub fn validate_folder_name(name: &str) -> Result<(), FolderNameError> {
    if name.trim().is_empty() {
        return Err("empty");
    }
    if name.len() > 255 {
        return Err("too_long");
    }
    if name == "." || name == ".." {
        return Err("reserved");
    }
    if name
        .chars()
        .any(|c| c == '/' || c == '\0' || c == ':' || c.is_control())
    {
        return Err("invalid_chars");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_derive_folder_name_without_archive_extensions() {
        assert_eq!(default_folder_name("/tmp/photo.zip"), "photo");
        assert_eq!(default_folder_name("/tmp/data.tar.gz"), "data");
        assert_eq!(default_folder_name("C:\\Users\\me\\backup.7Z"), "backup");
        assert_eq!(default_folder_name("/tmp/my.backup.7z"), "my.backup");
        assert_eq!(default_folder_name("/tmp/archive.tgz"), "archive");
        assert_eq!(default_folder_name("/tmp/notes.txt"), "notes.txt");
        assert_eq!(default_folder_name("/tmp/noext"), "noext");
        assert_eq!(default_folder_name("/tmp/.7z"), "extracted");
        assert_eq!(default_folder_name("/tmp/.bashrc"), ".bashrc");
        assert_eq!(default_folder_name("/tmp/.bashrc.zip"), ".bashrc");
    }

    #[test]
    fn should_reject_bad_folder_names_for_apfs() {
        assert_eq!(validate_folder_name("  "), Err("empty"));
        assert_eq!(validate_folder_name(""), Err("empty"));
        assert_eq!(validate_folder_name("."), Err("reserved"));
        assert_eq!(validate_folder_name(".."), Err("reserved"));
        assert_eq!(validate_folder_name("a/b"), Err("invalid_chars"));
        assert_eq!(validate_folder_name("a:b"), Err("invalid_chars"));
        assert_eq!(validate_folder_name("a\0b"), Err("invalid_chars"));
        assert_eq!(validate_folder_name("a\tb"), Err("invalid_chars"));
        // 255 UTF-8 bytes pass; 256 fail (4-byte emoji count 4 each).
        assert!(validate_folder_name(&"a".repeat(255)).is_ok());
        assert_eq!(validate_folder_name(&"a".repeat(256)), Err("too_long"));
        assert_eq!(validate_folder_name(&"😀".repeat(64)), Err("too_long"));
        assert!(validate_folder_name(&"😀".repeat(63)).is_ok());
        assert!(validate_folder_name("café ünïcode").is_ok());
    }

    fn fact(path: &str, size: Option<u64>, modified: Option<&str>, folder: bool) -> EntryFacts {
        EntryFacts {
            path: path.to_string(),
            size,
            packed_size: None,
            method: None,
            encrypted: false,
            host_os: None,
            modified: modified.map(str::to_string),
            is_folder: folder,
        }
    }

    fn sample_facts() -> Vec<EntryFacts> {
        vec![
            fact("photo.png", Some(200), Some("2026-09-02 11:00:00"), false),
            fact("backup", None, None, true),
            fact(
                "docs/report.pdf",
                Some(5000),
                Some("2026-09-01 10:00:00"),
                false,
            ),
            fact("notes.txt", Some(50), None, false),
            fact("inner.zip", Some(9000), Some("2026-09-03 12:00:00"), false),
        ]
    }

    fn paths(facts: &[EntryFacts]) -> Vec<&str> {
        facts.iter().map(|f| f.path.as_str()).collect()
    }

    #[test]
    fn should_order_paths_naturally_case_insensitive() {
        assert_eq!(
            cmp_natural("file-2.txt", "file-10.txt"),
            std::cmp::Ordering::Less
        );
        assert_eq!(cmp_natural("Backup", "backup"), std::cmp::Ordering::Equal);
        assert_eq!(cmp_natural("b", "a"), std::cmp::Ordering::Greater);
    }

    fn child_paths(page: &ChildrenPage) -> Vec<&str> {
        page.rows.iter().map(|r| r.path.as_str()).collect()
    }

    fn nested_facts() -> Vec<EntryFacts> {
        vec![
            fact("root.txt", Some(10), Some("2026-09-02 00:00:00"), false),
            fact("docs", None, None, true),
            fact(
                "docs/report.pdf",
                Some(5000),
                Some("2026-09-01 00:00:00"),
                false,
            ),
            fact("docs/notes.txt", Some(50), None, false),
            // Dots in directory names are not extensions (old full-path
            // `rfind` labeled these `BIN/…` and overflowed the Type cell).
            fact(".cache", None, None, true),
            fact(".cache/blob", Some(5), None, false),
            fact("pics/", None, None, true),
            fact("pics/a.png", Some(200), None, false),
        ]
    }

    #[test]
    fn should_sort_paths_asc_with_folders_first() {
        // `sample_facts` root children: the `backup` folder + 3 files
        // (`docs/report.pdf` lives under `docs/`, not at root).
        let facts = sample_facts();
        let page = children_of(&facts, "", 0, 100, PageSortKey::Path, false);
        assert_eq!(page.total, 4);
        assert_eq!(
            child_paths(&page),
            ["backup", "inner.zip", "notes.txt", "photo.png"]
        );
        // Desc reverses within groups only — folders still lead.
        let page = children_of(&facts, "", 0, 100, PageSortKey::Path, true);
        assert_eq!(
            child_paths(&page),
            ["backup", "photo.png", "notes.txt", "inner.zip"]
        );
    }

    #[test]
    fn should_sort_null_sizes_as_zero() {
        let facts = sample_facts();
        let page = children_of(&facts, "", 0, 100, PageSortKey::Size, false);
        // `backup` (null) sorts as 0, folders-first still applies.
        assert_eq!(child_paths(&page)[0], "backup");
        assert_eq!(child_paths(&page).last(), Some(&"inner.zip"));
        let page = children_of(&facts, "", 0, 100, PageSortKey::Size, true);
        assert_eq!(child_paths(&page)[1], "inner.zip");
    }

    #[test]
    fn should_sort_folders_before_files_by_extension() {
        let facts = sample_facts();
        let page = children_of(&facts, "", 0, 100, PageSortKey::Type, false);
        let ordered = child_paths(&page);
        assert_eq!(ordered[0], "backup");
        // Extensions ascend after the folder: png, txt, zip.
        assert_eq!(ordered[1..], ["photo.png", "notes.txt", "inner.zip"]);
    }

    #[test]
    fn should_derive_extension_from_the_file_name_only() {
        let facts = nested_facts();
        let page = children_of(&facts, ".cache", 0, 10, PageSortKey::Type, false);
        assert_eq!(page.total, 1);
        // `blob` has no extension in its own name → sorts with "" (first).
        assert_eq!(child_paths(&page), [".cache/blob"]);
    }

    #[test]
    fn should_sort_modified_as_raw_strings_with_nulls_first() {
        let facts = sample_facts();
        let page = children_of(&facts, "", 0, 100, PageSortKey::Modified, false);
        assert_eq!(
            child_paths(&page),
            ["backup", "notes.txt", "photo.png", "inner.zip"]
        );
    }

    #[test]
    fn should_chunk_bounds_safely() {
        let facts = sample_facts();
        let first = children_of(&facts, "", 0, 2, PageSortKey::Path, false);
        assert_eq!(first.total, 4);
        assert_eq!(first.rows.len(), 2);
        let second = children_of(&facts, "", 2, 2, PageSortKey::Path, false);
        assert_eq!(second.rows.len(), 2);
        assert!(children_of(&facts, "", 9, 2, PageSortKey::Path, false)
            .rows
            .is_empty());
        assert!(children_of(&facts, "", 0, 0, PageSortKey::Path, false)
            .rows
            .is_empty());
        assert!(
            children_of(&facts, "", usize::MAX, 100, PageSortKey::Path, false)
                .rows
                .is_empty()
        );
    }

    #[test]
    fn should_serve_immediate_children_only() {
        let facts = nested_facts();
        // Root: files + folders only, never grandchildren; `pics/` (trailing
        // slash from zip-style listings) is a root child, not hidden.
        let root = children_of(&facts, "", 0, 20, PageSortKey::Path, false);
        assert_eq!(root.total, 4);
        assert_eq!(child_paths(&root), [".cache", "docs", "pics/", "root.txt"]);
        // Subfolder: its own entry is never its child.
        let docs = children_of(&facts, "docs", 0, 20, PageSortKey::Path, false);
        assert_eq!(docs.total, 2);
        assert_eq!(child_paths(&docs), ["docs/notes.txt", "docs/report.pdf"]);
        // Unknown folders yield an empty chunk, never an error.
        let missing = children_of(&facts, "nope", 0, 20, PageSortKey::Path, false);
        assert_eq!(missing.total, 0);
        assert!(missing.rows.is_empty());
    }

    #[test]
    fn should_number_rows_by_enumerate_order() {
        // Index is stable identity from listing time, not display rank:
        // `docs/report.pdf` keeps its facts position however it sorts.
        let facts = nested_facts();
        let root = children_of(&facts, "", 0, 20, PageSortKey::Path, false);
        let by_path: std::collections::HashMap<&str, usize> = root
            .rows
            .iter()
            .map(|r| (r.path.as_str(), r.index))
            .collect();
        assert_eq!(by_path["root.txt"], 0);
        assert_eq!(by_path["docs"], 1);
        assert_eq!(by_path["pics/"], 6);
        // Display order is folders-first natural, not index order.
        assert_eq!(child_paths(&root), [".cache", "docs", "pics/", "root.txt"]);
    }

    #[test]
    fn should_count_immediate_children_per_folder() {
        use std::collections::HashSet;
        let facts = nested_facts();
        let want: HashSet<String> = ["docs".to_string(), "pics".to_string(), ".cache".to_string()]
            .into_iter()
            .collect();
        let counts = immediate_child_counts(&facts, &want);
        assert_eq!(counts["docs"], 2);
        assert_eq!(counts["pics"], 1);
        assert_eq!(counts[".cache"], 1);
        // Trailing-slash spellings merge under the trimmed key.
        let want2: HashSet<String> = ["pics/".to_string()].into_iter().collect();
        let counts2 = immediate_child_counts(&facts, &want2);
        assert_eq!(counts2["pics"], 1);
    }

    #[test]
    fn should_map_facts_to_display_entries() {
        let entry = entry_from_facts(
            &fact("a.txt", Some(6), Some("2026-01-01 00:00:00"), false),
            41,
        );
        assert_eq!(entry.path, "a.txt");
        assert_eq!(entry.size, Some(6));
        assert_eq!(entry.modified.as_deref(), Some("2026-01-01 00:00:00"));
        assert!(!entry.is_folder);
        assert_eq!(entry.index, 41);
    }

    #[test]
    fn should_reject_unknown_sort_keys() {
        assert_eq!(PageSortKey::parse("path"), Some(PageSortKey::Path));
        assert_eq!(PageSortKey::parse("size"), Some(PageSortKey::Size));
        assert_eq!(PageSortKey::parse("type"), Some(PageSortKey::Type));
        assert_eq!(PageSortKey::parse("modified"), Some(PageSortKey::Modified));
        assert_eq!(PageSortKey::parse("crc"), None);
    }
}
