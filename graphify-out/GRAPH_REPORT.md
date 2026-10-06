# Graph Report - QuarkZip  (2026-10-06)

## Corpus Check
- 122 files · ~190,855 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 793 nodes · 1188 edges · 77 communities (59 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `87c63286`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- App
- opencode.json
- package.json
- archive.rs
- fixtures.ts
- backend.ts
- What You Must Do When Invoked
- compilerOptions
- mcp
- devDependencies
- cn
- checksum.rs
- Opencode Configuration for QuarkZip
- ArchiveTable.tsx
- lib.rs
- QuarkZip UI guidelines
- graphify reference: extra exports and benchmark
- list_archive_e2e.rs
- QuarkZip
- compilerOptions
- QuarkZip — agent instructions
- Commits — Conventional Commits v1.0.0
- 7zz binaries for QuarkZip
- graphify reference: query, path, explain
- Tauri development (QuarkZip)
- default.json
- QuarkZip color system
- AkiZip reference (upstream)
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- fetch-7zz.sh
- graphify.js
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- build.rs
- extraction-spec.md
- install-dev-desktop-entry.sh
- Review Checklist
- documentation-writer.md
- rust-developer.md
- tauri-app-assistant.md
- Testing Strategy
- lsp/default.md
- permissions/default.md
- quarkzip
- vitest
- LanguageContext.tsx
- check-locales.mjs
- QuarkZip translations (i18n)
- QuarkZip backend commands (`src-tauri/src/lib.rs`)
- permission
- AboutDialog.tsx
- tauri.conf.json
- github
- muse-spark-1.3-contributor-free
- App.tsx
- Security Policy
- project
- agents
- PasswordDialog.tsx
- useTheme.ts
- button.tsx
- ArchiveOverview.tsx
- TitleBar

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 31 edges
2. `react` - 20 edges
3. `vitest` - 19 edges
4. `scripts` - 16 edges
5. `lucide-react` - 16 edges
6. `compilerOptions` - 16 edges
7. `addArchive()` - 15 edges
8. `App()` - 15 edges
9. `@testing-library/react` - 14 edges
10. `@testing-library/user-event` - 14 edges

## Surprising Connections (you probably didn't know these)
- `set_decorations / set_title_bar_style async race` --references--> `run()`  [EXTRACTED]
  docs/window-chrome.md → src-tauri/src/lib.rs
- `Steady state per-OS window settings` --references--> `run()`  [EXTRACTED]
  docs/window-chrome.md → src-tauri/src/lib.rs
- `What broke in 644f03b` --references--> `run()`  [EXTRACTED]
  docs/window-chrome.md → src-tauri/src/lib.rs
- `Steady state per-OS window settings` --references--> `windows`  [EXTRACTED]
  docs/window-chrome.md → src-tauri/tauri.conf.json
- `What broke in 644f03b` --references--> `windows`  [EXTRACTED]
  docs/window-chrome.md → src-tauri/tauri.conf.json

## Import Cycles
- None detected.

## Communities (77 total, 7 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, dev, format, format:check, format:rust, format:rust:check, i18n:check (+8 more)

### Community 1 - "App"
Cohesion: 0.08
Nodes (28): set_decorations / set_title_bar_style async race, defer Overlay past the async style-mask rewrite, macOS needs flush opaque layout because the floating margin would show the desktop, transparent is creation-only so the rescued native bar stayed transparent, Rules for parallel macOS/Linux development, Steady state per-OS window settings, Steady state (what each OS gets today), What broke (2026-10-04, commit `644f03b`) (+20 more)

### Community 2 - "opencode.json"
Cohesion: 0.17
Nodes (11): commands, custom, instructions, lsp, model, plugin, $schema, skills (+3 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (37): dependencies, @fontsource/inter, lucide-react, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-dialog, @tauri-apps/plugin-opener (+29 more)

### Community 4 - "archive.rs"
Cohesion: 0.10
Nodes (20): BTreeMap, ArchiveEntry, ArchiveInfo, attributes_is_folder(), extract_args(), list_args(), parse_archive_info(), parse_list_slt() (+12 more)

### Community 5 - "fixtures.ts"
Cohesion: 0.21
Nodes (13): addArchive(), calls(), e2e(), E2ECalls, failNextExtract(), openViaButton(), stubPicker(), test (+5 more)

### Community 6 - "backend.ts"
Cohesion: 0.09
Nodes (16): addArchive(), defaultInfo(), DropEvent, E2EState, FakeArchive, FakeEntry, FakeInfo, freshState() (+8 more)

### Community 7 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 9 - "mcp"
Cohesion: 0.22
Nodes (9): mcp, ui-skills, whiteboard, enabled, type, url, command, enabled (+1 more)

### Community 10 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, husky, jsdom, lint-staged, @playwright/test, prettier, tailwindcss, @tailwindcss/vite (+11 more)

### Community 11 - "cn"
Cohesion: 0.23
Nodes (11): Badge(), BadgeVariant, DOTS, STYLES, Card(), CardContent(), CardDescription(), CardHeader() (+3 more)

### Community 12 - "checksum.rs"
Cohesion: 0.11
Nodes (17): Md5, Self, Sha1, Sha256, Sha512, ChecksumAlgo, CHUNK_BYTES, hash_bytes() (+9 more)

### Community 13 - "Opencode Configuration for QuarkZip"
Cohesion: 0.14
Nodes (13): Agents, Commands, Documentation, Guardrails, Knowledge graph, MCP, Opencode Configuration for QuarkZip, Repo layout (target project) (+5 more)

### Community 14 - "ArchiveTable.tsx"
Cohesion: 0.16
Nodes (11): lucide-react, ArchiveEntry, ArchiveTable(), baseColumns(), Column, compareValues(), ROW_HEIGHT, SortDir (+3 more)

### Community 15 - "lib.rs"
Cohesion: 0.18
Nodes (23): AppHandle, ArchiveEntry, ArchiveInfo, CHECKSUM_CANCEL, checksum_file(), ERROR_TAIL_CHARS, extract_archive(), EXTRACT_TIMEOUT_SECS (+15 more)

### Community 16 - "QuarkZip UI guidelines"
Cohesion: 0.22
Nodes (8): Components (`src/components/ui/` + feature components), Deliberate deviations (with rationale), Design direction, Interaction / states, Layout, QuarkZip UI guidelines, Tokens, Typography (Inter, OFL)

### Community 17 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 18 - "list_archive_e2e.rs"
Cohesion: 0.43
Nodes (7): Path, PathBuf, String, run(), should_mark_only_directories_as_folders(), should_parse_every_entry_of_real_7z_listing(), sidecar()

### Community 19 - "QuarkZip"
Cohesion: 0.22
Nodes (8): Contributing, Layout (per https://v2.tauri.app/start/project-structure/), Prereqs, QuarkZip, Quickstart, References, Screenshots, Status

### Community 20 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 21 - "QuarkZip — agent instructions"
Cohesion: 0.33
Nodes (5): Conventions, graphify, Guardrails, QuarkZip — agent instructions, Toolchain

### Community 22 - "Commits — Conventional Commits v1.0.0"
Cohesion: 0.29
Nodes (6): Commits — Conventional Commits v1.0.0, Contributing to QuarkZip, Examples, Rules, Translations, Types

### Community 23 - "7zz binaries for QuarkZip"
Cohesion: 0.29
Nodes (6): 7zz binaries for QuarkZip, Assets we use, Checked-in vs fetch-at-build, License, macOS Gatekeeper (dev machines), Tauri sidecar naming

### Community 24 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 25 - "Tauri development (QuarkZip)"
Cohesion: 0.33
Nodes (5): Checks, Commands, Frontend, Sidecar (7zz), Tauri development (QuarkZip)

### Community 26 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 27 - "QuarkZip color system"
Cohesion: 0.40
Nodes (4): Measured contrast (2026-10-03), QuarkZip color system, Rules, Tokens (`src/index.css`)

### Community 28 - "AkiZip reference (upstream)"
Cohesion: 0.08
Nodes (25): 0. File hierarchy (accurate, `master` root), 10. What QuarkZip borrows, 11.1 System architecture (UI → app → queue → plugins → 7zz), 11.2 Main window composition (`src/window.ui`), 11.3 Startup + distribution (Flatpak build → run), 11.4 Job lifecycle (`job_queue.py` + `status.py`), 11.5 7z invocation with progress / cancel / timeout (`sevenzip._run_7zip`), 11.6 Compress with Auto Recommend (`compress-dialog.ui` + `system_job`) (+17 more)

### Community 29 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 30 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 31 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 32 - "fetch-7zz.sh"
Cohesion: 0.83
Nodes (3): fetch(), pick(), fetch-7zz.sh script

### Community 41 - "Review Checklist"
Cohesion: 0.33
Nodes (5): Code Quality, Documentation, Review Checklist, Structure, Testing

### Community 42 - "documentation-writer.md"
Cohesion: 0.50
Nodes (3): Documentation Standards, Sources of truth (update with code, never against it), Writing Style

### Community 43 - "rust-developer.md"
Cohesion: 0.10
Nodes (19): Before committing Rust changes, Benchmarking, Code style and formatting, Concurrency, Core principles, Documentation, Error handling, Function design (+11 more)

### Community 44 - "tauri-app-assistant.md"
Cohesion: 0.50
Nodes (3): Conventions, Repo layout, Toolchain (pinned)

### Community 45 - "Testing Strategy"
Cohesion: 0.33
Nodes (5): Backend (when a harness exists), Frontend (when a harness exists), Running checks (always available), Test setup (exists — use it, extend it), Testing Strategy

### Community 53 - "lsp/default.md"
Cohesion: 0.40
Nodes (4): General settings, JSON Language Server (tauri.conf.json, opencode.json), Rust Language Server, TypeScript Language Server

### Community 54 - "permissions/default.md"
Cohesion: 0.29
Nodes (6): Bash operations (safe commands for this toolchain), Dangerous bash commands, File operations, File operations on sensitive files, Task operations, Web operations

### Community 58 - "vitest"
Cohesion: 0.16
Nodes (11): @testing-library/react, @testing-library/user-event, vitest, DATA, { ChannelStub }, invokeCtl, { ChannelStub }, invokeCtl (+3 more)

### Community 59 - "LanguageContext.tsx"
Cohesion: 0.20
Nodes (15): LanguageSwitch(), EN_KEYS, applySideEffects(), detectInitial(), interpolate(), LanguageContext, LanguageProvider(), LanguageValue (+7 more)

### Community 60 - "check-locales.mjs"
Cohesion: 0.22
Nodes (6): dir, enKeys, files, registry, registryPath, root

### Community 61 - "QuarkZip translations (i18n)"
Cohesion: 0.33
Nodes (5): Contribute a translation (PR in ~10 minutes), How the code works, Notes for translators, QuarkZip translations (i18n), Shipped languages

### Community 62 - "QuarkZip backend commands (`src-tauri/src/lib.rs`)"
Cohesion: 0.50
Nodes (3): Commands, QuarkZip backend commands (`src-tauri/src/lib.rs`), Rules

### Community 63 - "permission"
Cohesion: 0.18
Nodes (11): chmod 777 *, rm -rf *, sudo *, permission, bash, edit, glob, grep (+3 more)

### Community 64 - "AboutDialog.tsx"
Cohesion: 0.23
Nodes (11): @tauri-apps/plugin-os, openAbout(), AboutDialog(), info, APP_FALLBACK_VERSION, APP_NAME, AppInfo, buildValue() (+3 more)

### Community 65 - "tauri.conf.json"
Cohesion: 0.13
Nodes (14): build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist, bundle, active, externalBin (+6 more)

### Community 66 - "github"
Cohesion: 0.29
Nodes (7): enabled, headers, oauth, type, url, Authorization, github

### Community 67 - "muse-spark-1.3-contributor-free"
Cohesion: 0.33
Nodes (6): muse-spark-1.3-contributor-free, options, models, reasoningEffort, provider, opencode

### Community 68 - "App.tsx"
Cohesion: 0.13
Nodes (21): react, ARCHIVE_FILTERS, count(), ExtractDialog(), ExtractDoneDialog(), ExtractResult, formatSize(), OPTIONS (+13 more)

### Community 69 - "Security Policy"
Cohesion: 0.40
Nodes (4): Reporting a Vulnerability, Scope notes, Security Policy, Supported Versions

### Community 70 - "project"
Cohesion: 0.50
Nodes (4): project, description, name, type

### Community 71 - "agents"
Cohesion: 0.67
Nodes (3): agents, default, list

### Community 72 - "PasswordDialog.tsx"
Cohesion: 0.24
Nodes (9): clampPct(), PasswordDialog(), check(), Phase, clampPct(), Phase, TestDialog(), isPasswordError() (+1 more)

### Community 73 - "useTheme.ts"
Cohesion: 0.44
Nodes (8): useTheme(), applyTheme(), loadChoice(), ResolvedTheme, resolveTheme(), saveChoice(), THEME_OPTIONS, ThemeChoice

### Community 74 - "button.tsx"
Cohesion: 0.15
Nodes (12): AlgoId, ALGOS, ChecksumDialog(), start(), clampPct(), normalizeHash(), Phase, Button() (+4 more)

### Community 75 - "ArchiveOverview.tsx"
Cohesion: 0.28
Nodes (7): ArchiveInfo, ArchiveOverview(), formatEpoch(), INFO, formatDateTimeLocal(), formatModified(), formatSize()

### Community 76 - "TitleBar"
Cohesion: 0.70
Nodes (4): TitleBar(), close(), minimize(), toggleMaximize()

## Knowledge Gaps
- **365 isolated node(s):** `$schema`, `version`, `model`, `small_model`, `reasoningEffort` (+360 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 476 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `App` to `AboutDialog.tsx`, `useTheme.ts`, `LanguageContext.tsx`, `App.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `react` connect `App.tsx` to `AboutDialog.tsx`, `package.json`, `PasswordDialog.tsx`, `useTheme.ts`, `button.tsx`, `ArchiveOverview.tsx`, `cn`, `ArchiveTable.tsx`, `LanguageContext.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `model` to the rest of the system?**
  _365 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.08143939393939394 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `archive.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.10420168067226891 - nodes in this community are weakly interconnected._