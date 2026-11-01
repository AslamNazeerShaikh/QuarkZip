# 0001 - Native Swift UI, one process

- Status: accepted
- Date: 2026-11-01
- Supersedes: the Tauri, egui, and iced experiments in the previous history

## Context

The previous attempts wrapped the 7-Zip console binary and, later, linked it
into a Rust backend behind a web view. Both produced a working archive
manager, but the interface never felt like a Mac app, and the sidecar
introduced packaging, signing, and IPC costs.

The goal is a native macOS app with the feature depth of 7-Zip's Windows GUI
and the craft of the best Mac apps. The maintainer knows Java and C#, not
Swift, so the architecture has to be teachable and testable.

## Decision

1. The UI is Swift 6 and SwiftUI, with AppKit only where SwiftUI has no
   equivalent.
2. The app is one process. The 7-Zip engine is compiled into the executable.
3. There is no sidecar, no helper binary, no XPC service, and no shell call.
4. Core logic lives in `QuarkZipKit`, a pure Swift library with no UI import.
5. The engine boundary is a small C ABI over upstream 7-Zip C++ interfaces.

## Consequences

- The app is a single binary and a single signature.
- No console text parsing; the app reads structured properties directly.
- Swift 6 concurrency rules apply end to end. The engine worker is explicit.
- The build is heavier: the first compile of 7-Zip takes minutes.
- A crash in the engine crashes the app. That is acceptable: 7-Zip is mature
  and the bridge validates inputs.
- Porting to Windows or Linux later means a new UI over the same C ABI, not a
  rewrite of the engine.

## Alternatives considered

- **Tauri + Rust**: proven here, but the web view look and the IPC boundary
  fight the goal.
- **egui / iced**: fast to start, wrong platform language, weak accessibility
  and text input.
- **XPC or sidecar**: isolates crashes, but adds signing, lifecycle, and copy
  costs for no user benefit.
- **Objective-C++ UI**: unnecessary. SwiftUI with a C++ bridge is simpler.

## References

- `docs/architecture/overview.md`
- `docs/architecture/engine.md`
