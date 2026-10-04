# 7zz binaries for QuarkZip

Pinned: **7-Zip 26.03 (2026-09-03)**, 64-bit only. Source:
`https://www.7-zip.org/download.html` (files live on
`https://github.com/ip7z/7zip/releases/download/26.03/`).

## Assets we use

| File                 | Arch              | Contents                       |
| -------------------- | ----------------- | ------------------------------ |
| `7z2603-mac.tar.xz`  | macOS arm64+x64   | One tar for both Mac arches    |
| `7z2603-linux-x64.tar.xz`   | Linux x86-64 | Console `7zz`             |
| `7z2603-linux-arm64.tar.xz` | Linux arm64  | Console `7zz`             |
| `7z2603-extra.7z`    | Windows x64 + arm64   | `x64/7za.exe` + `arm64/7za.exe` standalone consoles (VERIFIED) |
| `7z2603-arm64.exe`   | Windows arm64     | Full installer, cached only — future full-codec (RAR) work |

Run `./scripts/fetch-7zz.sh`. It downloads to `vendor/7zz-cache/`,
normalizes to Tauri sidecar names in `src-tauri/binaries/`, and prints
SHA256 sums — pin reviewed sums here.

## Tauri sidecar naming

`tauri.conf.json > bundle.externalBin` declares `binaries/7zz`.
Tauri resolves per-target files (`.exe` suffixed on Windows):

- `7zz-aarch64-apple-darwin`, `7zz-x86_64-apple-darwin`
- `7zz-x86_64-unknown-linux-gnu`, `7zz-aarch64-unknown-linux-gnu`
- `7zz-x86_64-pc-windows-msvc.exe`, `7zz-aarch64-pc-windows-msvc.exe`

Upstream ships a single Mac tar, so the script installs that one file
under both Mac triples after printing `file`/`lipo -info` — VERIFIED:
Mach-O universal, x86_64 + arm64. Same for Windows: `extra.7z`
contains both `x64/7za.exe` and `arm64/7za.exe` (VERIFIED).

Windows codec note: the sidecars are standalone `7za.exe`, which ships
fewer codecs than full `7z` — RAR extraction will not work on Windows
until we ship `7z.exe + 7z.dll` as resources (follow-up using the cached
`7z2603-arm64.exe` + equivalent x64 source).

## macOS Gatekeeper (dev machines)

The Mac sidecars are unsigned third-party binaries, so Gatekeeper
quarantines them on download and blocks execution with a
`"7zz" Not Opened` dialog — while the app hangs on "Reading…"
(listing never resolves). `scripts/fetch-7zz.sh` strips the
quarantine bit after install, so re-run it after any re-fetch.
Manual fix for already-installed sidecars (repo root):

```sh
xattr -d com.apple.quarantine src-tauri/binaries/7zz-*-apple-darwin
```

In `tauri dev` the sidecar that actually executes is Tauri's copy under
`src-tauri/target/debug/` (e.g. `target/debug/7zz`), which inherits the
quarantine bit — clear it there too, or rebuild after clearing the
sources so the copies come out clean.

Belt and suspenders in the backend: every sidecar call runs under a
timeout (`LIST_TIMEOUT_SECS` / `EXTRACT_TIMEOUT_SECS` in
`src-tauri/src/lib.rs`) that kills 7zz and reports a Gatekeeper hint
instead of spinning forever.

## Checked-in vs fetch-at-build

Default: **fetch at build**, binaries gitignored (`.gitignore` covers
`src-tauri/binaries/7zz-*`). Reasons: ~30 MB repo bloat, LGPL/unRAR
license files must ship alongside, and macOS Gatekeeper rejects
unsigned third-party binaries unless you re-sign on your identity.

To check in instead: delete those two `.gitignore` lines and commit the
`src-tauri/binaries/` files. Keep doing: pin SHA256 above, ship 7-Zip
license text, re-sign Mac binaries, test `tauri build` per target.

## License

7-Zip is by Igor Pavlov, mostly GNU LGPL with an unRAR restriction on
some code — read the license inside the archives and ship the required
notices. QuarkZip itself is separate; decide its license before first
public release.
