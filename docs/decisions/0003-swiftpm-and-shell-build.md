# 0003 - Swift package plus shell build, no Xcode project

- Status: accepted
- Date: 2026-11-01

## Context

BAMA's `new-mac-app` template uses a Swift package and a `build.sh` that
wraps the executable in a real `.app`. That works for most Mac apps and keeps
every file readable and editable by an agent. Xcode projects are opaque,
merge badly, and invite GUI-only configuration.

QuarkZip needs: C and C++ sources in the same build, a custom Info.plist, an
app icon compiled with `actool`, code signing, tests, and snapshots.

## Decision

- Build with SwiftPM (`Package.swift`).
- Compile 7-Zip inside the `QZEngine` target. The target follows a symlink to
  `vendor/7zip` so upstream stays at the repo root.
- `build.sh` creates `QuarkZip.app`, copies the executable and resources,
  compiles the icon, signs, and installs to `~/Applications`.
- `Scripts/` owns test, coverage, snapshot, self-test, vendor check, and
  packaging.
- Do not commit an `.xcodeproj`. Do not require Xcode GUI.

## Consequences

- Everything is text and reviewable.
- The build is explicit and debuggable from a terminal.
- We own the bundle assembly. A missing `Info.plist` key is our bug, not
  Xcode's.
- No App Intents, widgets, or extensions yet. If one becomes necessary
  (Shortcuts actions in M4), add an XcodeGen `project.yml` and keep the
  `.xcodeproj` generated and ignored.
- SwiftPM links all target objects into the executable, so 7-Zip's static
  handler registrars are preserved without `-force_load`.

## Alternatives considered

- **Xcode project**: better for extensions, worse for agents and diffs.
- **XcodeGen now**: extra tool to install; not needed until an extension.
- **Make or CMake**: reimplements SwiftPM and loses `swift test`.
- **Tuist**: heavier than the problem.

## References

- BAMA `new-mac-app` skill
- `Package.swift`, `build.sh`
