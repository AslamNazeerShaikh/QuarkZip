# Competitive landscape

Status: desk research, 2026. No user studies yet. This page decides which
features matter and which habits to avoid.

## What people use on each platform

| App | Platform | Strength | Weakness |
| --- | --- | --- | --- |
| 7-Zip GUI | Windows | Format coverage, compression controls, free | Dated dialogs, poor discoverability, Windows-only feel |
| WinRAR | Windows | Archive editing, repair, volumes, familiar | Paid, dense UI, Windows idioms |
| PeaZip | Windows, Linux | Broad formats, presets, batch | Busy layout, many modals |
| Ark | KDE | Clean folder-like browsing, quick | Fewer compression controls |
| File Roller | GNOME | Simple, integrated | Limited editing and formats |
| Xarchiver | Linux | Light | Sparse, inconsistent |
| MacPacker | macOS | Native, nested archives, selective extract | Narrower format and compression depth |
| Keka | macOS | Focused, good defaults, Finder integration | Not a full archive editor |
| Archive Utility | macOS | Built in | One-way, no browsing |
| AkiZip | Linux | Modern 7-Zip front end, jobs, presets | GTK language, not Mac |

## What every serious app gets right

1. Browse before extract, with a real folder tree.
2. Extract selection, not only everything.
3. Show size, packed size, ratio, modified date, CRC, method, encryption.
4. Password prompt that says whether the header is encrypted.
5. Progress with throughput, ETA, and cancel.
6. Integrity test and checksums.
7. Create with level, method, password, and volumes.
8. Recent destinations and archives.
9. Drag and drop in both directions.
10. Safe path handling. Zip slip is not theoretical.

## Where they lose

- **Modal mazes.** A wizard for every action. QuarkZip uses a sheet with the
  plan visible and one primary button.
- **Text-heavy dialogs.** Rows of options with no explanation. QuarkZip uses
  presets first, advanced disclosure second.
- **No visual hierarchy.** Everything is the same weight. QuarkZip makes the
  archive the hero and the chrome quiet.
- **Frozen windows.** Enumeration on the UI thread. QuarkZip batches and
  virtualizes.
- **Platform mismatch.** Windows controls on macOS, GTK spacing on macOS.
  QuarkZip uses system chrome and Mac idioms.
- **Hidden state.** A job runs in a modal with no way to cancel or see the
  log. QuarkZip has a job queue and a visible cancel.
- **Bad errors.** A code, or "Error". QuarkZip says what failed, where, and
  what to do.

## Where macOS specifically fails

- Finder cannot look inside an archive.
- Archive Utility only expands everything and cannot create 7z.
- Quick Look does not preview entries inside an archive.
- Drag out of an archive is not a system capability; it must be built with
  file promises.
- Most Mac apps that do browse archives hide the depth behind a purchase or a
  narrow format list.

## The bet

Match the Windows feature bar on depth. Match Ark and File Roller on clarity.
Beat all of them on craft, speed, and macOS integration. Stay offline and
local, because the files people archive are usually the ones they care about
most.

## What to borrow, specifically

- 7-Zip: handler coverage, property model, solid blocks, split volumes.
- WinRAR: archive editing flow, repair mindset, per-file error report.
- PeaZip: presets, estimate before compressing, batch queue.
- Ark: folder-first browsing and a calm list.
- MacPacker: nested archive session model and progress wiring.
- Keka: first-run simplicity and Finder actions.
- AkiZip: job queue with log, modern presets.

## What not to copy

- WinRAR's toolbar density.
- 7-Zip's option dialogs.
- PeaZip's color and icon noise.
- GNOME's modal file chooser for every destination.
- Any telemetry or "recommended" download.

## Open questions

- Should QuarkZip register as the default zip handler on first launch, or
  only on request? Current answer: only on request, in Settings.
- Is Quick Look inside an archive worth the complexity in M1 or M2? Current
  answer: M1 for text, image, and PDF only.
- How much archive editing is safe in zip without rewriting the whole file?
  Current answer: implement 7z and zip update through 7-Zip's `IOutArchive`,
  measure, then decide about in-place edits.
