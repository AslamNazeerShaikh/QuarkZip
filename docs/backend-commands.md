# QuarkZip backend commands (`src-tauri/src/lib.rs`)

Archive work runs through **two engines**: the in-process 7-Zip build
(preferred on macOS/Linux — vendored 26.04 sources compiled in by
`src-tauri/build.rs`, `src-tauri/ffi/bridge.*`, `src-tauri/src/sevenzip.rs`;
see `docs/7zip-reference.md` §6) with fallback to the pinned 7zz sidecar
(`src-tauri/binaries/7zz-*`, `externalBin: binaries/7zz`). Checksums are
computed natively in Rust. Pure argv builders, `7zz l -slt` parsing and the
shared `summarize_archive_info` (single spec for both engines, A/B-tested)
live in `src-tauri/src/archive.rs`, hashing in `src-tauri/src/checksum.rs` —
both unit-tested without a binary (`npm run test:rust`).

## Commands

| Command               | Args                                                          | Returns                                                                                                                 |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `list_archive`        | `path`, `password?`, `onProgress: Channel<ListProgress>`      | `{ total }` — listing stays backend-held (`ListingState`); rows arrive via `get_page`                                   |
| `get_page`            | `path`, `page`, `pageSize` (1–100000), `sortKey?`, `sortDir?` | `{ rows: ArchiveEntry[], total }` — server-sorted slice of the stored listing (`path` must match; stale requests error) |
| `info_archive`        | `path`, `password?`, `onProgress: Channel<ListProgress>`      | `ArchiveInfo` (stored-listing summary, else listing + fs size/mtime)                                                    |
| `cancel_list_archive` | —                                                             | aborts an in-flight `list/info_archive`; previous listing kept                                                          |
| `extract_archive`     | `path`, `dest`, `files[]`, `password?`                        | 7zz stdout (`7zz x -o<dest> [files…] [-p<pw>] -y`); empty `files` = everything                                          |
| `test_archive`        | `path`, `password?`, `onProgress: Channel<u32>`               | `"Everything is Ok"` (`7zz t -bsp1`, percent streamed)                                                                  |
| `checksum_file`       | `path`, `algorithm`, `onProgress: Channel<u32>`               | lowercase hex digest (MD5 / SHA-1 / SHA-256 / SHA-512)                                                                  |
| `cancel_checksum`     | —                                                             | aborts the in-flight `checksum_file`                                                                                    |
| `drag_window`         | —                                                             | starts a native drag (custom title strip)                                                                               |
| `greet`               | `name`                                                        | scaffold sample, unused by the UI                                                                                       |
| `set_liquid_glass`    | `enabled: bool`                                               | toggles the native glass window background (macOS; no-op elsewhere)                                                     |

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
3. **Timeouts kill, never hang.** `LIST_TIMEOUT_SECS = 60`,
   `TEST/EXTRACT_TIMEOUT_SECS = 600` (`tokio::time::timeout` + `child.kill`);
   expiry reports the Gatekeeper hint, not a spinner.
4. **Exit code is not the verdict.** `test_archive` additionally requires the
   `Everything is Ok` marker; selective extracts returning `No files to
process` surface as errors. Long stderr/stdout is tail-truncated
   (`ERROR_TAIL_CHARS = 4000`, char-boundary safe) before crossing IPC.
5. **Checksum cancel is cooperative.** One global flag (single-window app):
   `checksum_file` resets it on start and checks per 1 MiB chunk;
   `cancel_checksum` sets it. The dialog stays open on cancel — only Close
   dismisses it.
6. **Argv is backend-built.** Only the archive _path_ (and algorithm id for
   checksums, validated against `ChecksumAlgo::parse`) crosses IPC; flags
   are never assembled from frontend strings. `-p` is always appended, even
   empty: the shell plugin spawns 7zz with stdin piped and never closes it,
   so without an explicit `-p` a password prompt would block until the
   timeout. Empty `-p` fails fast with detectable password markers and is
   ignored for plain archives (verified against 7zz 26.03).
7. **Passwords ride optional params.** `list/info/extract/test` take
   `password?` (`-p<pw>` appended server-side). The frontend detects
   password failures with `isPasswordError` (mirrors Rust's
   `archive::is_password_output` — keep both marker lists in sync) and
   opens the password gate instead of erroring; the verified password is
   remembered per open archive so Test/Extract keep working on encrypted
   content. Content-scope vs header-scope behavior: `docs/passwords.md`.
