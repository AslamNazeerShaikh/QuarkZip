import Foundation
import Testing
@testable import QuarkZipKit

@Suite("ArchivePath")
struct ArchivePathTests {
    @Test func parsesNestedPath() throws {
        let path = try ArchivePath("Photos/2026/July/image.jpg")
        #expect(path.components == ["Photos", "2026", "July", "image.jpg"])
        #expect(path.name == "image.jpg")
        #expect(path.description == "Photos/2026/July/image.jpg")
    }

    @Test func normalizesBackslashesAndTrailingSlash() throws {
        #expect(try ArchivePath("a\\b\\").description == "a/b")
        #expect(try ArchivePath("folder/").description == "folder")
    }

    @Test(arguments: [
        ("", ArchivePath.InvalidReason.empty),
        ("/etc/passwd", .absolute),
        ("../secret", .parentTraversal),
        ("a/../../b", .parentTraversal),
        ("./a", .currentDirectory),
        ("a/./b", .currentDirectory),
        ("C:/Windows", .driveLetter),
        ("c:file.txt", .driveLetter),
        ("a//b", .emptyComponent),
        ("a\u{0}b", .nullByte),
    ])
    func rejectsUnsafePaths(raw: String, reason: ArchivePath.InvalidReason) {
        #expect(throws: reason) {
            _ = try ArchivePath(raw)
        }
    }

    @Test func appendingKeepsValidation() throws {
        let path = try ArchivePath("a").appending("b")
        #expect(path.components == ["a", "b"])
        #expect(throws: ArchivePath.InvalidReason.emptyComponent) {
            _ = try path.appending("")
        }
        #expect(throws: ArchivePath.InvalidReason.emptyComponent) {
            _ = try path.appending("x/y")
        }
        #expect(throws: ArchivePath.InvalidReason.emptyComponent) {
            _ = try path.appending("x\\y")
        }
        #expect(throws: ArchivePath.InvalidReason.nullByte) {
            _ = try path.appending("x\u{0}y")
        }
        #expect(throws: ArchivePath.InvalidReason.currentDirectory) {
            _ = try path.appending(".")
        }
        #expect(throws: ArchivePath.InvalidReason.parentTraversal) {
            _ = try path.appending("..")
        }
    }

    @Test func parentAndRoot() throws {
        #expect(ArchivePath.root.isRoot)
        #expect(ArchivePath.root.description.isEmpty)
        #expect(ArchivePath.root.name.isEmpty)
        #expect(ArchivePath.root.parent == .root)
        let nested = try ArchivePath("a/b/c")
        #expect(nested.parent.description == "a/b")
        #expect(try ArchivePath("a").parent == .root)
    }

    @Test func descendantRelation() throws {
        let parent = try ArchivePath("a/b")
        #expect(try ArchivePath("a/b/c").isDescendant(of: parent))
        #expect(!parent.isDescendant(of: parent))
        #expect(try ArchivePath("a/c").isDescendant(of: parent) == false)
        #expect(try ArchivePath("a/b/c").isDescendant(of: .root))
    }

    @Test func orderingIsLexical() throws {
        let a = try ArchivePath("a")
        let b = try ArchivePath("b")
        #expect(a < b)
        #expect(!(b < a))
    }
}

@Suite("ArchiveEntry")
struct ArchiveEntryTests {
    @Test func compressionRatio() throws {
        let path = try ArchivePath("a.bin")
        #expect(ArchiveEntry(id: .item(0), path: path, kind: .file, size: 100,
                             packedSize: 25).compressionRatio == 0.25)
        #expect(ArchiveEntry(id: .item(0), path: path, kind: .file, size: 0,
                             packedSize: 0).compressionRatio == nil)
        #expect(ArchiveEntry(id: .item(0), path: path, kind: .folder, size: 100,
                             packedSize: 10).compressionRatio == nil)
        #expect(ArchiveEntry(id: .item(0), path: path, kind: .file, size: 100,
                             packedSize: nil).compressionRatio == nil)
    }

    @Test func implicitFolderHasPathIdentity() throws {
        let path = try ArchivePath("a/b")
        let folder = ArchiveEntry.implicitFolder(path)
        #expect(folder.id == .folder(path))
        #expect(folder.kind == .folder)
        #expect(folder.name == "b")
        #expect(folder.size == 0)
    }
}

@Suite("ArchiveTree")
struct ArchiveTreeTests {
    private func entry(_ raw: String,
                       kind: ArchiveEntry.Kind = .file,
                       size: UInt64 = 1,
                       index: UInt64 = 0) throws -> ArchiveEntry {
        ArchiveEntry(id: .item(index), path: try ArchivePath(raw), kind: kind, size: size)
    }

    @Test func groupsChildrenAndCreatesImplicitFolders() throws {
        let tree = ArchiveTree(entries: [
            try entry("readme.txt", index: 0),
            try entry("docs/guide.md", index: 1),
            try entry("docs/deep/notes.txt", index: 2),
        ])

        #expect(tree.folders == [try ArchivePath("docs"), try ArchivePath("docs/deep")])
        let rootChildren = tree.children(of: .root)
        #expect(rootChildren.count == 2)
        #expect(rootChildren.contains { $0.path.description == "docs" && $0.kind == .folder })
        #expect(rootChildren.contains { $0.path.description == "readme.txt" })

        let docs = try ArchivePath("docs")
        #expect(Set(tree.children(of: docs).map(\.name)) == ["guide.md", "deep"])
        #expect(tree.children(of: try ArchivePath("docs/deep")).map(\.name) == ["notes.txt"])
        #expect(tree.children(of: try ArchivePath("missing")).isEmpty)
        #expect(tree.entry(at: try ArchivePath("readme.txt"))?.size == 1)
        #expect(tree.entry(at: docs) == nil)
    }

    @Test func keepsFirstDuplicateAndCountsItOnce() throws {
        let tree = ArchiveTree(entries: [
            try entry("a.txt", size: 1, index: 0),
            try entry("a.txt", size: 2, index: 1),
        ])
        #expect(tree.entries.count == 1)
        #expect(tree.entries.first?.size == 1)
        #expect(tree.children(of: .root).count == 1)
    }

    @Test func explicitFolderIsNotDuplicated() throws {
        let tree = ArchiveTree(entries: [
            try entry("docs", kind: .folder, index: 0),
            try entry("docs/a.txt", index: 1),
        ])
        #expect(tree.folders == [try ArchivePath("docs")])
        let rootChildren = tree.children(of: .root)
        #expect(rootChildren.count == 1)
        #expect(rootChildren.first?.id == .item(0))
    }

    @Test func emptyTree() {
        let tree = ArchiveTree(entries: [])
        #expect(tree.isEmpty)
        #expect(tree.entries.isEmpty)
        #expect(tree.folders.isEmpty)
        #expect(tree.children(of: .root).isEmpty)
    }
}

@Suite("EntrySort")
struct EntrySortTests {
    private func entry(_ raw: String,
                       kind: ArchiveEntry.Kind = .file,
                       size: UInt64 = 0,
                       packed: UInt64? = nil,
                       modified: TimeInterval? = nil,
                       index: UInt64) throws -> ArchiveEntry {
        ArchiveEntry(
            id: .item(index),
            path: try ArchivePath(raw),
            kind: kind,
            size: size,
            packedSize: packed,
            modified: modified.map { Date(timeIntervalSince1970: $0) }
        )
    }

    @Test func foldersFirstByName() throws {
        let entries = [
            try entry("b.txt", size: 2, index: 0),
            try entry("a.txt", size: 1, index: 1),
            try entry("z", kind: .folder, index: 2),
        ]
        let sorted = EntrySort().sorted(entries)
        #expect(sorted.map(\.name) == ["z", "a.txt", "b.txt"])
    }

    @Test func numericNamesAndStability() throws {
        let entries = [
            try entry("file10", size: 1, index: 0),
            try entry("file2", size: 1, index: 1),
            try entry("file2", size: 1, index: 2),
        ]
        let sorted = EntrySort(field: .name, ascending: true, foldersFirst: true).sorted(entries)
        #expect(sorted.map(\.path.description) == ["file2", "file2", "file10"])
        #expect(sorted.map(\.id) == [.item(1), .item(2), .item(0)])
    }

    @Test func sortsEveryFieldBothWays() throws {
        let entries = [
            try entry("a", size: 10, packed: 5, modified: 20, index: 0),
            try entry("b", size: 20, packed: nil, modified: 10, index: 1),
            try entry("c", size: 5, packed: 9, modified: nil, index: 2),
        ]

        #expect(EntrySort(field: .size, ascending: false, foldersFirst: false).sorted(entries).map(\.name) == ["b", "a", "c"])
        #expect(EntrySort(field: .packedSize, ascending: false, foldersFirst: false).sorted(entries).map(\.name) == ["c", "a", "b"])
        #expect(EntrySort(field: .modified, ascending: false, foldersFirst: false).sorted(entries).map(\.name) == ["a", "b", "c"])
        #expect(EntrySort(field: .kind, ascending: true, foldersFirst: false).sorted(entries).map(\.name) == ["a", "b", "c"])
    }

    @Test func foldersFirstOverridesDescending() throws {
        let entries = [
            try entry("a.txt", index: 0),
            try entry("m", kind: .folder, index: 1),
        ]
        let sorted = EntrySort(field: .name, ascending: false, foldersFirst: true).sorted(entries)
        #expect(sorted.map(\.name) == ["m", "a.txt"])
    }

    @Test func sameKindEqualValuesFallBackToPath() throws {
        let entries = [
            try entry("a/x", size: 1, index: 0),
            try entry("b/x", size: 1, index: 1),
        ]
        let sorted = EntrySort(field: .size, ascending: true, foldersFirst: false).sorted(entries)
        #expect(sorted.map(\.path.description) == ["a/x", "b/x"])
    }

    @Test func samePathFallsBackToStableID() throws {
        let entries = [
            try entry("same", size: 1, index: 5),
            try entry("same", size: 1, index: 4),
        ]
        let sorted = EntrySort(field: .size, ascending: true, foldersFirst: false).sorted(entries)
        #expect(sorted.map(\.id) == [.item(4), .item(5)])
    }
}

@Suite("PathPolicy")
struct PathPolicyTests {
    private func entry(_ raw: String, kind: ArchiveEntry.Kind = .file) throws -> ArchiveEntry {
        ArchiveEntry(id: .item(0), path: try ArchivePath(raw), kind: kind, size: 0)
    }

    @Test func foldersMergeAndFilesCollide() throws {
        let policy = PathPolicy()
        #expect(policy.verdict(for: try entry("a", kind: .folder), existing: [try ArchivePath("a")]) == .safe)
        #expect(policy.verdict(for: try entry("a"), existing: []) == .safe)
        #expect(policy.verdict(for: try entry("a"), existing: [try ArchivePath("a")]) == .collision)
    }

    @Test func rootIsUnsafe() {
        let entry = ArchiveEntry(id: .item(0), path: .root, kind: .file, size: 0)
        #expect(PathPolicy().verdict(for: entry, existing: []) == .unsafe(.empty))
    }

    @Test func conflictsKeepOrder() throws {
        let policy = PathPolicy()
        let entries = [try entry("a"), try entry("b"), try entry("c", kind: .folder)]
        let conflicts = policy.conflicts(for: entries, existing: [try ArchivePath("a"), try ArchivePath("c")])
        #expect(conflicts.map(\.name) == ["a"])
    }
}

@Suite("ArchiveError")
struct ArchiveErrorTests {
    @Test func everyCodeHasAMessage() {
        for code in ArchiveError.Code.allCases {
            #expect(!code.defaultMessage.isEmpty)
        }
    }

    @Test func passwordCodesAreTheOnlyOnesThatNeedAPassword() {
        for code in ArchiveError.Code.allCases {
            #expect(code.needsPassword == (code == .passwordRequired || code == .wrongPassword))
        }
    }

    @Test func customMessageWins() {
        let error = ArchiveError(code: .corrupt, message: "Custom", detail: "Detail", path: "a/b")
        #expect(error.message == "Custom")
        #expect(error.errorDescription == "Custom")
        #expect(error.detail == "Detail")
        #expect(error.path == "a/b")
        #expect(ArchiveError(code: .corrupt).message == ArchiveError.Code.corrupt.defaultMessage)
    }
}

@Suite("EntryFormat")
struct EntryFormatTests {
    @Test func sizesUseBinaryIECUnits() {
        #expect(EntryFormat.bytes(0) == "0 B")
        #expect(EntryFormat.bytes(512) == "512 B")
        #expect(EntryFormat.bytes(1_024) == "1.0 KiB")
        #expect(EntryFormat.bytes(1_536) == "1.5 KiB")
        #expect(EntryFormat.bytes(1_048_576) == "1.0 MiB")
        #expect(EntryFormat.bytes(1_073_741_824) == "1.0 GiB")
        #expect(EntryFormat.bytes(123_456_789) == "118 MiB")
        #expect(EntryFormat.packed(1_024) == "1.0 KiB")
    }

    @Test func sizesAndRatios() {
        #expect(!EntryFormat.bytes(0).isEmpty)
        #expect(EntryFormat.packed(nil) == "—")
        #expect(!EntryFormat.packed(1000).isEmpty)
        #expect(EntryFormat.ratio(0.456) == "46%")
        #expect(EntryFormat.ratio(nil) == "—")
        #expect(EntryFormat.ratio(.infinity) == "—")
    }

    @Test func crcAndMethod() {
        #expect(EntryFormat.crc(nil) == "—")
        #expect(EntryFormat.crc(0xDEADBEEF) == "DEADBEEF")
        #expect(EntryFormat.crc(0x00000001) == "00000001")
        #expect(EntryFormat.method(nil) == "—")
        #expect(EntryFormat.method("") == "—")
        #expect(EntryFormat.method("LZMA2") == "LZMA2")
    }

    @Test func datesUseTheGivenZone() {
        #expect(EntryFormat.date(nil) == "—")
        let date = Date(timeIntervalSince1970: 0)
        let text = EntryFormat.date(date,
                                    timeZone: TimeZone(secondsFromGMT: 0)!,
                                    locale: Locale(identifier: "en_US_POSIX"))
        #expect(text.contains("1970"))
    }
}

@Suite("ArchiveSnapshot")
struct ArchiveSnapshotTests {
    @Test func countsAndSizes() throws {
        let entries = [
            ArchiveEntry(id: .item(0), path: try ArchivePath("a.txt"), kind: .file, size: 10),
            ArchiveEntry(id: .item(1), path: try ArchivePath("dir"), kind: .folder, size: 0),
            ArchiveEntry(id: .item(2), path: try ArchivePath("dir/b.txt"), kind: .file, size: 5),
        ]
        let snapshot = ArchiveSnapshot(url: URL(fileURLWithPath: "/tmp/test.7z"),
                                       formatName: "7z",
                                       archiveSize: 42,
                                       entries: entries)
        #expect(snapshot.displayName == "test.7z")
        #expect(snapshot.fileCount == 2)
        #expect(snapshot.folderCount == 1)
        #expect(snapshot.totalUncompressedSize == 15)
        #expect(snapshot.tree.children(of: .root).count == 2)
    }

    @Test func compressionMetricsFollowTheContainer() {
        let url = URL(fileURLWithPath: "/tmp/test.bin")
        #expect(ArchiveSnapshot(url: url, formatName: nil, archiveSize: 0, entries: []).showsCompressionMetrics)
        #expect(ArchiveSnapshot(url: url, formatName: "7z", archiveSize: 0, entries: []).showsCompressionMetrics)
        #expect(!ArchiveSnapshot(url: url, formatName: "TAR", archiveSize: 0, entries: []).showsCompressionMetrics)
    }
}
