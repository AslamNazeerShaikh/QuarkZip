# Credits

QuarkZip stands on work by other people. Thank you.

## Engine

**[7-Zip](https://www.7-zip.org/)** by Igor Pavlov. The archive engine behind
every listing, extraction, test, and compression. QuarkZip vendors the 26.05
source release, unmodified, and links it into the app. Licensed LGPL-2.1+ with
the unRAR restriction. 7-Zip is a trademark of Igor Pavlov. QuarkZip is an
independent front end, not affiliated with or endorsed by the 7-Zip project.

## Agent workflow

**[BAMA - Build Any Mac App](https://github.com/daveebbelaar/bama)** by Dave
Ebbelaar. The skill set that shapes how this app is planned, designed, built,
tested, and shipped. QuarkZip vendors the 21 skills under `.opencode/skills/`
with two mechanical changes: `${CLAUDE_SKILL_DIR}` became a repo-relative
path, and `CLAUDE.md` became `AGENTS.md`. Licensed MIT. The original license
text is at `.opencode/skills/LICENSE-bama`.

**[skills.sh](https://skills.sh/)** and Matt Pocock's writing rules for
agents, which BAMA follows.

## Product references

- **[AkiZip](https://github.com/AkiZip/AkiZip)** - a modern 7-Zip front end for
  Linux. Reference for format coverage, smart compression presets, in-archive
  management, and the background job queue.
- **[MacPacker](https://github.com/sarensw/MacPacker)** - native macOS archive
  manager. Reference for nested archive browsing, selective extraction, and
  progress and cancel wiring.
- **[Keka](https://www.keka.io/)** - the Mac compressor people know. Reference
  for a focused first-run experience and Finder integration.
- **7-Zip GUI, WinRAR, PeaZip** - the Windows feature bar: browse, extract
  selection, archive editing, encryption, volumes, integrity test.
- **Ark, File Roller, Xarchiver** - the Linux clarity bar: a folder-like
  archive view and no modal maze.

## Documentation and i18n

**[XDM - Xtreme Download Manager](https://github.com/subhra74/xdm)** for the
file-per-language localization model QuarkZip plans to borrow
(`Lang/<Language>.txt` plus `index.txt`).

## Apple

Swift, SwiftUI, AppKit, Foundation, Swift Testing, Liquid Glass, SF Symbols,
and the Human Interface Guidelines. The BAMA `mac-design` skill distills the
HIG into rules an agent can follow.

## License of this repository

QuarkZip is LGPL-3.0. See [LICENSE](../LICENSE). Third-party notices are in
[THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md).
