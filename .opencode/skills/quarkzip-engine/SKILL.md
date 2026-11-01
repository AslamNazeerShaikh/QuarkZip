---
name: quarkzip-engine
description: How QuarkZip links and calls 7-Zip in the same process, the C ABI rules, threading, progress, cancellation, and archive safety. Use when touching Sources/QZEngine, the Swift SevenZipEngine adapter, archive formats, extraction paths, or compression options.
---

# QuarkZip engine

The engine is 7-Zip 26.05, compiled from `vendor/7zip` into `QZEngine` and
linked into the app executable. The upstream tree is never edited.

## Boundary

```text
Swift view -> ArchiveService (QuarkZipKit)
           -> SevenZipEngine (QuarkZipKit/Engine)
           -> QZEngine C ABI (Sources/QZEngine/include/QZEngine.h)
           -> IInArchive / IOutArchive (upstream)
```

- The C header is the contract. Change it in one commit with the Swift
  adapter and the tests.
- Handles are opaque and single-owner. `qz_*_open` returns a handle; the same
  handle is closed exactly once.
- Every string returned by the bridge is allocated by the bridge and released
  with `qz_string_free`. Swift copies it into a `String` immediately.
- Every failure returns a stable `QZStatus` code and a NUL-terminated message.
  Swift maps codes to `ArchiveError`, never parses message text.
- C++ exceptions are caught at the boundary. No `throw` reaches Swift.

## Threading

- Opening, listing, extracting, compressing, and testing run on a serial
  worker owned by `ArchiveService`.
- Progress callbacks are invoked on that worker. They copy primitive values
  into an `AsyncStream` continuation. No Swift state is touched there.
- Cancellation is a `std::atomic<bool>` stored in the handle. The extract
  callback returns `E_ABORT`; the listing loop stops pulling entries.
- Never share one handle between two workers.

## Safety

- The bridge refuses absolute entry paths, drive letters, NUL bytes, `..`
  components, and paths that escape after symlink resolution.
- Prefer creating files with `O_NOFOLLOW`, then writing through the open
  descriptor.
- Extraction to a temp folder is allowed only under the app's own
  `Library/Caches/QuarkZip/` directory and is deleted on close.
- A nested archive is opened from a temp copy, never in place, and is removed
  when the user closes it.

## Formats

Open by content first, then by extension hint. The registered handlers come
from the upstream static registry. Do not maintain a second format table in
Swift; read `kpidMethod` and the handler name from the engine.

Creation starts with 7z and zip. Tar/gzip/xz/bzip2 follow behind the same
`CompressionOptions` model. Unsupported combinations return
`ArchiveError.unsupportedFormat`, never a silent fallback.

## Testing

`Tests/QZEngineTests` creates every fixture in a temp directory with the
engine itself, opens it, and asserts entries, sizes, CRCs, and extracted
bytes. Add a fixture for every bug. Run `./Scripts/test-engine.sh` for the
sanitizer pass.

Done when the C header, the adapter, and the tests agree, and no upstream
file was modified.
