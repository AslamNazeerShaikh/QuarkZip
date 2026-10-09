# QuarkZip backend commands (`src-tauri/src/lib.rs`)

Archive work runs through the **in-process 7-Zip engine**: vendored 26.04
sources compiled in by `src-tauri/build.rs` (`src-tauri/ffi/bridge.*`,
`src-tauri/src/sevenzip.rs`; see `docs/7zip-reference.md` §6). No sidecar,
no spawned processes — list, extract and test all run inside the backend
on blocking threads. Checksums are computed natively in Rust. Shared
`summarize_archive_info` (single spec over header + facts),
paging/sorting, folder-name validation and hashing live in
`src-tauri/src/archive.rs` and `src-tauri/src/checksum.rs` — unit-tested
without a binary (`npm run test:rust`). FFI list/extract/test behavior is
pinned by `src-tauri/tests/zz_ffi_list.rs` against committed fixtures
(`src-tauri/tests/fixtures/`, regenerate with the dev sidecar).

## Commands

| Command               | Args                                                                                | Returns                                                                                                                                                                                                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_archive`        | `path`, `password?`, `onProgress: Channel<ListProgress>`                            | `{ total }` — listing stays backend-held (`ListingState`); tree chunks arrive via `get_children`                                                                                                                                                                                                                             |
| `get_children`        | `path`, `parent` (`""` = root), `offset`, `limit` (1–10000), `sortKey?`, `sortDir?` | `{ rows: ArchiveEntry[] (with enumerate-order `index`), total, child_counts }` — immediate children of `parent`, folders-first server sort (`path` must match; stale requests error). `child_counts` maps each returned folder path to its immediate-child total (memoized per listing; one linear scan per folder set ever) |
| `info_archive`        | `path` (stored listing must match)                                                  | `ArchiveInfo` (stored-listing summary + fs size/mtime)                                                                                                                                                                                                                                                                       |
| `cancel_list_archive` | —                                                                                   | aborts an in-flight `list_archive`; previous listing kept                                                                                                                                                                                                                                                                    |
| `extract_archive`     | `path`, `dest`, `files[]`, `password?`                                              | `"Extracted N files"` (in-process, overwrite always); empty `files` = everything                                                                                                                                                                                                                                             |
| `test_archive`        | `path`, `password?`, `onProgress: Channel<u32>`                                     | `"Everything is Ok"` (in-process decode, percent streamed)                                                                                                                                                                                                                                                                   |
| `checksum_file`       | `path`, `algorithm`, `onProgress: Channel<u32>`                                     | lowercase hex digest (MD5 / SHA-1 / SHA-256 / SHA-512)                                                                                                                                                                                                                                                                       |
| `cancel_checksum`     | —                                                                                   | aborts the in-flight `checksum_file`                                                                                                                                                                                                                                                                                         |
| `path_exists`         | `path`                                                                              | `bool` — one `metadata` call; backs the extract subfolder uniqueness check (`dest/<name>` must be free)                                                                                                                                                                                                                      |
| `cancel_checksum`     | —                                                                                   | aborts the in-flight `checksum_file`                                                                                                                                                                                                                                                                                         |
| `drag_window`         | —                                                                                   | starts a native drag (custom title strip)                                                                                                                                                                                                                                                                                    |
| `greet`               | `name`                                                                              | scaffold sample, unused by the UI                                                                                                                                                                                                                                                                                            |
| `set_liquid_glass`    | `enabled: bool`                                                                     | toggles the native glass window background (macOS; no-op elsewhere)                                                                                                                                                                                                                                                          |

## `ArchiveInfo` schema (fixed 16 cells + More panel)

`summarize_archive_info` consumes exactly six header keys
(`Type`, `Physical Size`, `Headers Size`, `Method`, `Solid`, `Blocks`)
for the fixed card grid; everything else the engine reports rides along
in `extra` for the card's More panel (advanced users) and never grows
the grid. Measured against 7zz 26.03 (`l -slt`):

| Format   | Type | Physical | Headers | Method¹ | Solid | Blocks | More-panel extras                   |
| -------- | ---- | -------- | ------- | ------- | ----- | ------ | ----------------------------------- |
| zip      | ✓    | ✓        | —       | —       | —     | —      | `64-bit`, `Characteristics` (Zip64) |
| 7z plain | ✓    | ✓        | ✓       | ✓       | −     | ✓      | —                                   |
| 7z solid | ✓    | ✓        | ✓       | ✓       | +     | ✓      | —                                   |
| tar      | ✓    | ✓        | ✓       | —       | —     | —      | `Code Page`, `Characteristics`      |
| gzip     | ✓    | —        | ✓       | —       | —     | —      | —                                   |

¹ Header-level method exists only for 7z. The ALGORITHMS cell aggregates
per-entry methods (empty for tar/gzip entries → `Store / none`); HOST OS
likewise aggregates per-entry values (7z entries carry none → `—`).
ON DISK / MODIFIED always resolve from filesystem stat, never the engine.

## Rules

1. **camelCase args on IPC.** `#[tauri::command]` camelCases argument names
   by default, so the frontend sends `onProgress` for Rust's `on_progress`
   (single-word args like `path` are unaffected). Mis-casing fails with
   `missing required key onProgress`.
2. **Progress via `Channel`.** Long commands take a `Channel<u32>` and emit
   whole percents only on change (plus a final 100). No polling, no extra
   commands. The e2e mock (`e2e/mocks/core.ts`) stubs `Channel` with a live
   `emit`.
3. **No timeouts, no hangs.** Engine calls run on blocking threads over
   local files (no spawned processes left to kill); cooperative
   `LIST_CANCEL` still aborts listings between progress intervals.
4. **Engine errors are direct.** `test_archive` fails on the first error
   (`"Wrong password"`, `"CRC Failed : <path>"`, …); selective extracts
   matching nothing fail with `No files to process — nothing matched the
selection.` Filesystem failures map to the permission contract
   (`"Permission denied: <path>"`, `"No such file or directory: <path>"`).
5. **Checksum cancel is cooperative.** One global flag (single-window app):
   `checksum_file` resets it on start and checks per 1 MiB chunk;
   `cancel_checksum` sets it. The dialog stays open on cancel — only Close
   dismisses it.
6. **No argv, no prompts.** Only the archive _path_ (plus algorithm id
   for checksums, dest + file list for extracts) crosses IPC; passwords
   ride optional params straight into the engine open (single attempt, no
   prompts ever — a missing password fails fast with detectable markers).
7. **Passwords ride optional params.** `list/extract/test` take
   `password?`. The frontend detects password failures with
   `isPasswordError` (mirrors the bridge errbuf markers in
   `src-tauri/ffi/bridge.cpp` — keep both lists in sync) and
   opens the password gate instead of erroring; the verified password is
   remembered per open archive so Test/Extract keep working on encrypted
   content. Content-scope vs header-scope behavior: `docs/passwords.md`.
8. **Extract subfolders validate twice.** `archive::validate_folder_name`
   (non-empty, ≤255 UTF-8 bytes, not `.`/`..`, no `/`, NUL, `:` or C0
   controls — mirrored in `src/lib/extractFolder.ts`, which additionally
   rejects lone surrogates impossible in Rust `&str`) gates the dialog;
   `path_exists` probes `dest/<name>` uniqueness (debounced, stale wins
   lose). The engine creates the final folder itself (nested parents
   included); the Rust preflight (`create_dir_all`) maps io failures to
   the permission contract first.
