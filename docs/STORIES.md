# Stories

One story is one vertical slice and one commit. A story is done only when
every acceptance line is proven by a test, a self-test step, or a named
snapshot. Check the box when it is merged.

Convention: `M0-03` is milestone 0, story 3. Keep the order.

## M0 - Foundation

### [x] M0-01 Package builds

As a maintainer, I can build all three targets with one command.

- `swift build` compiles `QZEngine`, `QuarkZipKit`, and `QuarkZip` with zero
  warnings.
- `swift test` runs both test targets.
- `./build.sh` installs `~/Applications/QuarkZip.app` and it launches.
- `./Scripts/verify.sh` exits 0 on a clean checkout.

### [x] M0-02 Design tokens

As the designer, I have one source of colors, spacing, type, radii, and
motion.

- `QZTheme` exposes every token in `docs/design/design-system.md`.
- Tokens resolve correctly in light, dark, increased contrast, and Reduce
  Transparency.
- A unit test asserts no view file contains a literal color, radius, or
  duration. The check is `Scripts/token-lint.sh`.

### [x] M0-03 App shell

As a user, I can open the app and understand what it is for.

- One window, minimum 900 x 560, restores size and position.
- Sidebar: Recents, Favorites, Volumes, with counts.
- Toolbar: Open, New, Extract, More. Breadcrumb sits under it.
- Empty state has a drop zone and two actions.
- Status bar shows "No archive open".
- Light and dark snapshots exist and were reviewed.
- Every command has a menu item and a shortcut.

### [x] M0-04 Engine opens an archive

As the app, I can ask the engine for the entries of a real archive.

- `qz_open` opens 7z, zip, and tar by content.
- `qz_entry_count` returns the exact count.
- `qz_entry_at` returns path, size, packed size, modified time, CRC, folder
  flag, and method.
- A wrong password returns `QZ_E_PASSWORD`; a corrupt file returns
  `QZ_E_CORRUPT`.
- `qz_close` releases everything. 1,000 open/close cycles keep memory flat.
- Sanitizer run is clean.

### [x] M0-05 Domain model and tree

As the browser, I have a tested model to render.

- `ArchivePath` rejects absolute paths, `..`, empty components, and NUL.
- `ArchiveTree` builds folders and children in O(n) from flat entries.
- Entries with the same name are stable; duplicate paths keep the first and
  report the rest.
- Sorting by name, size, packed size, modified, and kind is stable and
  tested with a table.
- `PathPolicy` returns `.safe`, `.collision`, or `.unsafe` for every entry in
  an extraction plan.
- Line coverage for these files is 100%.

### [x] M0-06 Browser lists entries

As a user, I see the contents of an archive.

- Opening a 7z with 10,000 entries shows the first 2,000 rows in under
  150 ms on this Mac.
- The remaining batches append without losing selection or scroll position.
- Columns: name, size, packed, ratio, modified, CRC, method.
- Folders sort before files by default; double-click enters a folder.
- Command-Up goes to the parent. Breadcrumbs update.
- The list is virtualized: only visible rows are created.
- A 100k entry fixture scrolls at 60 fps.

### [ ] M0-07 Typed errors

As a user, I get a sentence I can act on.

- Opening a non-archive shows an inline empty state, not a crash.
- A wrong password shows the password sheet again with an inline message.
- A corrupt entry is reported with its path.
- No error path prints a raw code without a sentence.
- Error mapping from `QzStatus` to `ArchiveError` is table-tested.

### [x] M0-08 Self-test and snapshots

As an agent, I can prove the app works without clicking.

- `QuarkZip --selftest` runs against a temp store and prints PASS per check.
- It exits 0 when every check passes and 1 otherwise.
- `Scripts/snapshot.sh` writes light and dark PNGs for the welcome page and
  browser.
- `Scripts/snapshot.sh` uses sample archives only, never user files.

### [x] M0-09 Coverage gate

As a maintainer, I cannot merge a coverage drop.

- `Scripts/coverage.sh` measures `QuarkZipKit` with `llvm-cov`.
- The gate fails under 100% line coverage.
- The report is written to `coverage/summary.txt` and printed.
- The engine baseline is recorded in `docs/testing.md` and may only go up.

### [x] M0-10 Icon and About

As a user, the app looks finished in the Dock.

- `Icon/AppIcon.icon` exists and compiles with `tools/make_icon.sh`.
- About shows the app version, engine version, credits, and license.
- The 7-Zip name is credited, never used as the product name.
- The icon is reviewed in light, dark, tinted, and clear.
- About is also a sheet from the app menu, toolbar, sidebar, and Settings,
  with copy-version and IEC size notes.

## M1 - Browse

### [x] M1-00 Dense data workspace

As a user, I can see the archive as a dense, color-coded record, not a plain
file list.

- Three panes: sidebar, archive surface, inspector.
- Archive header with four KPI cards and format and encryption badges.
- Filter bar with search, category chips with counts, sort, and density.
- Table shows name, type, size, packed, ratio bar, date, method, and lock.
- Inspector shows entry detail, multi-selection summary, or archive overview
  with composition, largest entries, and method distribution.
- Category colors have a word in the Type column, so color is never the only
  signal.
- Six snapshots reviewed: welcome, browser, details, light and dark.

### [x] M1-00a Contrast and native alignment

As a user, the dense workspace is readable and behaves like a Mac app.

- Functional text meets 4.5:1 in light and dark.
- Category, format, and method badges use primary text plus a color dot or
  icon; no colored text on a colored tint.
- The app follows the system accent and appearance; no app-level pickers.
- Sidebar navigation uses accent icons and category or format dots. Fixed
  color remains only for Encrypted.
- Dense rows use outline SF Symbols; tiles use filled symbols.
- Display type is SF Pro default.
- Every animation honors Reduce Motion with a 120 ms fade.
- Large Items is no longer styled as danger red.
- The welcome CTA no longer relies on white text over the accent fill.

### [x] M1-00b App icon and window contract

As a user, the app has a recognizable Mac icon and the workspace cannot be
resized into a broken layout.

- A layered Icon Composer file with a pale cyan-to-pink glass tile, a
  blue-violet archive tray, violet/coral/gold cards, and a gold sparkle.
- No text, letters, SF Symbols, or 7-Zip marks.
- Review sheet shows default, dark, tinted, clear, 32 pt, and 16 pt.
- `Assets.car` and `AppIcon.icns` ship in the bundle; Info.plist names the
  icon.
- Initial content size 1360 x 800.
- Content minimum 1200 x 720 and maximum 1680 x 1050, clamped to the screen.
- SwiftUI and `WindowSizing` both enforce the range.

### [ ] M1-01 Nested folders and history
### [ ] M1-02 Sidebar recents and favorites
### [x] M1-03 Inspector and archive properties
### [ ] M1-04 Search and filter (landed; benchmark pending)
### [x] M1-09 Unified polish, IEC sizes, glass panes, About, emoji, theme

As a user, sizes, spacing, sidebars, selection, About, emoji, and theme
all behave the same everywhere.

- Sizes use binary IEC units (1 KiB = 1,024 bytes) from `EntryFormat`.
- Spacing and type come from `QZTheme` on a 4 pt grid with unified 20
  margins, 16 card padding, 28/32 rows, and token-only text sizes.
- Sidebar and inspector share 220/264/320 widths, resize natively, render
  over glass full height, and toggle with the gentle spring.
- List selection is a soft accent fill with border; primary text and
  method pills stay readable in light and dark.
- About is a sheet from the menu, toolbar, sidebar, and Settings.
- Emoji is one fixed glyph per type in a 20 point box, toggleable.
- Settings switches System, Light, and Dark at runtime.
- `verify.sh` passes, snapshots were reviewed in light and dark.

### [x] M1-10 Equal glass, calm sidebars, working Reveal, 1M-ready list

As a user, both sidebars look the same, expanding them never glitches,
icons always render, and huge archives scroll and select instantly.

- Both panes render over the system material with no custom tint, so
  transparency matches; the inspector toggles on one gentle-spring
  animation and toolbar items stay mounted while disabled.
- Comfortable rows and no emoji are the defaults for new installs.
- Every SF Symbol the UI can render is listed in `QZAppSymbols` and the
  `--selftest` gate fails if any name stops resolving (this caught the
  missing Reveal icon, now `magnifyingglass`).
- The list renders a 500-row window with auto-load, rows are `Equatable`
  value views, dates reuse a cached formatter, and filter/sort/counts run
  off the main actor with only the newest generation publishing.
- Selection is a 20 percent accent fill with a 40 percent border; primary
  text and method pills stay readable in light and dark.
- `verify.sh` passes, snapshots were reviewed in light and dark.
### [ ] M1-05 Nested archive sessions
### [ ] M1-06 Quick Look preview
### [ ] M1-07 Password sheet and Keychain
### [ ] M1-08 Multiple windows and drag to open

## M2 - Extract

### [ ] M2-01 Extract selection with plan sheet
### [ ] M2-02 Collision policy
### [ ] M2-03 Progress, ETA, cancel, per-file report
### [ ] M2-04 Drag out with file promises
### [ ] M2-05 Path safety suite
### [ ] M2-06 Job queue and history

## M3 - Create and edit

### [ ] M3-01 Compress sheet with presets
### [ ] M3-02 Advanced compression options
### [ ] M3-03 Encryption and volumes
### [ ] M3-04 Update, add, delete, rename in archive
### [ ] M3-05 Test archive and checksums

## M4 - Delight

### [ ] M4-01 Command palette
### [ ] M4-02 Finder Quick Actions and Services
### [ ] M4-03 Menu bar jobs
### [ ] M4-04 Shortcuts and URL scheme
### [ ] M4-05 Accessibility and localization audit

## M5 - Ship

### [ ] M5-01 Signing, notarization, DMG
### [ ] M5-02 Edge-case matrix
### [ ] M5-03 Release notes and 1.0
