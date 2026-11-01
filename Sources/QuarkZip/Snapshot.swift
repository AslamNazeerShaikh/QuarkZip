import AppKit
import QuarkZipKit
import SwiftUI

/// Renders the main pages to PNG without taking over the screen.
///
/// `QUARKZIP_SNAPSHOT=1` makes the app render, write the files, and quit.
/// This is how an agent checks a layout change without Screen Recording
/// permission.
@MainActor
enum SnapshotRunner {
    static func runIfRequested() -> Bool {
        let environment = ProcessInfo.processInfo.environment
        guard environment["QUARKZIP_SNAPSHOT"] == "1" else { return false }

        let directory = URL(
            fileURLWithPath: environment["QUARKZIP_SNAPSHOT_DIR"] ?? "/tmp/QuarkZip-shots",
            isDirectory: true
        )
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)

        let size = CGSize(width: 1180, height: 720)

        let welcome = AppModel()
        render(AnyView(RootView().environment(welcome)),
               size: size,
               appearance: .aqua,
               to: directory.appendingPathComponent("welcome-light.png"))
        render(AnyView(RootView().environment(welcome)),
               size: size,
               appearance: .darkAqua,
               to: directory.appendingPathComponent("welcome-dark.png"))

        let browser = AppModel()
        if let path = environment["QUARKZIP_SNAPSHOT_ARCHIVE"],
           let snapshot = try? SevenZipArchiveService.openSynchronously(
               url: URL(fileURLWithPath: path), password: nil) {
            browser.applySnapshot(snapshot)
        } else {
            browser.applySnapshot(SnapshotSample.archive)
        }
        render(AnyView(RootView().environment(browser)),
               size: size,
               appearance: .aqua,
               to: directory.appendingPathComponent("browser-light.png"))
        render(AnyView(RootView().environment(browser)),
               size: size,
               appearance: .darkAqua,
               to: directory.appendingPathComponent("browser-dark.png"))

        return true
    }

    private static func render(_ view: AnyView,
                               size: CGSize,
                               appearance: NSAppearance.Name,
                               to url: URL) {
        let hosting = NSHostingView(rootView: view)
        hosting.frame = NSRect(origin: .zero, size: size)

        let window = NSWindow(
            contentRect: NSRect(origin: .zero, size: size),
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        window.isReleasedWhenClosed = false
        window.appearance = NSAppearance(named: appearance)
        window.contentView = hosting
        window.setContentSize(size)

        hosting.layoutSubtreeIfNeeded()
        window.displayIfNeeded()

        guard let representation = hosting.bitmapImageRepForCachingDisplay(in: hosting.bounds) else {
            return
        }
        hosting.cacheDisplay(in: hosting.bounds, to: representation)
        guard let data = representation.representation(using: .png, properties: [:]) else {
            return
        }
        try? data.write(to: url)
    }
}

/// Sample data for snapshots only. Never used by the running app.
enum SnapshotSample {
    static let archive: ArchiveSnapshot = {
        let paths = [
            "Photos", "Photos/2026", "Photos/2026/July", "Photos/2026/July/DSC_0142.HEIC",
            "Photos/2026/July/DSC_0143.HEIC", "Photos/2026/July/DSC_0144.HEIC",
            "Photos/2026/June", "Photos/2026/June/cover.jpg",
            "Documents", "Documents/notes.md", "Documents/budget.csv",
            "README.txt", "backup-2026-07.7z",
        ]
        let entries: [ArchiveEntry] = paths.enumerated().compactMap { index, raw in
            guard let path = try? ArchivePath(raw) else { return nil }
            let isFolder = ["Photos", "Photos/2026", "Photos/2026/July", "Photos/2026/June",
                            "Documents"].contains(raw)
            return ArchiveEntry(
                id: .item(UInt64(index)),
                path: path,
                kind: isFolder ? .folder : .file,
                size: isFolder ? 0 : UInt64(1_024 * (index + 3)),
                packedSize: isFolder ? nil : UInt64(512 * (index + 1)),
                modified: Date(timeIntervalSince1970: 1_780_000_000 - Double(index) * 86_400),
                crc: isFolder ? nil : 0xA1B2C3D4,
                method: isFolder ? nil : "LZMA2:24",
                isEncrypted: false
            )
        }
        return ArchiveSnapshot(
            url: URL(fileURLWithPath: "/Users/you/Downloads/Archive.7z"),
            formatName: "7z",
            archiveSize: 18_432_000,
            entries: entries
        )
    }()
}
