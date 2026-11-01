# QuarkZip

<p align="center"><img src="Icon/AppIcon-1024.png" width="128" alt="QuarkZip app icon"></p>

A native macOS archive manager. Browse an archive like a folder, extract what
you selected, and create new archives without leaving the window. Built with
Swift 6 and SwiftUI, powered by the 7-Zip engine compiled into the same
process.

macOS ships with Archive Utility, which can only make a zip and unpack one.
QuarkZip brings the everyday power of 7-Zip's Windows GUI, WinRAR, PeaZip,
Ark, and File Roller to the Mac, in an interface that belongs on macOS.

- **Browse before you extract.** Open an archive, walk its folders, preview
  files, and extract only what you need.
- **Everything in one process.** 7-Zip's C/C++ engine is linked into the app.
  No helper binary, no shell, no temporary console process.
- **One window, three panes.** Favorites and volumes, the archive, and an
  inspector with details and preview.
- **Fast where it matters.** Batched enumeration, virtualized lists, progress
  you can cancel, and no main-thread I/O on large archives.
- **Offline by construction.** No account, no telemetry, no network calls.
- **Native look and feel.** Liquid Glass chrome, system menus and shortcuts,
  light and dark, Reduce Motion, VoiceOver.

## Status

Milestone 0 works. Open a 7z, zip, tar, gzip, xz, or bzip2 archive and browse
it in a dense, color-coded workspace with category filters, an entry
inspector, and archive composition. Everything is native SwiftUI. The engine is linked into the app, the Swift
core is at 100 percent line coverage, and `./Scripts/verify.sh` is green.

Extraction, compression, archive editing, and deeper search are the next
milestones. See [docs/roadmap.md](docs/roadmap.md) and
[docs/STORIES.md](docs/STORIES.md).

This is still pre-release software. Do not point it at the only copy of an
important archive.

## Requirements

- macOS 26 or later
- Xcode 26 or later, for the Swift 6.2 toolchain (Command Line Tools are
  enough; the project builds without opening Xcode)
- No Homebrew packages, no Node, no Rust

## Build

```bash
git clone https://github.com/AslamNazeerShaikh/QuarkZip.git
cd QuarkZip
./build.sh --open
```

`build.sh` compiles a release build, wraps the binary in
`~/Applications/QuarkZip.app`, signs it with an Apple Development identity
when one exists, and opens it.

```bash
./Scripts/test.sh        # Swift Testing suites
./Scripts/coverage.sh    # coverage gate
./Scripts/verify.sh      # build, tests, coverage, warnings
./Scripts/snapshot.sh    # light and dark snapshots
```

Build products live in `~/Library/Developer/QuarkZip/`, outside the repo.

## How it works

```text
QuarkZip.app
├── SwiftUI views            QuarkZip
├── domain + services        QuarkZipKit
└── C ABI bridge             QZEngine
    └── 7-Zip 26.05          vendor/7zip, unmodified
```

The app is one process. `QZEngine` compiles the upstream 7-Zip sources and a
small C++ wrapper that exposes an opaque-handle C API. `QuarkZipKit` owns the
domain model and turns that API into async jobs with progress and
cancellation. SwiftUI only renders state.

Read [docs/architecture/overview.md](docs/architecture/overview.md) for the
full picture, and [docs/architecture/engine.md](docs/architecture/engine.md)
for the engine contract.

## Formats

Planned, in order:

| Read and write | Read only |
| --- | --- |
| 7z, zip, tar, gzip, bzip2, xz | rar, rar5, cab, iso, wim, lzma, zstd, brotli, and the rest of the 7-Zip handlers |

RAR is proprietary. QuarkZip reads RAR through 7-Zip's unRAR restriction and
never writes it.

## Documentation

- [Product vision](docs/product/vision.md)
- [Feature map](docs/product/features.md)
- [Architecture](docs/architecture/overview.md)
- [Engine](docs/architecture/engine.md)
- [Design system](docs/design/design-system.md)
- [Roadmap](docs/roadmap.md)
- [Testing and coverage](docs/testing.md)
- [Decisions](docs/decisions/)
- [Credits](docs/credits.md)

## License

QuarkZip is free software under the GNU Lesser General Public License v3.0.
It links 7-Zip, which is licensed LGPL-2.1+ with the unRAR restriction. See
[LICENSE](LICENSE) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

7-Zip is a trademark of Igor Pavlov. QuarkZip is an independent front end,
not affiliated with or endorsed by the 7-Zip project.
