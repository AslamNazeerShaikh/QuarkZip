/// Extract subfolder helpers: default name from the archive path + APFS
/// validation. Mirrors `archive::default_folder_name` /
/// `archive::validate_folder_name` in Rust (same extension list, same loop,
/// same byte limit) — the one deliberate addition is the lone-surrogate
/// check, which cannot occur in Rust `&str` but can in UTF-16 input.

const ARCHIVE_EXTENSIONS = new Set([
  "7z",
  "zip",
  "tar",
  "gz",
  "tgz",
  "bz2",
  "xz",
  "zst",
  "rar",
  "wim",
  "iso",
  "cab",
  "dmg",
  "lzma",
]);

export type FolderNameError =
  "empty" | "too_long" | "reserved" | "invalid_chars" | "invalid_unicode";

/// File name without directories or archive extensions (`data.tar.gz` →
/// `data`). Falls back to `"extracted"` when nothing usable remains.
export function defaultFolderName(archivePath: string): string {
  const base = archivePath.split(/[/\\]/).pop() ?? archivePath;
  let stem = base;
  for (;;) {
    const dot = stem.lastIndexOf(".");
    if (dot <= 0) break;
    const head = stem.slice(0, dot);
    const ext = stem.slice(dot + 1);
    if (ext === "" || head === "") break;
    if (ARCHIVE_EXTENSIONS.has(ext.toLowerCase())) stem = head;
    else break;
  }
  if (stem === "" || stem === "." || stem === "..") return "extracted";
  if (stem.startsWith(".") && !stem.slice(1).includes(".")) {
    const rest = stem.slice(1);
    if (rest === "" || ARCHIVE_EXTENSIONS.has(rest.toLowerCase()))
      return "extracted";
  }
  return stem;
}

/// APFS-safe name check: non-empty, ≤255 UTF-8 bytes, not `.`/`..`, no
/// `/`, NUL, `:` or C0 controls, and no lone surrogates (not valid UTF-8).
/// Returns the failure code, or `null` when the name is usable.
export function validateFolderName(name: string): FolderNameError | null {
  if (name.trim() === "") return "empty";
  if (
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(
      name,
    )
  )
    return "invalid_unicode";
  if (new TextEncoder().encode(name).length > 255) return "too_long";
  if (name === "." || name === "..") return "reserved";
  if (/[/\0:]/.test(name)) return "invalid_chars";
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(name)) return "invalid_chars";
  return null;
}

/// Destination with the optional subfolder appended (NFC-normalized, no
/// trailing slash on the base). Pure string join — 7zz creates the folder.
export function joinDest(dest: string, subfolder: string | null): string {
  if (!subfolder) return dest;
  return `${dest.replace(/\/+$/, "")}/${subfolder.normalize("NFC")}`;
}

/// UTF-8 byte length of a name (what the 255 cap counts).
export function utf8Length(name: string): number {
  return new TextEncoder().encode(name).length;
}

/// Filesystem-safe local stamp (`2026-10-08_14-30-05`): date and time joined
/// by an underscore, no colons/spaces — legal on APFS and sortable.
export function dateStamp(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
  );
}

/// Appends `_dateStamp` to a folder name, trimming the head (char-safe, so
/// multi-byte glyphs never split) when the result would pass 255 bytes.
/// The stamp itself is never cut — the preview always shows when.
export function appendDateStamp(name: string, d: Date = new Date()): string {
  const base = name === "" ? "extracted" : name;
  const stamp = dateStamp(d);
  const full = `${base}_${stamp}`;
  if (utf8Length(full) <= 255) return full;
  const budget = 255 - utf8Length(`_${stamp}`);
  let out = "";
  for (const ch of base) {
    if (utf8Length(out + ch) > budget) break;
    out += ch;
  }
  return `${out}_${stamp}`;
}
