# QuarkZip

A visual 7-Zip archive manager for macOS (first), then Windows and Linux.
Tauri 2 + React + Tailwind v4 + Rust, shelling out to a pinned 7-Zip console binary.

## Screenshots

<table>
  <tr>
    <td><img src="assets/screenshots/%231.png" alt="Screenshot 1"></td>
    <td><img src="assets/screenshots/%232.png" alt="Screenshot 2"></td>
  </tr>
  <tr>
    <td><img src="assets/screenshots/%233.png" alt="Screenshot 3"></td>
    <td><img src="assets/screenshots/%234.png" alt="Screenshot 4"></td>
  </tr>
  <tr>
    <td><img src="assets/screenshots/%235.png" alt="Screenshot 5"></td>
    <td><img src="assets/screenshots/%236.png" alt="Screenshot 6"></td>
  </tr>
  <tr>
    <td><img src="assets/screenshots/%237.png" alt="Screenshot 7"></td>
    <td><img src="assets/screenshots/%238.png" alt="Screenshot 8"></td>
  </tr>
  <tr>
    <td><img src="assets/screenshots/%239.png" alt="Screenshot 9"></td>
    <td><img src="assets/screenshots/%2310.png" alt="Screenshot 10"></td>
  </tr>
</table>

## References

Big thanks to the open-source projects QuarkZip learns from and builds on:

- [7-Zip](https://www.7-zip.org/) by Igor Pavlov — the legendary archiver whose `7zz` console powers all listing, extraction, testing, and checksums here (pinned 26.03 consoles, see `docs/7zz-binaries.md`). Thank you for decades of free, open compression.
- [AkiZip](https://github.com/AkiZip/AkiZip) — visual 7-Zip archive manager for Linux (GTK4 + libadwaita, GPL-3.0). Feature and architecture reference for QuarkZip: format support, smart compression recommendations, in-archive management, background job queue with progress/ETA/cancel, logs panel.
- [MacPacker](https://github.com/sarensw/MacPacker) ([macpacker.app](https://macpacker.app/)) — native macOS archive manager (Swift + SwiftUI/AppKit, GPL-3.0). Reference for nested-archive browsing, selective extraction, engine fallback routing, and progress/cancel wiring.
- [XDM — Xtreme Download Manager](https://github.com/subhra74/xdm) ([xtremedownloadmanager.com](https://xtremedownloadmanager.com/)) — our file-per-language i18n model (`docs/i18n.md`) is borrowed from XDM's `Lang/<Language>.txt` + `index.txt` scheme.
- [Tauri](https://github.com/tauri-apps/tauri) ([v2.tauri.app](https://v2.tauri.app/)) — the framework that makes this tiny, secure, native app possible.

## Contributing

See `CONTRIBUTING.md` — commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).
