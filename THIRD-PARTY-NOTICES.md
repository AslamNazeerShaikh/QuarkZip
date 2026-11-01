# Third-party notices

QuarkZip is licensed under the GNU Lesser General Public License, version 3.0.
See [LICENSE](LICENSE).

This file lists the third-party components that are part of the distributed
app or the repository.

## 7-Zip

- Project: 7-Zip
- Author: Igor Pavlov
- Website: https://www.7-zip.org/
- Source: https://github.com/ip7z/7zip, tag `26.05`
- License: GNU LGPL v2.1 or later, with the unRAR restriction
- Usage: compiled into the app as the archive engine (`vendor/7zip`)

The unRAR restriction means the RAR decompression code may not be used to
develop a RAR compressor. QuarkZip does not create RAR archives.

QuarkZip links 7-Zip statically. The complete corresponding source for the
app, including the bridge and the exact vendored 7-Zip tree, is available in
this repository. Distribution of binaries must keep that source available.

7-Zip is a trademark of Igor Pavlov. QuarkZip is an independent front end and
is not affiliated with or endorsed by the 7-Zip project.

## BAMA skills

- Project: BAMA - Build Any Mac App
- Author: Dave Ebbelaar
- Source: https://github.com/daveebbelaar/bama
- License: MIT
- Usage: development-time agent skills under `.opencode/skills/`, not linked
  into the app

The MIT license text is reproduced at `.opencode/skills/LICENSE-bama`.

## Apple frameworks

Swift, SwiftUI, AppKit, Foundation, and the macOS SDK are used under the
Apple Developer Program License Agreement. They are not redistributed.

## Development tools

- Swift Testing, part of the Swift toolchain.
- `llvm-cov`, part of the Swift toolchain.
- No npm, Python, Ruby, or Homebrew package is required to build or run the
  app.
