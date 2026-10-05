# QuarkZip backend commands (`src-tauri/src/lib.rs`)

All archive work runs through the pinned 7zz sidecar
(`src-tauri/binaries/7zz-*`, `externalBin: binaries/7zz`); checksums are
computed natively in Rust. Pure argv builders and `7zz l -slt` parsing live
in `src-tauri/src/archive.rs`, hashing in `src-tauri/src/checksum.rs` — both
unit-tested without a binary (`npm run test:rust`).

## Commands

| Command | Args | Returns |
| --- | --- | --- |
| `list_archive` | `path`, `password?` | `ArchiveEntry[]` (`7zz l -slt [-p<pw>]`) |
| `info_archive` | `path`, `password?` | `ArchiveInfo` (listing + fs size/mtime) |
| `extract_archive` | `path`, `dest`, `files[]`, `password?` | 7zz stdout (`7zz x -o<dest> [files…] [-p<pw>] -y`); empty `files` = everything |
| `test_archive` | `path`, `password?`, `onProgress: Channel<u32>` | `"Everything is Ok"` (`7zz t -bsp1`, percent streamed) |
| `checksum_file` | `path`, `algorithm`, `onProgress: Channel<u32>` | lowercase hex digest (MD5 / SHA-1 / SHA-256 / SHA-512) |
| `cancel_checksum` | — | aborts the in-flight `checksum_file` |
| `drag_window` | — | starts a native drag (custom title strip) |
| `greet` | `name` | scaffold sample, unused by the UI |

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
6. **Argv is backend-built.** Only the archive *path* (and algorithm id for
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
