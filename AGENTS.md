# QuarkZip - agent instructions

A native macOS archive manager with the feature depth of 7-Zip's Windows GUI,
WinRAR, PeaZip, Ark, and File Roller, and an interface that feels at home on
the Mac. Swift 6 + SwiftUI for the app. 7-Zip 26.05 C/C++ linked into the same
process for the engine. No sidecar, no helper process, no network.

The person maintaining this repo knows Java and C#, not Swift. Explain design
choices in plain language. Prefer boring, typed, testable code over clever
code. When two options work, choose the one with fewer moving parts.

Read `docs/product/vision.md`, `docs/architecture/overview.md`, and
`docs/roadmap.md` before a feature. Read `docs/architecture/engine.md` before
touching the bridge.

## Current state

Milestone 0 is done. The app opens a real 7z, zip, tar, gzip, xz, or bzip2
archive through the linked engine and presents it as a dense, color-coded
three-pane workspace: sidebar filters, an archive header with KPIs, a
filterable entry table, and a detail inspector.
`QuarkZipKit` is at 100 percent line coverage, `./Scripts/verify.sh` passes,
and `./Scripts/selftest.sh` runs the shipping binary against a real archive.

Next: milestone 1, browse depth (folders, history, search, inspector, nested
archives, Quick Look). Extraction starts milestone 2. Do not build features
out of order; update `docs/STORIES.md` as work lands.

## Layout

```text
Sources/QZEngine/        C++ bridge over 7-Zip plus the C header Swift imports
Sources/QuarkZipKit/     pure Swift core: models, rules, services. No SwiftUI.
Sources/QuarkZip/        SwiftUI app, views, design tokens, snapshot mode
Tests/QuarkZipKitTests/  Swift Testing unit tests
Tests/QZEngineTests/     integration tests against real archives
Icon/AppIcon.icon/       Icon Composer source: box.svg, cards.svg, icon.json
Icon/AppIcon.svg         standalone vector preview
vendor/7zip/             upstream 7-Zip 26.05, pinned, never edited
docs/                    product, architecture, design, decisions, stories
Scripts/                 build, test, coverage, snapshot
tools/                   icon compile and review
.opencode/               agents, commands, skills, MCP config
```

`Package.swift` builds a Swift package with one executable and two libraries.
`build.sh` wraps the executable in a real `.app`, signs it, and installs it to
`~/Applications/QuarkZip.app`.

## Build and test

```bash
./build.sh --open                 # release build, install, launch
./Scripts/test.sh                 # swift test for every target
./Scripts/coverage.sh             # coverage gate for Kit and engine
./Scripts/verify.sh               # build + tests + coverage + warnings
./Scripts/snapshot.sh             # light and dark PNGs into /tmp/QuarkZip-shots
./Scripts/selftest.sh             # app self-test, exit 0/1
```

Use `~/Library/Developer/QuarkZip/build` as the SwiftPM scratch path so the
repo stays clean and iCloud never syncs build products. Do not open Xcode.

## Hard rules

- **One process.** 7-Zip is compiled into the app. Never spawn `7zz`, `ditto`,
  `tar`, `zip`, `unzip`, or any helper. Never use `Process` or `posix_spawn`
  for archive work.
- **`vendor/7zip` is read-only.** No patches, no local edits, no generated
  files inside it. Wrap behavior in `Sources/QZEngine`. An edit-deny rule
  enforces this.
- **Fully offline.** No telemetry, no analytics, no remote fonts, no update
  ping, no network entitlement.
- **Stay inside the destination.** Every extracted path is validated against
  path traversal and symlink escapes before a byte is written.
- **Never block the main actor.** Opening, listing, extracting, compressing,
  testing, and hashing run off the main actor and report progress in batches.
- **Large archives stay usable.** Enumerate in batches. The list is
  virtualized. Never build a full DOM, never load every icon, never copy every
  name into a second array per row.
- **No force unwraps** in shipping code. No `try!`, `as!`, or unowned
  references without a written invariant comment.
- **No new dependency** without an ADR in `docs/decisions/`. The app ships
  with zero third-party Swift packages.

## Architecture

- `QuarkZipKit` has no `import SwiftUI` and no `import AppKit`. It owns
  `ArchiveEntry`, `ArchiveFormat`, `ArchiveTree`, `PathPolicy`, `ArchiveJob`,
  `EntrySort`, `ByteCountFormatStyle` wrappers, and the `ArchiveService`
  protocol.
- `QZEngine` exposes a small C ABI: opaque handle, plain C structs, owned
  strings freed by the caller. C++ exceptions never cross it. Swift wraps it
  in `SevenZipEngine`, which conforms to `ArchiveService`.
- Views depend on `ArchiveService`, never on `QZEngine`. The UI can be tested
  with a fake service.
- One job = one engine handle = one thread at a time. A job owns its
  cancellation flag and emits `JobEvent` values. The UI reduces events into
  state.
- Errors are typed (`ArchiveError`) with a stable code and a user-readable
  message. Never match on error strings.

## Swift conventions

Follow the `swift-swiftui` skill. Main-actor isolation is the default for the
app target. CPU work is `nonisolated` + `@concurrent`. Shared mutable state is
an `actor`. Types that cross actors are `Sendable`. Fix isolation at the type,
not with `@unchecked Sendable`.

Keep files under about 400 lines. One type per file when the type is public.
Names say the domain: `ArchiveEntry`, `ExtractionPlan`, `CompressionOptions`.
Never name a type `Task`, `View`, `Color`, `Section`, `Label`, or `Settings`.

## Interface

Follow `mac-design`, `design-kit`, `layout-grid`, and `ux-design`. The short
version:

- System window chrome, toolbar, menus, sheets, and Settings. Custom parts
  only for the archive surface, and every state is built.
- Tokens live in `Sources/QuarkZip/Design/`. No hard-coded colors, radii, or
  durations in views.
- Follow the system accent and appearance. Do not add app-level accent or
  Light/Dark pickers.
- Functional text uses `primary`, `textSecondary`, or `textFaint`, never raw
  `secondaryLabelColor` or `tertiaryLabelColor`. The measured targets are in
  `docs/design/design-system.md`.
- Category and method color lives in a dot, icon, bar, or soft fill. Never in
  badge text or body text.
- Spacing is a 4 pt grid. Type is a fixed scale. Sizes use monospaced digits.
- Dense rows use outline SF Symbols; filled symbols belong in tiles.
- Motion explains a change and goes through `QZMotion.animation(_:reduceMotion:)`.
- Liquid Glass on floating chrome only, never on content.
- Every command has a menu item and a shortcut. Every icon-only control has an
  accessibility label and help text.
- Light and dark are both first-class. No fixed grays.

## Testing contract

- Unit tests use Swift Testing. Engine tests use real archives in a temp dir.
- 100% line coverage is the gate for `QuarkZipKit`. `Scripts/coverage.sh`
  fails below it.
- The engine gate starts at the measured baseline and may only go up. See
  `docs/testing.md`.
- A bug fix starts with a failing test.
- A UI change is done only after `Scripts/snapshot.sh` and looking at every
  image in light and dark.
- Tests never touch the user's real files or the real app store.

## Skills

The project vendors the BAMA skills (MIT) under `.opencode/skills/`, grouped
by stage. Use the `skill` tool by ID:

- Start: `bama` (router), `app-brief`, `new-mac-app`
- Plan: `research`, `clone`, `user-stories`
- Code: `swift-swiftui`, `os-integrations`, `performance`,
  `improve-architecture`, `agent-cli`
- Design: `ux-design`, `mac-design`, `design-system`, `layout-grid`,
  `design-kit`, `design-from-app`, `app-icon`
- Ship: `build-and-verify`, `test-mac-app`, `improve-loop`

Paths inside those skills were rewritten from `${CLAUDE_SKILL_DIR}` to
`.opencode/skills/<stage>/<name>`, and `CLAUDE.md` to `AGENTS.md`. Keep that
translation if you update the vendored copy.

The project skills on top of BAMA are the source of truth for QuarkZip:
`quarkzip-engine`, `quarkzip-browse`, `quarkzip-design`, and `quarkzip-release`.
Read the matching one before its area.

## Git

Conventional Commits v1.0.0. One vertical slice per commit. Imperative,
lowercase, no trailing period, 72 characters max.

```text
feat(browse): list archive entries in a virtualized table
fix(engine): reject entries that escape the destination
test(kit): cover nested archive tree building
docs(adr): record the vendored 7-Zip decision
```

A breaking change gets a `BREAKING CHANGE:` footer. Commit `vendor/7zip`
exactly as downloaded; it is what makes offline builds possible. Never commit
generated build output, snapshots, secrets, or `.DS_Store`. Never rewrite
published history and never force-push. Do not add "Generated with" or
co-author trailers.

## OpenCode

The project config is `.opencode/opencode.json` for OpenCode 2.2.5:

- Default agent: `swift-developer`. Subagents: `archive-engineer`,
  `test-engineer`, `reviewer`. Primary designer: `swiftui-designer`.
- MCP servers: `ui-skills` and `github` (needs
  `GITHUB_PERSONAL_ACCESS_TOKEN`).
- Web search uses the user's configured provider (`random` selection).
- Commands: `/verify`, `/story`, `/engine`, `/snapshot`, `/release`.

Run `opencode mcp list` after changing MCP config. Run `opencode --version`
before reporting a version-specific problem.

## 7-Zip licensing and naming

7-Zip is by Igor Pavlov, licensed LGPL-2.1+ with the unRAR restriction.
QuarkZip links it statically, so the app is distributed under LGPL-3.0 and
the full corresponding source stays available. Never claim "7-Zip" as the
product name, never use the 7-Zip logo, and never imply the app is the
official 7-Zip GUI. RAR is proprietary; support extraction only through the
unRAR restriction and say so in the UI. See `docs/credits.md`.
