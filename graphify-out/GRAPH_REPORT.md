# Graph Report - QuarkZip  (2026-10-05)

## Corpus Check
- 540 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 546 nodes · 729 edges · 58 communities (33 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- package.json
- opencode.json
- tauri.conf.json
- compilerOptions
- github
- What You Must Do When Invoked
- Opencode Configuration for QuarkZip
- archive.rs
- fixtures.ts
- graphify reference: extra exports and benchmark
- devDependencies
- compilerOptions
- QuarkZip — agent instructions
- 7zz binaries for QuarkZip
- graphify reference: query, path, explain
- Tauri development (QuarkZip)
- QuarkZip
- default.json
- lib.rs
- App.tsx
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- fetch-7zz.sh
- graphify.js
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- extraction-spec.md
- build.rs
- main.rs
- code-reviewer.md
- documentation-writer.md
- tauri-app-assistant.md
- test-writer.md
- build.md
- check.md
- clean.md
- fetch-7zz.md
- tauri-build.md
- TitleBar

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `react` - 14 edges
3. `cn()` - 13 edges
4. `addArchive()` - 13 edges
5. `openViaButton()` - 13 edges
6. `What You Must Do When Invoked` - 12 edges
7. `lucide-react` - 11 edges
8. `vitest` - 11 edges
9. `ArchiveTable()` - 10 edges
10. `App()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Rules for parallel macOS/Linux development` --references--> `App()`  [EXTRACTED]
  docs/window-chrome.md → src/App.tsx
- `Steady state per-OS window settings` --references--> `App()`  [EXTRACTED]
  docs/window-chrome.md → src/App.tsx
- `Rules for parallel macOS/Linux development` --references--> `TitleBar()`  [EXTRACTED]
  docs/window-chrome.md → src/TitleBar.tsx
- `Steady state per-OS window settings` --references--> `TitleBar()`  [EXTRACTED]
  docs/window-chrome.md → src/TitleBar.tsx
- `set_decorations / set_title_bar_style async race` --references--> `run()`  [EXTRACTED]
  docs/window-chrome.md → src-tauri/src/lib.rs

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Parallel macOS/Linux chrome stack** — docs_window_chrome_steady_state, src_tauri_src_lib_run, src_app_app, src_titlebar_titlebar [EXTRACTED 1.00]

## Communities (58 total, 7 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.05
Nodes (45): lucide-react, react, @testing-library/react, @testing-library/user-event, vitest, ARCHIVE_FILTERS, ArchiveEntry, DragEvent (+37 more)

### Community 1 - "opencode.json"
Cohesion: 0.07
Nodes (31): AppHandle, ArchiveEntry, ArchiveInfo, set_decorations / set_title_bar_style async race, defer Overlay past the async style-mask rewrite, macOS needs flush opaque layout because the floating margin would show the desktop, transparent is creation-only so the rescued native bar stayed transparent, Rules for parallel macOS/Linux development (+23 more)

### Community 2 - "tauri.conf.json"
Cohesion: 0.06
Nodes (35): agents, default, list, chmod 777 *, rm -rf *, sudo *, commands, custom (+27 more)

### Community 3 - "compilerOptions"
Cohesion: 0.06
Nodes (33): name, private, scripts, build, dev, preview, tauri, test (+25 more)

### Community 4 - "github"
Cohesion: 0.14
Nodes (17): BTreeMap, Option, ArchiveEntry, ArchiveInfo, attributes_is_folder(), extract_args(), list_args(), parse_archive_info() (+9 more)

### Community 5 - "What You Must Do When Invoked"
Cohesion: 0.21
Nodes (13): addArchive(), calls(), e2e(), E2ECalls, failNextExtract(), openViaButton(), stubPicker(), test (+5 more)

### Community 6 - "Opencode Configuration for QuarkZip"
Cohesion: 0.11
Nodes (15): addArchive(), defaultInfo(), DropEvent, E2EState, FakeArchive, FakeEntry, FakeInfo, freshState() (+7 more)

### Community 7 - "archive.rs"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 8 - "fixtures.ts"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 9 - "graphify reference: extra exports and benchmark"
Cohesion: 0.12
Nodes (16): enabled, headers, oauth, type, url, Authorization, mcp, github (+8 more)

### Community 10 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, jsdom, @playwright/test, tailwindcss, @tailwindcss/vite, @tauri-apps/cli, @testing-library/jest-dom, @testing-library/react (+8 more)

### Community 11 - "compilerOptions"
Cohesion: 0.23
Nodes (11): Badge(), BadgeVariant, DOTS, STYLES, Card(), CardContent(), CardDescription(), CardHeader() (+3 more)

### Community 12 - "QuarkZip — agent instructions"
Cohesion: 0.13
Nodes (14): build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist, bundle, active, externalBin (+6 more)

### Community 13 - "7zz binaries for QuarkZip"
Cohesion: 0.14
Nodes (13): Agents, Commands, Documentation, Guardrails, Knowledge graph, MCP, Opencode Configuration for QuarkZip, Repo layout (target project) (+5 more)

### Community 14 - "graphify reference: query, path, explain"
Cohesion: 0.44
Nodes (8): applyTheme(), loadChoice(), ResolvedTheme, resolveTheme(), saveChoice(), THEME_OPTIONS, ThemeChoice, useTheme()

### Community 15 - "Tauri development (QuarkZip)"
Cohesion: 0.20
Nodes (10): dependencies, @fontsource/inter, lucide-react, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-dialog, @tauri-apps/plugin-opener (+2 more)

### Community 16 - "QuarkZip"
Cohesion: 0.22
Nodes (8): Components (`src/components/ui/` + feature components), Deliberate deviations (with rationale), Design direction, Interaction / states, Layout, QuarkZip UI guidelines, Tokens, Typography (Inter, OFL)

### Community 17 - "default.json"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 18 - "lib.rs"
Cohesion: 0.43
Nodes (7): Path, PathBuf, String, run(), should_mark_only_directories_as_folders(), should_parse_every_entry_of_real_7z_listing(), sidecar()

### Community 19 - "App.tsx"
Cohesion: 0.25
Nodes (7): Contributing, Layout (per https://v2.tauri.app/start/project-structure/), Prereqs, QuarkZip, Quickstart, References, Status

### Community 20 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 21 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.33
Nodes (5): Conventions, graphify, Guardrails, QuarkZip — agent instructions, Toolchain

### Community 22 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.33
Nodes (5): Commits — Conventional Commits v1.0.0, Contributing to QuarkZip, Examples, Rules, Types

### Community 23 - "fetch-7zz.sh"
Cohesion: 0.33
Nodes (5): 7zz binaries for QuarkZip, Assets we use, Checked-in vs fetch-at-build, License, Tauri sidecar naming

### Community 24 - "graphify.js"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 25 - "graphify reference: GitHub clone and cross-repo merge"
Cohesion: 0.33
Nodes (5): Checks, Commands, Frontend, Sidecar (7zz), Tauri development (QuarkZip)

### Community 26 - "graphify reference: transcribe video and audio"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 27 - "extraction-spec.md"
Cohesion: 0.40
Nodes (4): Measured contrast (2026-10-03), QuarkZip color system, Rules, Tokens (`src/index.css`)

### Community 28 - "build.rs"
Cohesion: 0.50
Nodes (4): formatSize(), PageSizeMenu(), choose(), onListKey()

### Community 29 - "main.rs"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 30 - "code-reviewer.md"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 31 - "documentation-writer.md"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 32 - "tauri-app-assistant.md"
Cohesion: 0.83
Nodes (3): fetch(), pick(), fetch-7zz.sh script

## Knowledge Gaps
- **248 isolated node(s):** `SortDir`, `SortKey`, `Size`, `Variant`, `TitleBarProps` (+243 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 329 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `package.json` to `compilerOptions`, `compilerOptions`, `graphify reference: query, path, explain`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `@playwright/test` connect `What You Must Do When Invoked` to `compilerOptions`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `SortDir`, `SortKey`, `Size` to the rest of the system?**
  _248 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05473684210526316 - nodes in this community are weakly interconnected._
- **Should `opencode.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06923076923076923 - nodes in this community are weakly interconnected._
- **Should `tauri.conf.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._