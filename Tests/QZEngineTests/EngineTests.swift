import Foundation
import Testing
import QZEngine
@testable import QuarkZipKit

@Suite("Engine status mapping")
struct EngineStatusMappingTests {
    @Test(arguments: [
        (QZ_E_NOT_ARCHIVE.rawValue, ArchiveError.Code.notAnArchive),
        (QZ_E_PASSWORD.rawValue, .passwordRequired),
        (QZ_E_WRONG_PASSWORD.rawValue, .wrongPassword),
        (QZ_E_CORRUPT.rawValue, .corrupt),
        (QZ_E_UNSUPPORTED.rawValue, .unsupportedFormat),
        (QZ_E_UNSAFE_PATH.rawValue, .unsafePath),
        (QZ_E_IO.rawValue, .io),
        (QZ_E_CANCELLED.rawValue, .cancelled),
        (QZ_E_INTERNAL.rawValue, .internalError),
        (QZ_OK.rawValue, .internalError),
    ])
    func mapsEveryStatus(status: UInt32, expected: ArchiveError.Code) {
        #expect(ArchiveError.Code(engineStatus: status) == expected)
    }

    @Test func unknownStatusIsInternal() {
        #expect(ArchiveError.Code(engineStatus: 999) == .internalError)
    }

    @Test func emptyMessageBecomesNil() {
        #expect(SevenZipArchiveService.engineMessage([0, 0, 0]) == nil)
    }

    @Test func mapsACompleteRawEntry() throws {
        try "dir/file.txt".withCString { path in
            try "LZMA2".withCString { method in
                var raw = QzEntry()
                raw.path = path
                raw.method = method
                raw.size = 10
                raw.packed_size = 4
                raw.packed_size_defined = 1
                raw.modified_unix = 1_000
                raw.crc = 0xAB
                raw.is_dir = 0
                raw.is_encrypted = 1
                raw.attributes = 7

                let entry = try SevenZipArchiveService.makeEntry(raw, index: 3)
                #expect(entry.id == .item(3))
                #expect(entry.path.description == "dir/file.txt")
                #expect(entry.kind == .file)
                #expect(entry.size == 10)
                #expect(entry.packedSize == 4)
                #expect(entry.modified == Date(timeIntervalSince1970: 1_000))
                #expect(entry.crc == 0xAB)
                #expect(entry.method == "LZMA2")
                #expect(entry.isEncrypted)
                #expect(entry.attributes == 7)
            }
        }
    }

    @Test func mapsAFolderWithMissingOptionalFields() throws {
        try "empty".withCString { path in
            var raw = QzEntry()
            raw.path = path
            raw.is_dir = 1
            let entry = try SevenZipArchiveService.makeEntry(raw, index: 0)
            #expect(entry.kind == .folder)
            #expect(entry.packedSize == nil)
            #expect(entry.modified == nil)
            #expect(entry.crc == nil)
            #expect(entry.method == nil)
            #expect(!entry.isEncrypted)
        }
    }

    @Test func dropsPackedSizeAndCRCForFolders() throws {
        try "empty".withCString { path in
            var raw = QzEntry()
            raw.path = path
            raw.is_dir = 1
            raw.packed_size = 512
            raw.packed_size_defined = 1
            raw.crc = 0x1234
            let entry = try SevenZipArchiveService.makeEntry(raw, index: 0)
            #expect(entry.packedSize == nil)
            #expect(entry.crc == nil)
        }
    }

    @Test func rejectsARawEntryWithoutAPath() {
        #expect(throws: ArchiveError.self) {
            _ = try SevenZipArchiveService.makeEntry(QzEntry(), index: 0)
        }
    }

    @Test func pullsEntriesThroughAnInjectedSource() throws {
        try "a.txt".withCString { pointer in
            let entries = try SevenZipArchiveService.readEntries(count: 1) { _ in
                var raw = QzEntry()
                raw.path = pointer
                raw.size = 1
                return (QZ_OK, raw)
            }
            #expect(entries.count == 1)
            #expect(entries.first?.path.description == "a.txt")
        }
    }

    @Test func reportsAnEntryReadFailure() {
        do {
            _ = try SevenZipArchiveService.readEntries(count: 1) { _ in
                (QZ_E_CORRUPT, QzEntry())
            }
            Issue.record("Expected a corrupt status to throw")
        } catch let error as ArchiveError {
            #expect(error.code == .corrupt)
        } catch {
            Issue.record("Unexpected error: \(error)")
        }
    }

    @Test func formatNameHandlesNil() {
        #expect(SevenZipArchiveService.formatName(nil) == nil)
        "tar".withCString { pointer in
            #expect(SevenZipArchiveService.formatName(pointer) == "tar")
        }
    }
}

@Suite("SevenZip engine")
struct SevenZipEngineTests {
    private func makeTar(_ files: [(String, String)]) -> Data {
        TarFixture.make(files)
    }

    private func write(_ data: Data, name: String) throws -> URL {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("QuarkZipTests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appendingPathComponent(name)
        try data.write(to: url)
        return url
    }

    @Test func reportsPinnedVersion() {
        #expect(SevenZipArchiveService.engineVersion == "7-Zip 26.05")
    }

    @Test func listsEntriesThroughTheCABI() throws {
        let url = try write(makeTar([("a.txt", "hello"), ("dir/b.txt", "world")]), name: "sample.tar")
        defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }

        var status = QZ_E_INTERNAL
        var message = [CChar](repeating: 0, count: 256)
        let session = url.path.withCString { path in
            qz_open(path, nil, &status, &message, message.count)
        }
        let opened = try #require(session)
        defer { qz_close(opened) }

        #expect(status.rawValue == QZ_OK.rawValue)
        #expect(qz_entry_count(opened) == 2)

        var first = QzEntry()
        #expect(qz_entry_at(opened, 0, &first).rawValue == QZ_OK.rawValue)
        let firstName = String(cString: try #require(first.path))
        #expect(firstName == "a.txt" || firstName == "dir/b.txt")
        let format = try #require(qz_format_name(opened))
        #expect(String(cString: format) == "tar")
        #expect(qz_archive_size(opened) > 0)
    }

    @Test func opensThroughTheService() async throws {
        let url = try write(makeTar([("a.txt", "hello"), ("dir/b.txt", "world")]), name: "sample.tar")
        defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }

        let snapshot = try await SevenZipArchiveService().open(url: url, password: "ignored")
        #expect(snapshot.formatName == "tar")
        #expect(snapshot.entries.count == 2)
        #expect(snapshot.entries.contains { $0.path.description == "a.txt" && $0.size == 5 })
        #expect(snapshot.tree.folders.contains { $0.description == "dir" })
        #expect(snapshot.tree.children(of: .root).count == 2)
    }

    @Test func rejectsAFileThatIsNotAnArchive() async throws {
        let url = try write(Data("not an archive".utf8), name: "plain.txt")
        defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }

        await #expect(throws: ArchiveError.self) {
            _ = try await SevenZipArchiveService().open(url: url, password: nil)
        }
    }

    @Test func rejectsTraversalEntries() async throws {
        let url = try write(makeTar([("../escape.txt", "bad")]), name: "slip.tar")
        defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }

        do {
            _ = try await SevenZipArchiveService().open(url: url, password: nil)
            Issue.record("Expected the unsafe entry to be rejected")
        } catch let error as ArchiveError {
            #expect(error.code == .corrupt)
        }
    }

    @Test func reportsMissingFile() async throws {
        let url = URL(fileURLWithPath: "/tmp/QuarkZip-missing-\(UUID().uuidString).7z")
        do {
            _ = try await SevenZipArchiveService().open(url: url, password: nil)
            Issue.record("Expected a missing file to fail")
        } catch let error as ArchiveError {
            #expect(error.code == .notAnArchive)
        }
    }
}

/// Minimal ustar writer. Enough for the engine to read names, sizes, and
/// folder structure without shipping binary fixtures.
enum TarFixture {
    static func make(_ files: [(String, String)]) -> Data {
        var data = Data()
        for (name, contents) in files {
            let bytes = Data(contents.utf8)
            data.append(header(name: name, size: bytes.count))
            data.append(bytes)
            let padding = (512 - (bytes.count % 512)) % 512
            data.append(Data(repeating: 0, count: padding))
        }
        data.append(Data(repeating: 0, count: 1024))
        return data
    }

    private static func header(name: String, size: Int) -> Data {
        var block = [UInt8](repeating: 0, count: 512)
        write(name, into: &block, at: 0, width: 100)
        write("0000644", into: &block, at: 100, width: 8)
        write("0000000", into: &block, at: 108, width: 8)
        write("0000000", into: &block, at: 116, width: 8)
        write(octal(size, width: 12), into: &block, at: 124, width: 12)
        write(octal(0, width: 12), into: &block, at: 136, width: 12)
        for index in 148..<156 { block[index] = 0x20 }
        block[156] = UInt8(ascii: "0")
        write("ustar", into: &block, at: 257, width: 6)
        write("00", into: &block, at: 263, width: 2)
        write("user", into: &block, at: 265, width: 32)
        write("group", into: &block, at: 297, width: 32)
        let checksum = block.reduce(0) { $0 + Int($1) }
        write(String(format: "%06o", checksum) + "\0 ", into: &block, at: 148, width: 8)
        return Data(block)
    }

    private static func write(_ string: String, into block: inout [UInt8], at offset: Int, width: Int) {
        for (index, byte) in string.utf8.prefix(width).enumerated() {
            block[offset + index] = byte
        }
    }

    private static func octal(_ value: Int, width: Int) -> String {
        let digits = String(value, radix: 8)
        let padding = String(repeating: "0", count: max(0, width - 1 - digits.count))
        return padding + digits + "\0"
    }
}
