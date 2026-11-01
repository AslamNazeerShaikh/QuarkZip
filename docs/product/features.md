# Feature map

Compared with the desktop archive managers people already use. Status values:
**done**, **building**, **planned**, **out of scope**.

## Open and browse

| Feature | 7-Zip GUI | WinRAR | PeaZip | Ark / File Roller | QuarkZip | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Open by double-click, Open With, drag and drop | yes | yes | yes | yes | yes | building |
| Content-based format detection | yes | yes | yes | partial | yes | building |
| Folder tree inside the archive | yes | yes | yes | yes | yes | building |
| List columns: size, packed, ratio, modified, CRC, method, encrypted, attributes | yes | yes | yes | partial | yes | building |
| Sort, filter, search inside the archive | yes | yes | yes | partial | yes | planned |
| Nested archive browsing without a full extract | partial | yes | yes | partial | yes | planned |
| Quick Look preview of an entry | no | no | partial | no | yes | planned |
| Back and forward history, breadcrumbs | partial | yes | partial | partial | yes | planned |
| Remember column widths and view per archive type | partial | yes | yes | partial | yes | planned |
| Recent archives, favorites, volumes in the sidebar | no | yes | yes | partial | yes | planned |

## Extract

| Feature | 7-Zip GUI | WinRAR | PeaZip | Ark / File Roller | QuarkZip | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Extract all | yes | yes | yes | yes | yes | building |
| Extract selection only | yes | yes | yes | yes | yes | building |
| Drag entries out to Finder | no | yes | yes | yes | yes | planned |
| Destination picker with recent folders | yes | yes | yes | yes | yes | planned |
| Collision policy: ask, replace, skip, rename | yes | yes | yes | partial | yes | planned |
| Password prompt, per archive, Keychain remember | yes | yes | yes | partial | yes | planned |
| Preserve permissions, timestamps, symlinks | yes | yes | yes | yes | yes | planned |
| Open after extract | yes | yes | yes | yes | yes | planned |
| Extract to a folder named after the archive | yes | yes | yes | yes | yes | planned |
| Safe path handling (zip slip, symlink escape) | yes | yes | yes | yes | yes | building |

## Create and edit

| Feature | 7-Zip GUI | WinRAR | PeaZip | Ark / File Roller | QuarkZip | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Create 7z, zip, tar, tar.gz, tar.xz, tar.bz2 | yes | rar/zip | yes | yes | yes | planned |
| Compression level and method | yes | yes | yes | partial | yes | planned |
| Solid blocks, dictionary, word size, threads | yes | partial | partial | no | yes | planned |
| AES-256 encryption, encrypt file names (7z) | yes | yes | yes | partial | yes | planned |
| Split volumes | yes | yes | yes | no | yes | planned |
| Update an existing archive | yes | yes | yes | partial | yes | planned |
| Add, delete, rename entries inside an archive | yes | yes | yes | partial | yes | planned |
| Presets: Fast, Balanced, Smallest, Archive for email | no | partial | yes | no | yes | planned |
| Filters and exclusions | yes | yes | yes | partial | yes | planned |
| Estimate size before compressing | no | partial | yes | no | yes | planned |

## Jobs and integrity

| Feature | 7-Zip GUI | WinRAR | PeaZip | Ark / File Roller | QuarkZip | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Background job queue | no | yes | yes | partial | yes | planned |
| Progress, throughput, ETA | yes | yes | yes | yes | yes | building |
| Cancel that stops promptly | partial | yes | yes | yes | yes | building |
| Test archive integrity | yes | yes | yes | partial | yes | planned |
| Checksums: CRC32, SHA-1, SHA-256 | yes | yes | yes | no | yes | planned |
| Per-file error report with retry | partial | yes | partial | partial | yes | planned |
| Job history and log | no | partial | yes | no | yes | planned |

## macOS integration

| Feature | Status |
| --- | --- |
| Finder Quick Action: compress selection | planned |
| Finder Quick Action: extract here | planned |
| Services menu entries | planned |
| Default handler for zip and 7z (opt-in) | planned |
| Menu bar extra for running jobs | planned |
| Shortcuts app actions | planned |
| URL scheme `quarkzip://open?path=` | planned |
| Security-scoped bookmarks for sandbox | planned |
| Notarized DMG, no network entitlement | planned |

## Accessibility and craft

| Feature | Status |
| --- | --- |
| Full keyboard navigation and menu shortcuts | building |
| VoiceOver labels, rotor support, table semantics | planned |
| Reduce Motion and Reduce Transparency paths | planned |
| Light and dark, increased contrast | building |
| Localization-ready strings, right-to-left safe layout | planned |
| Drag and drop with file promises | planned |

## Deliberately out of scope

- RAR creation.
- Cloud storage, sharing links, accounts.
- Telemetry, analytics, crash reporting that uploads.
- A plugin marketplace.
- Editing file contents inside an archive. Preview only.

## Parity notes

- **7-Zip GUI** wins on format coverage and compression controls, loses on
  aesthetics, discoverability, and macOS behavior.
- **WinRAR** wins on archive editing and repair, loses on price and platform
  feel.
- **PeaZip** wins on breadth and presets, loses on density and visual noise.
- **Ark and File Roller** win on simplicity, lose on advanced compression and
  large-archive performance.
- **MacPacker and Keka** win on Mac polish, lose on depth and archive editing.
- **AkiZip** proves a modern 7-Zip front end is possible, but its GTK
  language is not the Mac.

QuarkZip's bet: match 7-Zip on depth, match Ark on clarity, and beat both on
craft.
