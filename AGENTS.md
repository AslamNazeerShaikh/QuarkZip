# QuarkZip — agent instructions

Visual 7-Zip archive manager for macOS (first), then Windows/Linux. Tauri 2 + React + Tailwind v4 frontend (`src/`) + Rust backend (`src-tauri/`), shelling out to a pinned 7-Zip console sidecar (`src-tauri/binaries/7zz-<target-triple>`).

## Toolchain

- Node 20+, Rust stable, Xcode CLT (macOS). npm only (no pnpm).
- `npm install` → `npm run tauri dev` (dev window); `npm run build` = `tsc && vite build`; `npm run tauri build` = installer.
- Rust: `cargo check` / `cargo build` run inside `src-tauri/`.
- Tests: `npm test` (Vitest + Testing Library, `npm run test:coverage` for v8 report), `npm run test:rust` (`cargo test` in `src-tauri/`).
- 7zz sidecars: `./scripts/fetch-7zz.sh` (pinned 7-Zip 26.03, fetch-at-build, gitignored) — see `docs/7zz-binaries.md`. Never commit binaries without removing the `.gitignore` exception deliberately.
- Full agent/skill/command inventory lives in `.opencode/README.md`; config in `.opencode/opencode.json`.

## Conventions

- Frontend: React + Tailwind v4 (`src/main.tsx` entry, `src/App.tsx`, `src/index.css` with `@import "tailwindcss"`); `tsconfig.json` uses `jsx: react-jsx` + `vite/client` types.
- Backend: Tauri commands in `src-tauri/src/lib.rs` (`#[tauri::command]` + `generate_handler!`); keep `main.rs` as the thin launcher.
- Rust authority: `rust-developer` is the PRIMARY agent whenever Rust is written or modified — switch to it (`> agent rust-developer`); its rules come from the enforced Rust quality guide in `.opencode/agents/rust-developer.md`.
- 7zz access only via the sidecar (`externalBin: binaries/7zz`): spawn with explicit args, never shell-string interpolation; stream stdout (`-bsp1`) for progress, support cancel/timeout; extract nested archives to `$TEMP` only.
- Large archives: stream `7zz l -slt` output line-by-line, virtualize lists (never full DOM render), never block the UI thread.
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
