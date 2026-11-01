# 0002 - Vendor 7-Zip 26.05 unmodified

- Status: accepted
- Date: 2026-11-01

## Context

QuarkZip needs broad format coverage, strong compression, and an engine that
is fast enough to browse huge archives. 7-Zip is the best free option and is
already the reference for the formats people use.

The engine must build offline, reproducibly, with no network access at build
time and no package manager.

## Decision

- Vendor the official source release 7-Zip **26.05** (2026-10-21) at
  `vendor/7zip/`.
- Keep every upstream file byte-identical. No patches, no local edits.
- Compile it as part of the `QZEngine` SwiftPM target, with our bridge in the
  same target.
- Call the C++ interfaces through a C ABI owned by this repository.
- Record the source archive hash and verify it in `Scripts/vendor-check.sh`.

## Pinned artifact

```text
URL:    https://github.com/ip7z/7zip/archive/refs/tags/26.05.tar.gz
SHA256: 989c658cef4c13124ed1f4ff7330a6ce5ab22cefdbbc9daae9b2c110dde9a63b
Tag:    26.05
Date:   2026-10-21
Note:   use the GitHub tag archive, not the release src.tar.xz. The release
tarball flattens C/ and CPP/, which breaks 7-Zip's relative includes.
```

## Source set

The same object set as upstream's `Alone2` static console build, minus the
console front end. Details and the exact directory list are in
`docs/architecture/engine.md`.

## Consequences

- Offline, reproducible builds with no external dependency.
- The repository grows by about 20 MB of upstream source.
- Upgrading is a deliberate commit: replace the tree, update the hash, run
  the engine suite, fix bridge breakage.
- We inherit 7-Zip's license: LGPL-2.1+ with the unRAR restriction. QuarkZip
  ships complete corresponding source and is LGPL-3.0 itself.
- Upstream bugs are fixed by upgrading, never by patching in place. A
  workaround, if unavoidable, lives in the bridge with a comment and a test.

## Alternatives considered

- **Download at build time**: breaks offline builds and reproducibility.
- **SwiftPM binary dependency**: no upstream XCFramework exists, and we would
  lose control of build flags.
- **System `libarchive`**: narrower format support, different license,
  cannot create 7z.
- **Patch upstream for macOS**: rejected. The bridge is the adaptation layer.

## References

- https://www.7-zip.org/
- https://github.com/ip7z/7zip/releases/tag/26.05
- `docs/architecture/engine.md`
