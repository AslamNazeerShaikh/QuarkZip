# Graph Report - QuarkZip  (2026-10-07)

## Corpus Check
- 267 files · ~398,822 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2297 nodes · 3357 edges · 216 communities (195 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `31507a08`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- PageJump
- opencode.json
- package.json
- archive.rs
- fixtures.ts
- backend.ts
- What You Must Do When Invoked
- compilerOptions
- mcp
- devDependencies
- ArchiveOverview.tsx
- checksum.rs
- Opencode Configuration for QuarkZip
- MacPacker reference (upstream)
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
- collect_sources
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
- dependencies
- LanguageContext.tsx
- check-locales.mjs
- QuarkZip translations (i18n)
- QuarkZip backend commands (`src-tauri/src/lib.rs`)
- permission
- 7-Zip reference (upstream)
- App
- github
- muse-spark-1.3-contributor-free
- hig-lookup.md
- Security Policy
- project
- agents
- vite.config.ts
- lint-staged
- TitleBar
- bridge.cpp
- sevenzip.rs
- pull-hig.mjs
- ArchiveTable.tsx
- vitest
- PasswordDialog.tsx
- ChecksumDialog.tsx
- format.ts
- AboutDialog.tsx
- fetch-7z-src.sh
- Typography
- Live Activities
- Widgets
- Apple Pay
- Machine learning
- Apple Design Skill
- App Clips
- The menu bar
- Standard icons
- HIG reference lookup
- Color
- Apple Design Skill
- Buttons
- Sign in with Apple
- Augmented reality
- File management
- Liquid Glass
- Tablet (iPadOS)
- Toolbars
- Apple Pencil and Scribble
- Charts
- Design principles
- Designing for iPhone Duo
- Generative AI
- Inclusion
- Menus
- Playing haptics
- Privacy
- Search fields
- SF Symbols
- AirPlay
- Alerts
- App icons
- Apple In-App Purchase
- Dark Mode
- Gestures
- Toggles
- Accessibility
- App Shortcuts
- Layout
- Lists and tables
- Maps
- Notifications
- Settings
- Windows
- QuarkZip native macOS direction
- apple-design/AGENTS.md
- Context menus
- Designing for games
- Drag and drop
- Edit menus
- Materials
- Multitasking
- Playing audio
- Playing video
- Right to left
- Scroll views
- Segmented controls
- Sheets
- Siri
- Split views
- Virtual keyboards
- Boxes
- Controls
- Disclosure controls
- Game controls
- Gauges
- Going full screen
- Image views
- Keyboards
- Launching
- Motion
- Offering help
- Onboarding
- Page controls
- Pickers
- Progress indicators
- Sidebars
- Sliders
- Tab bars
- Tab views
- Text fields
- Charting data
- Entering data
- Focus and selection
- Images
- Labels
- Live-viewing apps
- Loading
- Managing accounts
- Managing notifications
- Pop-up buttons
- Popovers
- Pull-down buttons
- Searching
- Snippets
- Text views
- Undo and redo
- VoiceOver
- Writing
- Action sheets
- Activity views
- Branding
- Collaboration and sharing
- Collections
- Color wells
- iCloud
- Modality
- Panels
- Printing
- Rating indicators
- Steppers
- contrast-check.py
- Cross-platform translation
- Column views
- Combo boxes
- Dock menus
- Feedback
- Gyroscope and accelerometer
- Home Screen quick actions
- Image wells
- NFC
- Outline views
- Path controls
- Ratings and reviews
- Token fields
- Web views
- macOS design (QuarkZip)
- macos-design-reviewer.md
- App.tsx

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 34 edges
2. `QzList` - 21 edges
3. `App()` - 21 edges
4. `react` - 20 edges
5. `vitest` - 20 edges
6. `lucide-react` - 17 edges
7. `scripts` - 16 edges
8. `compilerOptions` - 16 edges
9. `HIG reference lookup` - 16 edges
10. `addArchive()` - 15 edges

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

## Communities (216 total, 9 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, dev, format, format:check, format:rust, format:rust:check, i18n:check (+8 more)

### Community 1 - "PageJump"
Cohesion: 0.60
Nodes (6): PageJump(), cancelJump(), commit(), confirmJump(), jumpTo(), revert()

### Community 2 - "opencode.json"
Cohesion: 0.17
Nodes (11): commands, custom, instructions, lsp, model, plugin, $schema, skills (+3 more)

### Community 3 - "package.json"
Cohesion: 0.09
Nodes (22): name, private, type, version, @fontsource/inter, husky, jsdom, lint-staged (+14 more)

### Community 4 - "archive.rs"
Cohesion: 0.06
Nodes (48): Ordering, ArchiveEntry, ArchiveInfo, attributes_is_folder(), block_to_facts(), cmp_natural(), entry_from_facts(), EntryFacts (+40 more)

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

### Community 11 - "ArchiveOverview.tsx"
Cohesion: 0.15
Nodes (16): Badge(), BadgeVariant, DOTS, STYLES, Button(), Size, SIZES, Variant (+8 more)

### Community 12 - "checksum.rs"
Cohesion: 0.11
Nodes (17): Md5, Sha1, Sha256, Sha512, ChecksumAlgo, CHUNK_BYTES, hash_bytes(), hash_file_async() (+9 more)

### Community 13 - "Opencode Configuration for QuarkZip"
Cohesion: 0.14
Nodes (13): Agents, Commands, Documentation, Guardrails, Knowledge graph, MCP, Opencode Configuration for QuarkZip, Repo layout (target project) (+5 more)

### Community 14 - "MacPacker reference (upstream)"
Cohesion: 0.08
Nodes (25): 0. File hierarchy (accurate, `main` root, ~361 entries), 10. Edge cases (changelog archaeology) + error paths, 11. QuarkZip takeaways (adopt / avoid / divergent), 12.1 The five apps (main `/compare`: 68 formats · 9 capabilities), 12.2 Capability matrix (verbatim descriptions; Y = Yes, P = Partial, – = No), 12.3 Format matrix, all 68 rows (cells are Read/Write; Y/P/–), 12.4 Staleness audit vs MacPacker v1.0.0 + reading for QuarkZip, 12. Appendix A — compare pages in full (`macpacker.app/en/compare*`, fetched Oct 2026) (+17 more)

### Community 15 - "lib.rs"
Cohesion: 0.13
Nodes (36): AppHandle, ArchiveInfo, Mutex, Send, apply_window_glass(), CHECKSUM_CANCEL, checksum_file(), ERROR_TAIL_CHARS (+28 more)

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
Cohesion: 0.33
Nodes (5): Accent system (`data-accent`, default blue), Measured contrast (`scripts/contrast-check.py`: 30/30 gated PASS + documented exceptions), QuarkZip color system, Rules, Tokens (`src/index.css`)

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

### Community 36 - "collect_sources"
Cohesion: 0.36
Nodes (7): build_7zip_ffi(), collect_sources(), copy_sidecar_for_dev(), main(), Path, PathBuf, Vec

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

### Community 58 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @fontsource/inter, lucide-react, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-dialog, @tauri-apps/plugin-opener (+2 more)

### Community 59 - "LanguageContext.tsx"
Cohesion: 0.14
Nodes (22): react, LanguageSwitch(), CHOICE_ICON, ThemeSwitch(), TitleBarProps, EN_KEYS, Switcher(), TProbe() (+14 more)

### Community 60 - "check-locales.mjs"
Cohesion: 0.22
Nodes (6): dir, enKeys, files, registry, registryPath, root

### Community 61 - "QuarkZip translations (i18n)"
Cohesion: 0.33
Nodes (5): Contribute a translation (PR in ~10 minutes), How the code works, Notes for translators, QuarkZip translations (i18n), Shipped languages

### Community 62 - "QuarkZip backend commands (`src-tauri/src/lib.rs`)"
Cohesion: 0.40
Nodes (4): `ArchiveInfo` schema (fixed 16 cells + More panel), Commands, QuarkZip backend commands (`src-tauri/src/lib.rs`), Rules

### Community 63 - "permission"
Cohesion: 0.18
Nodes (11): chmod 777 *, rm -rf *, sudo *, permission, bash, edit, glob, grep (+3 more)

### Community 64 - "7-Zip reference (upstream)"
Cohesion: 0.22
Nodes (8): 0. Download page (7-zip.org/download.html, 26.04), 1. Repo tree + build (`ip7z/7zip@main`, 1351 entries, Make-only), 2. Embedding API (no stable public C API for the full engine), 3. Formats, limits, technical claims, 4. History, reception, security, variants, 5. Licensing (repo `DOC/`, Wikipedia concurs), 6. Binding 7-Zip into our Rust backend (MacPacker-style) — feasible, phased, 7-Zip reference (upstream)

### Community 65 - "App"
Cohesion: 0.05
Nodes (51): set_decorations / set_title_bar_style async race, defer Overlay past the async style-mask rewrite, macOS needs flush opaque layout because the floating margin would show the desktop, transparent is creation-only so the rescued native bar stayed transparent, Rules for parallel macOS/Linux development, Steady state per-OS window settings, Steady state (what each OS gets today), What broke (2026-10-04, commit `644f03b`) (+43 more)

### Community 66 - "github"
Cohesion: 0.29
Nodes (7): enabled, headers, oauth, type, url, Authorization, github

### Community 67 - "muse-spark-1.3-contributor-free"
Cohesion: 0.33
Nodes (6): muse-spark-1.3-contributor-free, options, models, reasoningEffort, provider, opencode

### Community 68 - "hig-lookup.md"
Cohesion: 0.06
Nodes (9): Best practices, Designing for iOS, Best practices, Designing for iPadOS, Best practices, Designing for macOS, Best practices, Platform considerations (+1 more)

### Community 69 - "Security Policy"
Cohesion: 0.40
Nodes (4): Reporting a Vulnerability, Scope notes, Security Policy, Supported Versions

### Community 70 - "project"
Cohesion: 0.50
Nodes (4): project, description, name, type

### Community 71 - "agents"
Cohesion: 0.67
Nodes (3): agents, default, list

### Community 72 - "vite.config.ts"
Cohesion: 0.40
Nodes (3): @tailwindcss/vite, @vitejs/plugin-react, e2eMocks

### Community 75 - "TitleBar"
Cohesion: 0.70
Nodes (4): TitleBar(), close(), minimize(), toggleMaximize()

### Community 76 - "bridge.cpp"
Cohesion: 0.08
Nodes (37): BSTR, CArchiveLink, CCodecs, CIntVector, CObjectVector, COpenType, CPropVariant, HRESULT (+29 more)

### Community 77 - "sevenzip.rs"
Cohesion: 0.12
Nodes (32): ArchiveEntry, c_char, c_int, CANCELLED, enumerate_detail(), ListingData, qz_archive_prop(), qz_archive_prop_count() (+24 more)

### Community 78 - "pull-hig.mjs"
Cohesion: 0.07
Nodes (65): abstractOf(), ALL_PLATFORMS, anchorEntries(), anchorMapFor(), cellText(), collapseBlankLines(), collectReferences(), coveredPlatformsLine() (+57 more)

### Community 79 - "ArchiveTable.tsx"
Cohesion: 0.14
Nodes (11): lucide-react, ArchiveEntry, ArchiveTable(), baseColumns(), Column, ROW_HEIGHT, SortDir, SortKey (+3 more)

### Community 80 - "vitest"
Cohesion: 0.09
Nodes (17): @testing-library/react, @testing-library/user-event, vitest, DragEvent, dragHandlers, extractCtl, listCtl, osCtl (+9 more)

### Community 81 - "PasswordDialog.tsx"
Cohesion: 0.24
Nodes (9): clampPct(), PasswordDialog(), check(), Phase, clampPct(), Phase, TestDialog(), isPasswordError() (+1 more)

### Community 82 - "ChecksumDialog.tsx"
Cohesion: 0.24
Nodes (7): AlgoId, ALGOS, ChecksumDialog(), start(), clampPct(), normalizeHash(), Phase

### Community 83 - "format.ts"
Cohesion: 0.18
Nodes (9): ArchiveOverview(), formatEpoch(), LoadDialog(), LoadStats, { ChannelStub }, invokeCtl, formatDateTimeLocal(), formatModified() (+1 more)

### Community 84 - "AboutDialog.tsx"
Cohesion: 0.23
Nodes (11): @tauri-apps/plugin-os, openAbout(), AboutDialog(), info, APP_FALLBACK_VERSION, APP_NAME, AppInfo, buildValue() (+3 more)

### Community 87 - "Typography"
Cohesion: 0.06
Nodes (33): AX1, AX2, AX3, AX4, AX5, Change log, Conveying hierarchy, Desktop (macOS) (+25 more)

### Community 88 - "Live Activities"
Cohesion: 0.07
Nodes (28): Adding transitions and animating content updates, Anatomy, Best practices, CarPlay, CarPlay dimensions, Change log, Choosing colors, Compact (+20 more)

### Community 89 - "Widgets"
Cohesion: 0.08
Nodes (24): Accented, Accessory widgets, Adding interactivity, Anatomy, Appearances, Best practices, Change log, Choosing margins and padding (+16 more)

### Community 90 - "Apple Pay"
Cohesion: 0.09
Nodes (23): Apple Pay, Apple Pay button, Apple Pay mark, Black, Button size and position, Button styles, Button types, Change log (+15 more)

### Community 91 - "Machine learning"
Cohesion: 0.10
Nodes (20): Attribution, Calibration, Change log, Confidence, Corrections, Critical or complementary, Dynamic or static, Explicit feedback (+12 more)

### Community 92 - "Apple Design Skill"
Cohesion: 0.11
Nodes (18): Always load, Apple Design Skill, Apple's design principles, Design improvement mode, Lens 1: Accessibility (failures are Critical), Lens 2: Platform conventions (failures are usually High), Lens 3: Visual design and craft (findings are High or Medium), Lens 4: Interaction (findings are usually Medium) (+10 more)

### Community 93 - "App Clips"
Cohesion: 0.11
Nodes (18): App Clip Codes, App Clips, Change log, Creating App Clips for businesses, Creating content for an App Clip card, Customizing your App Clip Code, Designing your App Clip, Displaying App Clip Codes (+10 more)

### Community 94 - "The menu bar"
Cohesion: 0.11
Nodes (18): Anatomy, App menu, App-specific menus, Best practices, Change log, Desktop (macOS), Dynamic menu items, Edit menu (+10 more)

### Community 95 - "Standard icons"
Cohesion: 0.12
Nodes (17): Best practices, Change log, Desktop (macOS), Document icons, Editing, Icons, Layer ordering, Other (+9 more)

### Community 96 - "HIG reference lookup"
Cohesion: 0.12
Nodes (16): Components › Content, Components › Layout and organization, Components › Menus and actions, Components › Navigation and search, Components › Presentation, Components › Selection and input, Components › Status, Components › System experiences (+8 more)

### Community 97 - "Color"
Cohesion: 0.13
Nodes (15): App accent colors, Best practices, Change log, Color, Color management, Desktop (macOS), Inclusive color, iOS, iPadOS system gray colors (+7 more)

### Community 98 - "Apple Design Skill"
Cohesion: 0.14
Nodes (13): Apple Design Skill, Claude Code, by hand, Codex, Cursor, Install, Keeping the references current, Origin and license, Other agents (+5 more)

### Community 99 - "Buttons"
Cohesion: 0.14
Nodes (14): Best practices, Buttons, Change log, Content, Desktop (macOS), Help buttons, Image buttons, Mobile (iOS, iPadOS) (+6 more)

### Community 100 - "Sign in with Apple"
Cohesion: 0.14
Nodes (14): Black, Button size and corner radius, Change log, Collecting data, Creating a custom Sign in with Apple button, Custom buttons with a logo and text, Custom logo-only buttons, Displaying buttons (+6 more)

### Community 101 - "Augmented reality"
Cohesion: 0.15
Nodes (13): Augmented reality, Best practices, Communicating with people, Designing object interactions, Handling interruptions, Helping people place objects, Icons and badges, Offering a multiuser experience (+5 more)

### Community 102 - "File management"
Cohesion: 0.15
Nodes (13): Change log, Creating and opening files, Custom file management, Desktop (macOS), Document launcher, File management, File provider app extension, Finder Sync extensions (+5 more)

### Community 103 - "Liquid Glass"
Cohesion: 0.15
Nodes (13): Apple's rules, Color on glass, Cross-platform translation, Flutter, Liquid Glass, React Native, Related guidelines, Review checklist (+5 more)

### Community 104 - "Tablet (iPadOS)"
Cohesion: 0.15
Nodes (13): Best practices, Change log, Customizing pointers, Desktop (macOS), Platform considerations, Pointer accessories, Pointer magnetism, Pointer shape and content effects (+5 more)

### Community 105 - "Toolbars"
Cohesion: 0.17
Nodes (12): Actions, Best practices, Change log, Desktop (macOS), Item groupings, Navigation, Phone (iOS), Platform considerations (+4 more)

### Community 106 - "Apple Pencil and Scribble"
Cohesion: 0.18
Nodes (11): Apple Pencil and Scribble, Barrel roll, Best practices, Change log, Custom drawing, Double tap, Hover, Platform considerations (+3 more)

### Community 107 - "Charts"
Cohesion: 0.18
Nodes (11): Anatomy, Axes, Best practices, Change log, Charts, Color, Descriptive content, Enhancing the accessibility of a chart (+3 more)

### Community 108 - "Design principles"
Cohesion: 0.18
Nodes (10): Agency, Change log, Craft, Delight, Design principles, Familiarity, Flexibility, Purpose (+2 more)

### Community 109 - "Designing for iPhone Duo"
Cohesion: 0.18
Nodes (11): Anatomy, Arrangement views, Best practices, Change log, Designing for iPhone Duo, Device poses, Dynamic layouts, Related guidelines (+3 more)

### Community 110 - "Generative AI"
Cohesion: 0.18
Nodes (11): Best practices, Change log, Continuous improvement, Generative AI, Inputs, Models and datasets, Outputs, Platform considerations (+3 more)

### Community 111 - "Inclusion"
Cohesion: 0.18
Nodes (11): Accessibility, Avoiding stereotypes, Being approachable, Gender identity, Inclusion, Inclusive by design, Languages, People and settings (+3 more)

### Community 112 - "Menus"
Cohesion: 0.18
Nodes (11): Change log, Icons, In-game menus, Labels, Menus, Mobile (iOS, iPadOS), Organization, Platform considerations (+3 more)

### Community 113 - "Playing haptics"
Cohesion: 0.18
Nodes (11): Best practices, Change log, Custom haptics, Desktop (macOS), Impact, Notification, Phone (iOS), Platform considerations (+3 more)

### Community 114 - "Privacy"
Cohesion: 0.18
Nodes (11): Best practices, Change log, Desktop (macOS), Location button, Platform considerations, Pre-alert screens, windows, or views, Privacy, Protecting data (+3 more)

### Community 115 - "Search fields"
Cohesion: 0.18
Nodes (11): Best practices, Change log, Phone (iOS), Platform considerations, Related guidelines, Scope bars and tokens, Search as a tab, Search as an inline field (+3 more)

### Community 116 - "SF Symbols"
Cohesion: 0.18
Nodes (11): Animations, Change log, Custom symbols, Design variants, Gradients, Platform considerations, Related guidelines, Rendering modes (+3 more)

### Community 117 - "AirPlay"
Cohesion: 0.20
Nodes (9): AirPlay, Best practices, Black AirPlay icon, Change log, Custom color AirPlay icon, Platform considerations, Referring to AirPlay, Using AirPlay icons (+1 more)

### Community 118 - "Alerts"
Cohesion: 0.20
Nodes (10): Alerts, Anatomy, Best practices, Buttons, Change log, Content, Desktop (macOS), Mobile (iOS, iPadOS) (+2 more)

### Community 119 - "App icons"
Cohesion: 0.20
Nodes (10): App icons, Appearances, Change log, Design, Icon shape, Layer design, Platform considerations, Related guidelines (+2 more)

### Community 120 - "Apple In-App Purchase"
Cohesion: 0.20
Nodes (10): Apple In-App Purchase, Auto-renewable subscriptions, Best practices, Change log, Helping people manage their subscriptions, Making signup effortless, Platform considerations, Providing help (+2 more)

### Community 121 - "Dark Mode"
Cohesion: 0.20
Nodes (10): Best practices, Change log, Dark Mode, Dark Mode colors, Desktop (macOS), Icons and images, Mobile (iOS, iPadOS), Platform considerations (+2 more)

### Community 122 - "Gestures"
Cohesion: 0.20
Nodes (10): Best practices, Change log, Custom gestures, Desktop (macOS), Gestures, Mobile (iOS, iPadOS), Platform considerations, Related guidelines (+2 more)

### Community 123 - "Toggles"
Cohesion: 0.20
Nodes (10): Best practices, Change log, Checkboxes, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Radio buttons, Related guidelines (+2 more)

### Community 124 - "Accessibility"
Cohesion: 0.22
Nodes (9): Accessibility, Change log, Cognitive, Hearing, Mobility, Platform considerations, Related guidelines, Speech (+1 more)

### Community 125 - "App Shortcuts"
Cohesion: 0.22
Nodes (9): App Shortcuts, Best practices, Change log, Desktop (macOS), Editorial guidelines, Mobile (iOS, iPadOS), Platform considerations, Related guidelines (+1 more)

### Community 126 - "Layout"
Cohesion: 0.22
Nodes (9): Adaptability, Change log, Desktop (macOS), Guides and safe areas, Layout, Platform considerations, Related guidelines, Size classes (+1 more)

### Community 127 - "Lists and tables"
Cohesion: 0.22
Nodes (9): Best practices, Change log, Content, Desktop (macOS), Lists and tables, Mobile (iOS, iPadOS, visionOS), Platform considerations, Related guidelines (+1 more)

### Community 128 - "Maps"
Cohesion: 0.22
Nodes (9): Adding place cards outside of a map, Best practices, Change log, Custom information, Displaying place cards in a map, Indoor maps, Maps, Place cards (+1 more)

### Community 129 - "Notifications"
Cohesion: 0.22
Nodes (9): Anatomy, Badging, Best practices, Change log, Content, Notification actions, Notifications, Platform considerations (+1 more)

### Community 130 - "Settings"
Cohesion: 0.22
Nodes (9): Best practices, Change log, Desktop (macOS), General settings, Platform considerations, Related guidelines, Settings, System settings (+1 more)

### Community 131 - "Windows"
Cohesion: 0.22
Nodes (9): Best practices, Change log, Desktop (macOS), macOS window anatomy, macOS window states, Platform considerations, Related guidelines, Tablet (iPadOS) (+1 more)

### Community 132 - "QuarkZip native macOS direction"
Cohesion: 0.18
Nodes (10): 1. Sources, verdicts, cross-checks, 2. HIG groundings (with citations), 3. What changed in this pass (and what deliberately didn't), 4. Motion (springs where touchable, restraint everywhere else), 5. Native patterns checklist (Tauri desktop), 6. Skill + review protocol, 7. MCP verdict: no new servers, 8. Liquid-glass window background (native, macOS only) (+2 more)

### Community 133 - "apple-design/AGENTS.md"
Cohesion: 0.25
Nodes (6): Checks before finishing any change, Conventions, File map, Refreshing the references, Running a design review, What this repository is

### Community 134 - "Context menus"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Content, Context menus, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 135 - "Designing for games"
Cohesion: 0.25
Nodes (8): Adopt Apple technologies, Change log, Designing for games, Enable intuitive interactions, Jump into gameplay, Look stunning on every display, Related guidelines, Welcome everyone

### Community 136 - "Drag and drop"
Cohesion: 0.25
Nodes (8): Accepting drops, Best practices, Change log, Desktop (macOS), Drag and drop, Mobile (iOS, iPadOS), Platform considerations, Providing feedback

### Community 137 - "Edit menus"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Content, Desktop (macOS), Edit menus, Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 138 - "Materials"
Cohesion: 0.25
Nodes (8): Change log, Desktop (macOS), Liquid Glass, Materials, Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Standard materials

### Community 139 - "Multitasking"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Desktop (macOS), Multitasking, Phone (iOS), Platform considerations, Related guidelines, Tablet (iPadOS)

### Community 140 - "Playing audio"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Desktop (macOS), Handling interruptions, Mobile (iOS, iPadOS), Platform considerations, Playing audio, Related guidelines

### Community 141 - "Playing video"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Exiting playback, Integrating with the TV app, Loading content, Platform considerations, Playing video, Related guidelines

### Community 142 - "Right to left"
Cohesion: 0.25
Nodes (8): Controls, Images, Interface icons, Numbers and characters, Platform considerations, Related guidelines, Right to left, Text alignment

### Community 143 - "Scroll views"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Scroll edge effects, Scroll views

### Community 144 - "Segmented controls"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Content, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Segmented controls

### Community 145 - "Sheets"
Cohesion: 0.25
Nodes (8): Anatomy, Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Sheets

### Community 146 - "Siri"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Customizing your app’s experience with Siri, Editorial guidelines, Getting your app to work with Siri, Related guidelines, Sharing contextual information, Siri

### Community 147 - "Split views"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Desktop (macOS), Phone (iOS), Platform considerations, Related guidelines, Split views, Tablet (iPadOS)

### Community 148 - "Virtual keyboards"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Custom input views, Custom keyboards, Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Virtual keyboards

### Community 149 - "Boxes"
Cohesion: 0.29
Nodes (7): Best practices, Boxes, Content, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 150 - "Controls"
Cohesion: 0.29
Nodes (7): Anatomy, Best practices, Camera experiences on a locked device, Change log, Controls, Platform considerations, Related guidelines

### Community 151 - "Disclosure controls"
Cohesion: 0.29
Nodes (7): Best practices, Disclosure buttons, Disclosure controls, Disclosure triangles, Mobile (iOS, iPadOS, visionOS), Platform considerations, Related guidelines

### Community 152 - "Game controls"
Cohesion: 0.29
Nodes (7): Change log, Game controls, Keyboards, Physical controllers, Platform considerations, Related guidelines, Touch controls

### Community 153 - "Gauges"
Cohesion: 0.29
Nodes (7): Anatomy, Best practices, Change log, Desktop (macOS), Gauges, Platform considerations, Related guidelines

### Community 154 - "Going full screen"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Desktop (macOS), Going full screen, Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 155 - "Image views"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Content, Desktop (macOS), Image views, Platform considerations, Related guidelines

### Community 156 - "Keyboards"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Custom keyboard shortcuts, Keyboards, Platform considerations, Related guidelines, Standard keyboard shortcuts

### Community 157 - "Launching"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Launch screens, Launching, Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 158 - "Motion"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Leveraging platform capabilities, Motion, Platform considerations, Providing feedback, Related guidelines

### Community 159 - "Offering help"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Creating tips, Desktop (macOS, visionOS), Offering help, Platform considerations, Related guidelines

### Community 160 - "Onboarding"
Cohesion: 0.29
Nodes (7): Additional content, Additional requests, Best practices, Change log, Onboarding, Platform considerations, Related guidelines

### Community 161 - "Page controls"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Customizing indicators, Mobile (iOS, iPadOS), Page controls, Platform considerations, Related guidelines

### Community 162 - "Pickers"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Pickers, Platform considerations, Related guidelines

### Community 163 - "Progress indicators"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Progress indicators, Refresh content controls

### Community 164 - "Sidebars"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Sidebars

### Community 165 - "Sliders"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Sliders

### Community 166 - "Tab bars"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Phone (iOS), Platform considerations, Related guidelines, Tab bars, Tablet (iPadOS)

### Community 167 - "Tab views"
Cohesion: 0.29
Nodes (7): Anatomy, Best practices, Change log, Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Tab views

### Community 168 - "Text fields"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Text fields

### Community 169 - "Charting data"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Charting data, Designing effective charts, Platform considerations, Related guidelines

### Community 170 - "Entering data"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Desktop (macOS), Entering data, Platform considerations, Related guidelines

### Community 171 - "Focus and selection"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Focus and selection, Platform considerations, Related guidelines, Tablet (iPadOS)

### Community 172 - "Images"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Formats, Images, Platform considerations, Resolution

### Community 173 - "Labels"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Desktop (macOS), Labels, Platform considerations, Related guidelines

### Community 174 - "Live-viewing apps"
Cohesion: 0.33
Nodes (6): Best practices, Cloud DVR, EPG experience, Live-viewing apps, Platform considerations, Related guidelines

### Community 175 - "Loading"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Loading, Platform considerations, Related guidelines, Showing progress

### Community 176 - "Managing accounts"
Cohesion: 0.33
Nodes (6): Best practices, Deleting accounts, Managing accounts, Platform considerations, Related guidelines, TV provider accounts

### Community 177 - "Managing notifications"
Cohesion: 0.33
Nodes (6): Best practices, Integrating with Focus, Managing notifications, Platform considerations, Related guidelines, Sending marketing notifications

### Community 178 - "Pop-up buttons"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Platform considerations, Pop-up buttons, Related guidelines, Tablet (iPadOS)

### Community 179 - "Popovers"
Cohesion: 0.33
Nodes (6): Best practices, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Popovers, Related guidelines

### Community 180 - "Pull-down buttons"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Mobile (iOS, iPadOS), Platform considerations, Pull-down buttons, Related guidelines

### Community 181 - "Searching"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Platform considerations, Related guidelines, Searching, Systemwide search

### Community 182 - "Snippets"
Cohesion: 0.33
Nodes (6): Anatomy, Best practices, Change log, Platform considerations, Related guidelines, Snippets

### Community 183 - "Text views"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Text views

### Community 184 - "Undo and redo"
Cohesion: 0.33
Nodes (6): Best practices, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Undo and redo

### Community 185 - "VoiceOver"
Cohesion: 0.33
Nodes (6): Change log, Descriptions, Navigation, Platform considerations, Related guidelines, VoiceOver

### Community 186 - "Writing"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Getting started, Platform considerations, Related guidelines, Writing

### Community 187 - "Action sheets"
Cohesion: 0.40
Nodes (5): Action sheets, Best practices, Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 188 - "Activity views"
Cohesion: 0.40
Nodes (5): Activity views, Best practices, Platform considerations, Related guidelines, Share and action extensions

### Community 189 - "Branding"
Cohesion: 0.40
Nodes (5): Best practices, Branding, Change log, Platform considerations, Related guidelines

### Community 190 - "Collaboration and sharing"
Cohesion: 0.40
Nodes (5): Best practices, Change log, Collaboration and sharing, Platform considerations, Related guidelines

### Community 191 - "Collections"
Cohesion: 0.40
Nodes (5): Best practices, Collections, Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 192 - "Color wells"
Cohesion: 0.40
Nodes (5): Best practices, Color wells, Desktop (macOS), Platform considerations, Related guidelines

### Community 193 - "iCloud"
Cohesion: 0.40
Nodes (4): Best practices, Change log, iCloud, Platform considerations

### Community 194 - "Modality"
Cohesion: 0.40
Nodes (5): Best practices, Change log, Modality, Platform considerations, Related guidelines

### Community 195 - "Panels"
Cohesion: 0.40
Nodes (5): Best practices, HUD-style panels, Panels, Platform considerations, Related guidelines

### Community 196 - "Printing"
Cohesion: 0.40
Nodes (5): Best practices, Desktop (macOS), Platform considerations, Printing, Related guidelines

### Community 197 - "Rating indicators"
Cohesion: 0.40
Nodes (5): Best practices, Change log, Platform considerations, Rating indicators, Related guidelines

### Community 198 - "Steppers"
Cohesion: 0.40
Nodes (5): Best practices, Desktop (macOS), Platform considerations, Related guidelines, Steppers

### Community 199 - "contrast-check.py"
Cohesion: 0.50
Nodes (3): lum(), ratio(), Gate for the macOS-native QuarkZip palette (see docs/color-system.md). Checks…

### Community 200 - "Cross-platform translation"
Cohesion: 0.50
Nodes (3): Conventions to check, Cross-platform translation, Vocabulary

### Community 201 - "Column views"
Cohesion: 0.50
Nodes (4): Best practices, Column views, Platform considerations, Related guidelines

### Community 202 - "Combo boxes"
Cohesion: 0.50
Nodes (4): Best practices, Combo boxes, Platform considerations, Related guidelines

### Community 203 - "Dock menus"
Cohesion: 0.50
Nodes (4): Best practices, Dock menus, Platform considerations, Related guidelines

### Community 204 - "Feedback"
Cohesion: 0.50
Nodes (4): Best practices, Feedback, Platform considerations, Related guidelines

### Community 205 - "Gyroscope and accelerometer"
Cohesion: 0.50
Nodes (4): Best practices, Gyroscope and accelerometer, Platform considerations, Related guidelines

### Community 206 - "Home Screen quick actions"
Cohesion: 0.50
Nodes (4): Best practices, Home Screen quick actions, Platform considerations, Related guidelines

### Community 207 - "Image wells"
Cohesion: 0.50
Nodes (4): Best practices, Image wells, Platform considerations, Related guidelines

### Community 208 - "NFC"
Cohesion: 0.50
Nodes (4): Background tag reading, In-app tag reading, NFC, Platform considerations

### Community 209 - "Outline views"
Cohesion: 0.50
Nodes (4): Best practices, Outline views, Platform considerations, Related guidelines

### Community 210 - "Path controls"
Cohesion: 0.50
Nodes (4): Best practices, Path controls, Platform considerations, Related guidelines

### Community 211 - "Ratings and reviews"
Cohesion: 0.50
Nodes (4): Best practices, Change log, Platform considerations, Ratings and reviews

### Community 212 - "Token fields"
Cohesion: 0.50
Nodes (4): Best practices, Platform considerations, Related guidelines, Token fields

### Community 213 - "Web views"
Cohesion: 0.50
Nodes (3): Best practices, Platform considerations, Web views

### Community 214 - "macOS design (QuarkZip)"
Cohesion: 0.50
Nodes (3): macOS design (QuarkZip), Non-negotiables, Reviews

### Community 216 - "App.tsx"
Cohesion: 0.17
Nodes (15): ARCHIVE_FILTERS, count(), ExtractDialog(), ExtractDoneDialog(), ExtractResult, ALL_OPTIONS, ALL_PAGE_CAP, formatSize() (+7 more)

## Knowledge Gaps
- **1273 isolated node(s):** `REPO_ROOT`, `IMAGE_GLYPHS`, `SECTIONS`, `KEPT_PLATFORMS`, `DROPPED_PLATFORMS` (+1268 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1432 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App Clips` connect `App Clips` to `hig-lookup.md`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `App()` connect `App` to `App.tsx`, `vitest`, `LanguageContext.tsx`, `AboutDialog.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `REPO_ROOT`, `IMAGE_GLYPHS`, `SECTIONS` to the rest of the system?**
  _1273 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `archive.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.0639386189258312 - nodes in this community are weakly interconnected._
- **Should `backend.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0896551724137931 - nodes in this community are weakly interconnected._