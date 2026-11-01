# Architecture overview

Status: agreed, milestone 0 is being built against it.

## Shape

One app, one process, three layers, one direction of dependency.

```text
┌──────────────────────────────────────────────────────────────┐
│ QuarkZip (SwiftUI)                                           │
│ Windows, sidebar, browser, inspector, sheets, Settings       │
│  │ reads state, calls commands                               │
│  ▼                                                           │
│ QuarkZipKit (pure Swift)                                     │
│ Models, archive tree, path policy, jobs, services            │
│  │ ArchiveService protocol -> SevenZipEngine                 │
│  ▼                                                           │
│ QZEngine (C++ + C header)                                    │
│ Opaque handles, status codes, progress, cancellation         │
│  ▼                                                           │
│ 7-Zip 26.05 handlers and codecs (vendor/7zip, unmodified)    │
└──────────────────────────────────────────────────────────────┘
```

Dependencies only point down. `QuarkZipKit` never imports SwiftUI or AppKit.
Views never import `QZEngine`. The engine never knows the UI exists.

## Targets

| Target | Kind | Responsibility | Tests |
| --- | --- | --- | --- |
| `QZEngine` | C++ static library with a C header | Compile 7-Zip, expose open/list/extract/create/test/progress/cancel | `Tests/QZEngineTests` |
| `QuarkZipKit` | Swift library | Domain model, rules, tree, path safety, job state, engine adapter | `Tests/QuarkZipKitTests` |
| `QuarkZip` | Swift executable | SwiftUI app, design system, snapshot and self-test modes | self-test + snapshots |

The executable depends on both libraries. The kit depends on `QZEngine` only
inside `QuarkZipKit/Engine/`, behind the `ArchiveService` protocol.

## Domain model

```swift
struct ArchiveEntry: Identifiable, Sendable, Hashable {
    let id: EntryID
    let path: ArchivePath          // normalized, "/" separated, no leading slash
    let kind: EntryKind            // file, folder, symlink
    let size: UInt64
    let packedSize: UInt64?
    let modified: Date?
    let crc: UInt32?
    let method: String?
    let isEncrypted: Bool
    let attributes: UInt32?
}
```

`ArchiveTree` is built once from a flat entry array in O(n) and exposes
children by folder. `ArchivePath` rejects absolute paths, empty components,
and `.`/`..`. `PathPolicy` decides whether a destination is safe before any
write.

Jobs are explicit values:

```swift
enum JobEvent: Sendable {
    case started(JobID, JobKind)
    case progress(JobID, JobProgress)
    case finished(JobID, JobResult)
    case failed(JobID, ArchiveError)
    case cancelled(JobID)
}
```

`JobRunner` is an actor. It serializes engine work, keeps a cancellation flag
per job, and yields events. The UI reduces events into observable state.

## Data flow

**Open and browse**

1. The user drops a file or picks one from the open panel.
2. `ArchiveService.open(url:password:)` returns an `ArchiveSession`.
3. The engine opens the archive by content, then by extension hint.
4. The kit pulls entries in batches of 2,000 and yields `.entries` events.
5. The tree is built once, the list shows the first batch immediately, and
   later batches append.
6. The session holds the engine handle until the window closes it.

**Extract**

1. The UI builds an `ExtractionPlan`: entries, destination, collision policy,
   password, metadata flags.
2. `PathPolicy.validate(plan:)` checks every entry and returns collisions.
3. The sheet shows the plan, including overwrite decisions.
4. The job extracts on the worker. The engine callback reports file counts.
5. Failures are collected per file, not thrown away at the first error.

**Create**

1. The UI builds `CompressionRequest`: sources, format, preset, password,
   volumes, filters.
2. The kit expands folders into a deterministic entry list.
3. The engine writes to a temporary file next to the destination, then
   atomically replaces the target. A crash never leaves a half archive.

## Concurrency

- Swift 6 language mode. The app target defaults to main-actor isolation.
- Engine work runs on a dedicated serial `DispatchQueue` owned by
  `EngineWorker`, exposed to Swift concurrency through continuations.
- One handle is used by one worker at a time. No lock shared between engine
  calls.
- Progress callbacks only copy integers into an `AsyncStream` continuation.
  They never call Swift state directly.
- Cancellation is checked at least every 64 items during listing and every
  progress callback during extract/create.
- The UI never awaits inside `body`. Long work is a `Task` started by a
  command.

## Errors

`ArchiveError` has a stable `code`, a short message, an optional underlying
detail, and a recovery suggestion.

| Code | Meaning | UI |
| --- | --- | --- |
| `notAnArchive` | No handler recognized the content | Explain, offer Open With |
| `passwordRequired` | Header or data is encrypted | Password sheet |
| `wrongPassword` | Decryption failed | Inline error, retry |
| `corrupt` | CRC or structure failure | Show file, offer test |
| `unsupportedFormat` | Handler cannot read/write it | Disable the action |
| `unsafePath` | Entry escapes destination | Skip, log, report |
| `destinationInUse` | Collision and policy says ask | Collision sheet |
| `cancelled` | User cancelled | Quiet |
| `io` | File system failure | Path plus OS message |

The bridge returns numeric status codes. The adapter maps them. No string
matching anywhere.

## Persistence

- Preferences: `UserDefaults` through a typed `SettingsStore`. No string keys
  in views.
- Recent archives and favorites: a small JSON file in Application Support,
  written atomically, capped at 50 recent.
- Passwords: Keychain, one item per archive identity, opt-in per archive.
- Column layout: per archive kind, in preferences.
- No database. There is no server and no sync.

## Security

- App Sandbox with user-selected read/write and security-scoped bookmarks.
- No network entitlement, no outgoing connections, no URLSession at all.
- Extraction: reject absolute paths, `..`, NUL bytes, drive letters, and
  symlinks that resolve outside the destination. Create parent directories
  only below the destination.
- Temporary nested archive copies live in
  `~/Library/Caches/QuarkZip/sessions/<uuid>/` and are deleted on close and
  on launch for orphans.
- The app never asks for Full Disk Access. It uses the open panel and
  bookmarks.
- Hardened runtime, notarized DMG.

## Performance plan

- Open in batches, append.
- Tree built once with a dictionary, never per row.
- Virtualized list. Fixed row height. No eager icon loading.
- Formatting cached per column width; sizes use a single formatter.
- Engine work off the main actor. File I/O with `O_NOFOLLOW` and
  `F_NOCACHE` only where it helps; measure first.
- Image and text previews stream from a bounded buffer, not the whole file.

## Build and packaging

- `Package.swift` builds the app and tests. `build.sh` makes the `.app`
  bundle, compiles the icon, signs it, installs to `~/Applications`.
- `Scripts/` holds test, coverage, snapshot, self-test, and packaging.
- No Xcode project is committed. `xcodebuild` is not required.
- Dependencies: none beyond the SDK and `vendor/7zip`.

## Decisions that constrain everything

- [ADR 0001](decisions/0001-native-swift-single-process.md): native Swift UI,
  one process, engine linked in.
- [ADR 0002](decisions/0002-vendored-7zip-2605.md): vendor 7-Zip 26.05
  unmodified, build it with the app.
- [ADR 0003](decisions/0003-swiftpm-and-shell-build.md): Swift package plus
  shell scripts, no Xcode project.
- [ADR 0004](decisions/0004-coverage-gate.md): 100% line coverage for the kit.
