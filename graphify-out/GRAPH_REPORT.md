# Graph Report - QuarkZip  (2026-10-06)

## Corpus Check
- 122 files · ~190,361 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 735 nodes · 1131 edges · 76 communities (51 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `58c1a703`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
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
- theme.ts
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
- quarkzip
- ArchiveOverview.tsx
- ArchiveTable.tsx
- check-locales.mjs
- QuarkZip translations (i18n)
- QuarkZip backend commands (`src-tauri/src/lib.rs`)
- permission
- LanguageContext.tsx
- tauri.conf.json
- github
- muse-spark-1.3-contributor-free
- PasswordDialog.tsx
- Security Policy
- project
- agents
- ChecksumDialog.tsx
- Pagination.tsx
- react
- TitleBar

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 31 edges
2. `react` - 20 edges
3. `vitest` - 19 edges
4. `lucide-react` - 16 edges
5. `compilerOptions` - 16 edges
6. `addArchive()` - 15 edges
7. `App()` - 15 edges
8. `@testing-library/react` - 14 edges
9. `openViaButton()` - 13 edges
10. `@testing-library/user-event` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Rules for parallel macOS/Linux development` --references--> `TitleBar()`  [EXTRACTED]
  docs/window-chrome.md → src/TitleBar.tsx
- `Steady state per-OS window settings` --references--> `TitleBar()`  [EXTRACTED]
  docs/window-chrome.md → src/TitleBar.tsx
- `set_decorations / set_title_bar_style async race` --references--> `run()`  [EXTRACTED]
  docs/window-chrome.md → src-tauri/src/lib.rs
- `Steady state per-OS window settings` --references--> `run()`  [EXTRACTED]
  docs/window-chrome.md → src-tauri/src/lib.rs
- `What broke in 644f03b` --references--> `run()`  [EXTRACTED]
  docs/window-chrome.md → src-tauri/src/lib.rs

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Parallel macOS/Linux chrome stack** — docs_window_chrome_steady_state, src_tauri_src_lib_run, src_app_app, src_titlebar_titlebar [EXTRACTED 1.00]

## Communities (76 total, 7 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.19
Nodes (15): AboutDialog(), info, ARCHIVE_FILTERS, AppInfo, Button(), Size, SIZES, Variant (+7 more)

### Community 1 - "App"
Cohesion: 0.08
Nodes (32): set_decorations / set_title_bar_style async race, defer Overlay past the async style-mask rewrite, macOS needs flush opaque layout because the floating margin would show the desktop, transparent is creation-only so the rescued native bar stayed transparent, Rules for parallel macOS/Linux development, Steady state per-OS window settings, Steady state (what each OS gets today), What broke (2026-10-04, commit `644f03b`) (+24 more)

### Community 2 - "opencode.json"
Cohesion: 0.17
Nodes (11): commands, custom, instructions, lsp, model, plugin, $schema, skills (+3 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (43): dependencies, @fontsource/inter, lucide-react, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-dialog, @tauri-apps/plugin-opener (+35 more)

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
Cohesion: 0.12
Nodes (16): devDependencies, jsdom, @playwright/test, tailwindcss, @tailwindcss/vite, @tauri-apps/cli, @testing-library/jest-dom, @testing-library/react (+8 more)

### Community 11 - "cn"
Cohesion: 0.23
Nodes (11): Badge(), BadgeVariant, DOTS, STYLES, Card(), CardContent(), CardDescription(), CardHeader() (+3 more)

### Community 12 - "checksum.rs"
Cohesion: 0.11
Nodes (17): Md5, Self, Sha1, Sha256, Sha512, ChecksumAlgo, CHUNK_BYTES, hash_bytes() (+9 more)

### Community 13 - "Opencode Configuration for QuarkZip"
Cohesion: 0.14
Nodes (13): Agents, Commands, Documentation, Guardrails, Knowledge graph, MCP, Opencode Configuration for QuarkZip, Repo layout (target project) (+5 more)

### Community 14 - "theme.ts"
Cohesion: 0.44
Nodes (8): applyTheme(), loadChoice(), ResolvedTheme, resolveTheme(), saveChoice(), THEME_OPTIONS, ThemeChoice, useTheme()

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

### Community 58 - "ArchiveOverview.tsx"
Cohesion: 0.28
Nodes (7): ArchiveInfo, ArchiveOverview(), formatEpoch(), INFO, formatDateTimeLocal(), formatModified(), formatSize()

### Community 59 - "ArchiveTable.tsx"
Cohesion: 0.07
Nodes (25): @testing-library/react, @testing-library/user-event, vitest, ArchiveEntry, DragEvent, dragHandlers, extractCtl, osCtl (+17 more)

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

### Community 64 - "LanguageContext.tsx"
Cohesion: 0.18
Nodes (18): setFormatLocale(), EN_KEYS, Switcher(), TProbe(), applySideEffects(), detectInitial(), interpolate(), LanguageContext (+10 more)

### Community 65 - "tauri.conf.json"
Cohesion: 0.13
Nodes (14): build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist, bundle, active, externalBin (+6 more)

### Community 66 - "github"
Cohesion: 0.29
Nodes (7): enabled, headers, oauth, type, url, Authorization, github

### Community 67 - "muse-spark-1.3-contributor-free"
Cohesion: 0.33
Nodes (6): muse-spark-1.3-contributor-free, options, models, reasoningEffort, provider, opencode

### Community 68 - "PasswordDialog.tsx"
Cohesion: 0.24
Nodes (9): isPasswordError(), MARKERS, clampPct(), PasswordDialog(), check(), Phase, clampPct(), Phase (+1 more)

### Community 69 - "Security Policy"
Cohesion: 0.40
Nodes (4): Reporting a Vulnerability, Scope notes, Security Policy, Supported Versions

### Community 70 - "project"
Cohesion: 0.50
Nodes (4): project, description, name, type

### Community 71 - "agents"
Cohesion: 0.67
Nodes (3): agents, default, list

### Community 72 - "ChecksumDialog.tsx"
Cohesion: 0.24
Nodes (7): AlgoId, ALGOS, ChecksumDialog(), start(), clampPct(), normalizeHash(), Phase

### Community 73 - "Pagination.tsx"
Cohesion: 0.28
Nodes (7): formatSize(), OPTIONS, PAGE_SIZES, PageSize, PageSizeMenu(), choose(), onListKey()

### Community 74 - "react"
Cohesion: 0.29
Nodes (5): lucide-react, react, CHOICE_ICON, ThemeSwitch(), TitleBarProps

### Community 75 - "TitleBar"
Cohesion: 0.70
Nodes (4): TitleBar(), close(), minimize(), toggleMaximize()

## Knowledge Gaps
- **310 isolated node(s):** `$schema`, `version`, `model`, `small_model`, `reasoningEffort` (+305 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 426 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Steady state per-OS window settings` connect `App` to `TitleBar`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `App()` connect `App` to `App.tsx`, `ArchiveTable.tsx`, `LanguageContext.tsx`, `theme.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `App.tsx`, `LanguageContext.tsx`, `package.json`, `PasswordDialog.tsx`, `ChecksumDialog.tsx`, `Pagination.tsx`, `cn`, `theme.ts`, `ArchiveOverview.tsx`, `ArchiveTable.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `model` to the rest of the system?**
  _310 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.08095238095238096 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `archive.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.10420168067226891 - nodes in this community are weakly interconnected._