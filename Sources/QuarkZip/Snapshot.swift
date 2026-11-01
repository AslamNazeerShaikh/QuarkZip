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

        let size = CGSize(width: 1360, height: 820)

        let welcome = AppModel()
        welcome.seedRecentsForSnapshot(SnapshotSample.recentURLs)
        render(AnyView(RootView().environment(welcome)),
               size: size,
               appearance: .aqua,
               to: directory.appendingPathComponent("welcome-light.png"))
        render(AnyView(RootView().environment(welcome)),
               size: size,
               appearance: .darkAqua,
               to: directory.appendingPathComponent("welcome-dark.png"))

        let browser = AppModel()
        let snapshot: ArchiveSnapshot
        if let path = environment["QUARKZIP_SNAPSHOT_ARCHIVE"],
           let opened = try? SevenZipArchiveService.openSynchronously(
               url: URL(fileURLWithPath: path), password: nil) {
            snapshot = opened
        } else {
            snapshot = SnapshotSample.archive
        }
        browser.applySnapshot(snapshot)
        browser.seedRecentsForSnapshot(SnapshotSample.recentURLs)

        render(AnyView(RootView().environment(browser)),
               size: size,
               appearance: .aqua,
               to: directory.appendingPathComponent("browser-light.png"))
        render(AnyView(RootView().environment(browser)),
               size: size,
               appearance: .darkAqua,
               to: directory.appendingPathComponent("browser-dark.png"))

        if let entry = snapshot.entries.first(where: { $0.path.description == "Documents/Contracts/agreement.pdf" })
            ?? snapshot.tree.children(of: .root).first(where: { $0.kind == .file }) {
            browser.currentFolder = entry.path.parent
            browser.selection = [entry.id]
        }
        render(AnyView(RootView().environment(browser)),
               size: size,
               appearance: .aqua,
               to: directory.appendingPathComponent("details-light.png"))
        render(AnyView(RootView().environment(browser)),
               size: size,
               appearance: .darkAqua,
               to: directory.appendingPathComponent("details-dark.png"))

        let settingsSize = CGSize(width: 500, height: 480)
        render(AnyView(GeneralSettingsView().frame(width: 500, height: 480)),
               size: settingsSize,
               appearance: .aqua,
               to: directory.appendingPathComponent("settings-light.png"))
        render(AnyView(GeneralSettingsView().frame(width: 500, height: 480)),
               size: settingsSize,
               appearance: .darkAqua,
               to: directory.appendingPathComponent("settings-dark.png"))

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
    static let recentURLs: [URL] = [
        URL(fileURLWithPath: "/Users/you/Downloads/QuarkZip-2026.7z"),
        URL(fileURLWithPath: "/Users/you/Desktop/Design-Assets.zip"),
        URL(fileURLWithPath: "/Users/you/Documents/release-26.05.tar.gz"),
        URL(fileURLWithPath: "/Users/you/Backups/nightly-backup.7z"),
    ]

    private struct Spec {
        let path: String
        let size: UInt64
        let packed: UInt64?
        let method: String?
        let encrypted: Bool
        let daysAgo: Double
    }

    private static let folders: Set<String> = [
        "Documents", "Documents/Contracts", "Documents/Reports",
        "Media", "Media/Images", "Media/Video", "Media/Audio",
        "Source", "Source/App", "Source/Web", "Backups",
    ]

    private static let specs: [Spec] = [
        Spec(path: "README.md", size: 12_400, packed: 4_100, method: "LZMA2:24", encrypted: false, daysAgo: 2),
        Spec(path: "LICENSE", size: 34_800, packed: 9_200, method: "LZMA2:24", encrypted: false, daysAgo: 2),
        Spec(path: "project-plan.pdf", size: 860_000, packed: 420_000, method: "Deflate", encrypted: false, daysAgo: 4),
        Spec(path: "dataset.csv", size: 4_400_000, packed: 1_100_000, method: "LZMA2:24", encrypted: false, daysAgo: 6),
        Spec(path: "notes.txt", size: 5_200, packed: 2_100, method: "LZMA2:24", encrypted: false, daysAgo: 3),
        Spec(path: "changelog.md", size: 30_000, packed: 8_400, method: "LZMA2:24", encrypted: false, daysAgo: 1),
        Spec(path: "archive-2026.7z", size: 540_000_000, packed: 520_000_000, method: "LZMA2:24", encrypted: true, daysAgo: 9),
        Spec(path: "big-backup.zip", size: 3_100_000_000, packed: 2_800_000_000, method: "Deflate", encrypted: false, daysAgo: 12),
        Spec(path: "Documents/Contracts/agreement.pdf", size: 620_000, packed: 310_000, method: "Deflate", encrypted: true, daysAgo: 8),
        Spec(path: "Documents/Contracts/NDA.pdf", size: 240_000, packed: 120_000, method: "Deflate", encrypted: true, daysAgo: 8),
        Spec(path: "Documents/Reports/2026-Q3.pdf", size: 1_900_000, packed: 900_000, method: "PPMd", encrypted: false, daysAgo: 15),
        Spec(path: "Media/Images/hero.jpg", size: 3_800_000, packed: 3_700_000, method: "Store", encrypted: false, daysAgo: 5),
        Spec(path: "Media/Images/team.png", size: 1_200_000, packed: 1_100_000, method: "Store", encrypted: false, daysAgo: 5),
        Spec(path: "Media/Video/demo.mp4", size: 84_000_000, packed: 82_000_000, method: "Store", encrypted: false, daysAgo: 7),
        Spec(path: "Media/Audio/theme.mp3", size: 7_400_000, packed: 6_900_000, method: "Store", encrypted: false, daysAgo: 7),
        Spec(path: "Source/App/main.swift", size: 8_200, packed: 2_300, method: "LZMA2:24", encrypted: false, daysAgo: 1),
        Spec(path: "Source/App/Models.swift", size: 22_000, packed: 5_400, method: "LZMA2:24", encrypted: false, daysAgo: 1),
        Spec(path: "Source/Web/index.html", size: 14_000, packed: 4_200, method: "Deflate", encrypted: false, daysAgo: 3),
        Spec(path: "Source/Web/package.json", size: 2_400, packed: 1_100, method: "Deflate", encrypted: false, daysAgo: 3),
        Spec(path: "Backups/backup-2026-07.7z", size: 2_400_000_000, packed: 2_100_000_000, method: "LZMA2:24", encrypted: true, daysAgo: 20),
        Spec(path: "Backups/nightly-2026-06.zip", size: 1_250_000_000, packed: 1_140_000_000, method: "Deflate", encrypted: false, daysAgo: 25),
    ]

    static let archive: ArchiveSnapshot = {
        var entries: [ArchiveEntry] = []
        var index: UInt64 = 0
        let base = Date(timeIntervalSince1970: 1_792_000_000)

        for folder in folders.sorted() {
            guard let path = try? ArchivePath(folder) else { continue }
            entries.append(ArchiveEntry(
                id: .item(index),
                path: path,
                kind: .folder,
                size: 0,
                modified: base.addingTimeInterval(-Double(index) * 3_600)
            ))
            index += 1
        }

        for spec in specs {
            guard let path = try? ArchivePath(spec.path) else { continue }
            entries.append(ArchiveEntry(
                id: .item(index),
                path: path,
                kind: .file,
                size: spec.size,
                packedSize: spec.packed,
                modified: base.addingTimeInterval(-spec.daysAgo * 86_400),
                crc: 0xA1B2C3D4 &+ UInt32(index),
                method: spec.method,
                isEncrypted: spec.encrypted
            ))
            index += 1
        }

        return ArchiveSnapshot(
            url: URL(fileURLWithPath: "/Users/you/Downloads/QuarkZip-2026.7z"),
            formatName: "7z",
            archiveSize: 6_400_000_000,
            entries: entries
        )
    }()
}
