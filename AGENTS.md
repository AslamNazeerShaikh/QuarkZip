# QuarkZip — agent instructions

Visual 7-Zip archive manager for macOS (first), then Windows/Linux. Tauri 2 + React + Tailwind v4 frontend (`src/`) + Rust backend (`src-tauri/`) with the 7-Zip engine compiled in-process from committed `vendor/7zip` sources (no sidecar, no spawned processes).

## Toolchain

- Node 20+, Rust stable, Xcode CLT (macOS). npm only (no pnpm).
- `npm install` → `npm run tauri dev` (dev window); `npm run build` = `tsc && vite build`; `npm run tauri build` = installer.
- Rust: `cargo check` / `cargo build` run inside `src-tauri/`.
- Tests: `npm test` (Vitest + Testing Library, `npm run test:coverage` for v8 report), `npm run test:rust` (`cargo test` in `src-tauri/`).
- 7-Zip sources: committed `vendor/7zip` tree (pinned 26.04, ABI-frozen — builds never fetch upstream); `./scripts/fetch-7z-src.sh` is the documented _upgrade_ path only. The legacy `7zz` sidecar consoles (`./scripts/fetch-7zz.sh`, `src-tauri/binaries/`) are retired: nothing spawns them, nothing bundles them — see `docs/7zz-binaries.md`.
- Full agent/skill/command inventory lives in `.opencode/README.md`; config in `.opencode/opencode.json`.

## Conventions

- Frontend: React + Tailwind v4 (`src/main.tsx` entry, `src/App.tsx`, `src/index.css` with `@import "tailwindcss"`); `tsconfig.json` uses `jsx: react-jsx` + `vite/client` types.
- Backend: Tauri commands in `src-tauri/src/lib.rs` (`#[tauri::command]` + `generate_handler!`); keep `main.rs` as the thin launcher.
- Rust authority: `rust-developer` is the PRIMARY agent whenever Rust is written or modified — switch to it (`> agent rust-developer`); its rules come from the enforced Rust quality guide in `.opencode/agents/rust-developer.md`.
- 7-Zip access is in-process only (`src-tauri/ffi/bridge.*` over committed `vendor/7zip`): never spawn processes, never shell-string interpolation; test/list progress streams over Channels; extract nested archives to `$TEMP` only.
- Large archives: enumerate in-process in batches, virtualize lists (never full DOM render), never block the UI thread.
- Never install toolchains, packages, or tools automatically — give copy-pasteable commands instead.
- Commits follow Conventional Commits v1.0.0 (`CONTRIBUTING.md`): `<type>[scope]: <description>`, imperative, lowercase, ≤72 chars; `BREAKING CHANGE:` footer for breaking changes.

## Guardrails

- Destructive bash is denied (`rm -rf *`, `sudo *`, `chmod 777 *`, force-push, `curl * | bash` — full list in `.opencode/permissions/default.md`).
- Never read or write secrets (`.env*`, `*.key`, `*.pem`, `secrets.*`, `credentials.*`).
- 7-Zip trademark belongs to Igor Pavlov; RAR is proprietary — no `7-Zip`/`RAR` claims in app name, strings, or docs.

## graphify

This project uses the shared graphify skill (`.opencode/skills/graphify/`) and reminder plugin (`.opencode/plugins/graphify.js`).

Rules (apply once `graphify-out/graph.json` exists):

- For codebase questions, first run `graphify query "<question>"`. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
