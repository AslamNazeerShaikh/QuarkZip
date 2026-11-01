# Roadmap

Each milestone ends with a working build, a passing verify script, and
snapshots in light and dark. No milestone starts before the previous one is
usable.

## M0 - Foundation

Goal: open a real archive and list its entries in a native window.

- [x] Fresh repository, OpenCode 2.2.5 config, BAMA skills vendored.
- [x] Product, architecture, design, and testing docs.
- [x] Swift package with `QZEngine`, `QuarkZipKit`, `QuarkZip`.
- [x] App shell: window, sidebar, toolbar, empty state, design tokens.
- [x] Engine: open, entry count, entry at, close.
- [x] Kit: `ArchiveEntry`, `ArchivePath`, `ArchiveTree`, sorting, path policy.
- [x] Browser: virtualized table from a real 7z, zip, and tar.
- [x] Coverage gate at 100% for the kit.
- [x] `build.sh`, `Scripts/verify.sh`, snapshots, self-test.

Exit: `./build.sh --open` opens a 7z and lists 10,000 entries in under
150 ms for the first batch. A corrupted archive shows a typed error.
`./Scripts/selftest.sh` passes on the shipping binary, and snapshots exist in
light and dark. The icon is the one M0 item still open.

## M1 - Browse

Goal: an archive feels like a folder.

- [ ] Nested folders, breadcrumbs, back and forward.
- [ ] Sidebar with recents, favorites, volumes.
- [ ] Inspector with entry facts and archive properties.
- [ ] Search and filter with result counts.
- [ ] Nested archive open inside a session.
- [ ] Quick Look preview for text, image, and PDF entries.
- [ ] Column layout persistence and view density.
- [ ] Password sheet for encrypted headers.
- [ ] Drag and drop to open; multiple windows.
- [ ] Keyboard navigation and full menu bar.

Exit: a 100k entry archive scrolls at 60 fps, search returns in under 50 ms
for a substring, and every action has a shortcut.

## M2 - Extract

Goal: pull out exactly what was chosen, safely.

- [ ] Extract all, selection, and current folder.
- [ ] Destination sheet with recents and "folder named after archive".
- [ ] Collision policy: ask, replace, skip, rename.
- [ ] Progress with throughput, ETA, cancel, per-file failures.
- [ ] Drag entries out to Finder with file promises.
- [ ] Preserve timestamps, permissions, symlinks.
- [ ] Keychain password memory per archive.
- [ ] Path safety suite: absolute, `..`, symlink escape, NUL, long names.
- [ ] Job queue and job history.

Exit: the malicious fixture never writes outside the destination. Cancel
stops within 200 ms. A 1 GB extraction is within 10% of `7zz x`.

## M3 - Create and edit

Goal: replace the need for a separate compressor.

- [ ] Compress files and folders from the app and from Finder.
- [ ] Formats: 7z, zip, tar, tar.gz, tar.xz, tar.bz2.
- [ ] Presets: Fast, Balanced, Smallest, Email.
- [ ] Advanced: level, method, dictionary, solid block, threads, filters.
- [ ] AES-256, encrypt names for 7z.
- [ ] Split volumes.
- [ ] Estimate output size before creating.
- [ ] Update existing archive, add, delete, rename entries.
- [ ] Atomic write and safe replace.
- [ ] Test archive and checksums (CRC32, SHA-1, SHA-256).

Exit: create a 7z with a password and split volumes, open it, verify with the
engine test, and round-trip names and timestamps.

## M4 - Delight

Goal: the details people tell friends about.

- [ ] Command palette.
- [ ] Finder Quick Actions and Services.
- [ ] Default handler opt-in for zip and 7z.
- [ ] Menu bar extra for jobs.
- [ ] Shortcuts actions and URL scheme.
- [ ] App icon, onboarding, About with engine credits.
- [ ] Localization scaffolding and right-to-left audit.
- [ ] Performance pass: Instruments, memory, energy.
- [ ] Accessibility audit with VoiceOver.

Exit: a first-time user can open, browse, and extract without help. A
VoiceOver user can do the same. The app idles under 1% CPU.

## M5 - Ship

Goal: a signed, notarized, documented release.

- [ ] Developer ID signing, hardened runtime, notarization, stapling.
- [ ] DMG with license, third-party notices, and source offer.
- [ ] Sandbox entitlements and bookmark coverage audited.
- [ ] Crash and edge-case matrix: empty archive, huge archive, broken
  archive, Unicode, volumes, read-only destination, full disk.
- [ ] Release notes and screenshots.
- [ ] Version 1.0.

Exit: `spctl -a -vv` accepts the DMG on a clean Mac, and the release
checklist in the `quarkzip-release` skill is fully ticked.

## After 1.0

- Windows and Linux ports would be a separate UI over the same C ABI. Not
  planned now.
- Archive repair and recovery.
- Duplicate finder inside an archive.
- Batch rename rules.
- A CLI that talks to the engine library, not to the GUI.
