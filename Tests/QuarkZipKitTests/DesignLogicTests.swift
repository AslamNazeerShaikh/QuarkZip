import Foundation
import Testing
@testable import QuarkZipKit

@Suite("EntryCategory")
struct EntryCategoryTests {
    private func entry(_ raw: String, kind: ArchiveEntry.Kind = .file) throws -> ArchiveEntry {
        ArchiveEntry(id: .item(0), path: try ArchivePath(raw), kind: kind, size: 1)
    }

    @Test func foldersWinOverExtension() throws {
        #expect(EntryCategory.of(try entry("photos.png", kind: .folder)) == .folder)
    }

    @Test(arguments: [
        ("photo.png", EntryCategory.image),
        ("photo.HEIC", .image),
        ("clip.mp4", .video),
        ("theme.mp3", .audio),
        ("bundle.zip", .archive),
        ("source.swift", .code),
        ("report.pdf", .document),
        ("LICENSE", .other),
        ("data.bin", .other),
    ])
    func classifiesFiles(name: String, expected: EntryCategory) throws {
        #expect(EntryCategory.of(try entry(name)) == expected)
        #expect(EntryCategory.of(fileName: name) == expected)
    }

    @Test func everyCategoryHasDisplayAndSymbol() {
        for category in EntryCategory.allCases {
            #expect(!category.displayName.isEmpty)
            #expect(!category.symbolName.isEmpty)
        }
    }
}

@Suite("EntryFilter")
struct EntryFilterTests {
    private func file(_ name: String,
                      size: UInt64 = 0,
                      encrypted: Bool = false) throws -> ArchiveEntry {
        ArchiveEntry(id: .item(0),
                     path: try ArchivePath(name),
                     kind: .file,
                     size: size,
                     isEncrypted: encrypted)
    }

    @Test func allMatchesEverything() throws {
        #expect(EntryFilter.all.matches(try file("a.txt")))
        #expect(EntryFilter.all.title == "All Entries")
    }

    @Test func categoryMatches() throws {
        #expect(EntryFilter.category(.image).matches(try file("a.png")))
        #expect(!EntryFilter.category(.image).matches(try file("a.pdf")))
        #expect(EntryFilter.category(.image).title == "Image")
    }

    @Test func foldersAndEncrypted() throws {
        let folder = ArchiveEntry(id: .item(0), path: try ArchivePath("a"), kind: .folder, size: 0)
        #expect(EntryFilter.folders.matches(folder))
        #expect(!EntryFilter.folders.matches(try file("a.txt")))
        #expect(EntryFilter.folders.title == "Folders")

        #expect(EntryFilter.encrypted.matches(try file("a.txt", encrypted: true)))
        #expect(!EntryFilter.encrypted.matches(try file("a.txt")))
        #expect(EntryFilter.encrypted.title == "Encrypted")
    }

    @Test func largeUsesTheFileThreshold() throws {
        let below = EntryFilter.largeThreshold - 1
        #expect(!EntryFilter.large.matches(try file("small.bin", size: below)))
        #expect(EntryFilter.large.matches(try file("big.bin", size: EntryFilter.largeThreshold)))
        let bigFolder = ArchiveEntry(id: .item(0),
                                     path: try ArchivePath("big"),
                                     kind: .folder,
                                     size: EntryFilter.largeThreshold)
        #expect(!EntryFilter.large.matches(bigFolder))
        #expect(EntryFilter.large.title == "Large Items")
    }
}

@Suite("Archive composition")
struct ArchiveCompositionTests {
    private func entry(_ path: String,
                       kind: ArchiveEntry.Kind = .file,
                       size: UInt64 = 0,
                       packed: UInt64? = nil,
                       encrypted: Bool = false,
                       index: UInt64 = 0) throws -> ArchiveEntry {
        ArchiveEntry(id: .item(index),
                     path: try ArchivePath(path),
                     kind: kind,
                     size: size,
                     packedSize: packed,
                     isEncrypted: encrypted)
    }

    @Test func countsBytesAndPackedTotals() throws {
        let snapshot = ArchiveSnapshot(
            url: URL(fileURLWithPath: "/tmp/a.7z"),
            formatName: "7z",
            archiveSize: 100,
            entries: [
                try entry("a.pdf", size: 100, packed: 40, index: 0),
                try entry("b.png", size: 200, packed: 60, encrypted: true, index: 1),
                try entry("docs", kind: .folder, index: 2),
                try entry("c.unknown", size: 10, packed: 5, index: 3),
            ]
        )

        #expect(snapshot.fileCount == 3)
        #expect(snapshot.folderCount == 1)
        #expect(snapshot.totalUncompressedSize == 310)
        #expect(snapshot.totalPackedSize == 105)
        #expect(snapshot.encryptedCount == 1)
        #expect(snapshot.compressionRatio == 105.0 / 310.0)

        let stats = Dictionary(uniqueKeysWithValues: snapshot.categoryStats.map { ($0.category, $0) })
        #expect(stats[.document]?.count == 1)
        #expect(stats[.document]?.bytes == 100)
        #expect(stats[.image]?.count == 1)
        #expect(stats[.folder]?.count == 1)
        #expect(stats[.other]?.count == 1)

        let image = try #require(stats[.image])
        #expect(image.id == .image)
    }

    @Test func tiesSortByCountThenName() throws {
        let snapshot = ArchiveSnapshot(
            url: URL(fileURLWithPath: "/tmp/a.7z"),
            formatName: "7z",
            archiveSize: 0,
            entries: [
                try entry("a.png", size: 10, index: 0),
                try entry("b.swift", size: 10, index: 1),
            ]
        )
        #expect(snapshot.categoryStats.map(\.category) == [.code, .image])
    }

    @Test func ratioNeedsACompressingContainerAndPackedData() throws {
        let entries = [try entry("a.txt", size: 10, packed: 5)]
        let tar = ArchiveSnapshot(url: URL(fileURLWithPath: "/tmp/a.tar"),
                                  formatName: "tar",
                                  archiveSize: 10,
                                  entries: entries)
        #expect(tar.compressionRatio == nil)

        let noPacked = ArchiveSnapshot(url: URL(fileURLWithPath: "/tmp/a.7z"),
                                       formatName: "7z",
                                       archiveSize: 10,
                                       entries: [try entry("a.txt", size: 10)])
        #expect(noPacked.compressionRatio == nil)

        let empty = ArchiveSnapshot(url: URL(fileURLWithPath: "/tmp/a.7z"),
                                    formatName: "7z",
                                    archiveSize: 0,
                                    entries: [])
        #expect(empty.compressionRatio == nil)
    }

    @Test func largestEntriesSkipsFoldersAndHonorsLimit() throws {
        let snapshot = ArchiveSnapshot(
            url: URL(fileURLWithPath: "/tmp/a.7z"),
            formatName: "7z",
            archiveSize: 0,
            entries: [
                try entry("small.txt", size: 1, index: 0),
                try entry("big.bin", size: 100, index: 1),
                try entry("folder", kind: .folder, size: 500, index: 2),
                try entry("medium.bin", size: 50, index: 3),
            ]
        )
        #expect(snapshot.largestEntries(limit: 2).map(\.name) == ["big.bin", "medium.bin"])
        #expect(snapshot.largestEntries(limit: 0).isEmpty)
        #expect(snapshot.largestEntries(limit: -1).isEmpty)
    }
}

@Suite("Short date format")
struct ShortDateFormatTests {
    @Test func formatsADateWithoutTime() {
        #expect(EntryFormat.shortDate(nil) == "—")
        let text = EntryFormat.shortDate(
            Date(timeIntervalSince1970: 0),
            timeZone: TimeZone(secondsFromGMT: 0) ?? .gmt,
            locale: Locale(identifier: "en_US_POSIX")
        )
        #expect(text.contains("1970"))
        #expect(!text.contains(":"))
    }
}
