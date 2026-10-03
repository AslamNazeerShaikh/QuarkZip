---
name: tauri-development
description: Tauri 2 + React + Rust patterns for QuarkZip (sidecars, commands, capabilities)
version: 1.0.0
---

# Tauri development (QuarkZip)

## Sidecar (7zz)

- Declared in `src-tauri/tauri.conf.json` as `bundle.externalBin: ["binaries/7zz"]`; files live in `src-tauri/binaries/` as `7zz-<target-triple>[.exe]` (pinned 7-Zip 26.03 via `scripts/fetch-7zz.sh`).
- Spawn from Rust with explicit argv (array), never a shell string. Stream stdout for `-bsp1` progress; wire cancel + timeout; surface stderr in the logs view.
- Capabilities: sidecar execution needs shell-plugin scope in `src-tauri/capabilities/` — add the plugin + permission together, never one without the other.

## Commands

- Define `#[tauri::command]` fns in `src-tauri/src/lib.rs`, register with `generate_handler!`; call from TS with `invoke` from `@tauri-apps/api/core`.
- Keep arg builders + `7zz l -slt` parsers as pure, unit-testable Rust fns (no binary needed for those tests).

## Frontend

- React + Tailwind v4, `src/main.tsx` entry; file dialogs via Tauri dialog plugin (native macOS pickers), drag-drop via Tauri drag events.
- Large listings: incremental append + virtualized rendering; never full-DOM render of 100k rows.

## Checks

- `npm run build` (tsc + vite), `cargo check` in `src-tauri/`, `./scripts/fetch-7zz.sh` after pin bumps.
