# Product vision

## The gap

On Windows and Linux, an archive is a folder you can open. You see the files,
walk into nested folders, double-click a document, and pull out one file
without unpacking the rest. On macOS, Finder treats an archive as a single
opaque file. Archive Utility only extracts everything, and third-party apps
mostly wrap the same one-way flow in a different skin.

That gap is QuarkZip's whole reason to exist.

## Who it is for

1. **The switcher.** A developer or power user who moved from Windows or
   Linux and expects 7-Zip, WinRAR, or Ark behavior on day one.
2. **The occasional unpacker.** Someone who downloads a zip a week and wants
   to take one folder out of it without making a mess.
3. **The person who ships files.** A designer, photographer, or engineer who
   creates archives daily and cares about compression level, splitting,
   passwords, and repeatable presets.

They share one expectation: the app should be quick, obvious, and never make
them think about the engine.

## What it must feel like

- **Immediate.** Opening a 10,000 entry archive shows rows in under 150 ms on
  an M-series Mac. The window is never blank for a second.
- **Physical.** Rows, sheets, and progress move with intent. Dragging files
  out feels like moving objects, not submitting a form.
- **Quiet.** Chrome is calm. Data is dense but readable. Nothing bounces for
  attention. Color means state, not decoration.
- **Native.** System menu bar, toolbar, sheets, Settings, contextual menus,
  keyboard navigation, VoiceOver, light and dark. A Mac user never has to
  learn a foreign control.
- **Safe.** The app never writes outside the folder the user picked, never
  overwrites without asking, and never hides a failure.

## The signature moments

1. **Drop an archive on the window.** The drop zone lifts, the archive opens,
   and the first entries fade in with a short stagger.
2. **Walk inside.** Breadcrumbs show `Photos.zip > 2026 > July`. The list
   updates in place, the sidebar keeps the archive, the inspector follows
   selection.
3. **Take one file.** Select it, drag it to the Desktop. A progress pill
   appears, finishes, and dissolves. Finder gets the file, the archive is
   untouched.
4. **Extract a selection.** Choose 12 of 4,000 files, press Extract, pick a
   folder. The sheet shows what will happen, including collisions and
   passwords, before anything is written.
5. **Make an archive.** Drop three folders, choose 7z, pick a preset, add a
   password. The job queue shows throughput, ETA, and a cancel button that
   actually stops.
6. **Peek.** Space on a text or image entry shows a Quick Look preview
   without extracting the whole archive.

## Principles

1. **Browse first.** Every feature starts from the idea that an archive is a
   container, not a black box.
2. **One process.** The engine is linked in. No helper, no shell, no second
   UI. This is a performance and security decision, not a packaging detail.
3. **Native by default, custom by exception.** Use Apple's controls unless the
   archive experience needs something better, and then build every state.
4. **Progressive depth.** A first-time user sees Open, Extract, and Create.
   An expert finds block size, filters, volumes, and checksums in the same
   window, not behind a wizard.
5. **No surprises.** Show the plan before destructive work. Show progress
   during it. Show exactly what failed after it.
6. **Offline forever.** The app has no network code and no network
   entitlement. Updates ship as a signed DMG.

## Non-goals

- A cloud drive, sync, or sharing service.
- A text editor, image editor, or media player. Preview only.
- A backup tool with scheduling. Extraction is explicit.
- A RAR compressor. RAR is proprietary; read-only.
- A cross-platform UI framework. macOS first, SwiftUI native.
- Telemetry, accounts, or "AI" features that phone home.

## Quality bar

These are measured on the release machine, not guessed:

| Measure | Target |
| --- | --- |
| First rows for a 10k entry zip | under 150 ms |
| Scroll a 100k entry list | 60 fps, no hitch over 16 ms |
| Memory for a 100k entry list | under 250 MB |
| Open + close 20 archives | no leaked handles, flat memory |
| Extract 1 GB | within 10% of `7zz x` on the same machine |
| Crash-free sessions | 100% in the self-test matrix |
| Unit test success | 100% |
| `QuarkZipKit` line coverage | 100% |

## Voice

Short, specific, human. "Extract 3 items", not "Proceed". "This archive needs
a password", not "Error 0x80004005". Never blame the user. Never say "Oops".
When something fails, say what failed, where, and what to do next.

## One sentence

QuarkZip makes an archive on macOS behave like a folder, with the engine and
the speed of 7-Zip and an interface that feels like it shipped with the Mac.
