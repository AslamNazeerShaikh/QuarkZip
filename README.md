# QuarkZip

A visual 7-Zip archive manager for macOS (first), then Windows and Linux.
Tauri 2 + React + Tailwind v4 + Rust, shelling out to a pinned 7-Zip console binary.

## Prereqs

- Node 20+, Rust stable, Xcode CLT (macOS)
- No pnpm needed — this project uses npm

## Quickstart

```sh
npm install
./scripts/fetch-7zz.sh   # downloads pinned 7-Zip 26.03 consoles, see docs/7zz-binaries.md
npm run tauri dev
```

Build per OS via GitHub Releases later:

```sh
npm run build
npm run tauri build
```

## Layout (per https://v2.tauri.app/start/project-structure/)

- `src/` — React + Tailwind v4 frontend (Vite)
- `src-tauri/` — Rust backend (`src/lib.rs` entry, `tauri.conf.json`, `capabilities/`)
- `src-tauri/binaries/` — 7zz sidecars (`externalBin: binaries/7zz`), fetched not committed
- `scripts/fetch-7zz.sh` — pinned 7-Zip fetch + normalize script
- `docs/7zz-binaries.md` — asset table, sidecar naming, license notes

## Status

Scaffold + branding only. Next: shell/dialog plugins, 7zz list/extract
wrapper with streaming progress, virtualized file list, nested-archive temp handling.
