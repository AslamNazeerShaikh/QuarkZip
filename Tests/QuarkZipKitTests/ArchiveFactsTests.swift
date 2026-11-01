import Foundation
import Testing
@testable import QuarkZipKit

@Suite("ArchiveFacts")
struct ArchiveFactsTests {
    private func entry(_ raw: String,
                       kind: ArchiveEntry.Kind = .file,
                       size: UInt64 = 0,
                       method: String? = nil,
                       index: UInt64 = 0) throws -> ArchiveEntry {
        ArchiveEntry(id: .item(index),
                     path: try ArchivePath(raw),
                     kind: kind,
                     size: size,
                     method: method)
    }

    @Test func emptyArchiveHasZeroes() {
        let facts = ArchiveFacts.make(from: [])
        #expect(facts.files == 0)
        #expect(facts.folders == 0)
        #expect(facts.totalSize == 0)
        #expect(facts.largest.isEmpty)
        #expect(facts.methods.isEmpty)
    }

    @Test func countsFilesFoldersAndBytes() throws {
        let facts = ArchiveFacts.make(from: [
            try entry("a.txt", size: 10, index: 0),
            try entry("docs", kind: .folder, index: 1),
            try entry("b.bin", size: 5, index: 2),
        ])
        #expect(facts.files == 2)
        #expect(facts.folders == 1)
        #expect(facts.totalSize == 15)
    }

    @Test func largestSkipsFoldersAndKeepsOrderWithoutFullSort() throws {
        let facts = ArchiveFacts.make(from: [
            try entry("tiny.txt", size: 1, index: 0),
            try entry("huge.bin", size: 1_000, index: 1),
            try entry("dir", kind: .folder, size: 9_999, index: 2),
            try entry("mid.dat", size: 100, index: 3),
            try entry("small.dat", size: 10, index: 4),
            try entry("big2.bin", size: 500, index: 5),
            try entry("big3.bin", size: 700, index: 6),
            try entry("late-tiny.txt", size: 2, index: 7),
        ])
        #expect(facts.largest.map(\.name) == ["huge.bin", "big3.bin", "big2.bin", "mid.dat", "small.dat"])
    }

    @Test func methodsRankByCountAndSkipBlanks() throws {
        let facts = ArchiveFacts.make(from: [
            try entry("a", method: "Deflate", index: 0),
            try entry("b", method: "LZMA2", index: 1),
            try entry("c", method: "Deflate", index: 2),
            try entry("d", method: "", index: 3),
            try entry("e", index: 4),
            try entry("f", method: "LZMA2", index: 5),
            try entry("g", method: "LZMA2", index: 6),
        ])
        #expect(facts.methods.map(\.name) == ["LZMA2", "Deflate"])
        #expect(facts.methods.map(\.count) == [3, 2])
        #expect(facts.methods.first?.id == "LZMA2")
    }

    @Test func limitsAreHonored() throws {
        let entries = try (0..<8).map { i in
            try entry("f\(i).bin", size: UInt64(i + 1),
                      method: "M\(i)", index: UInt64(i))
        }
        let facts = ArchiveFacts.make(from: entries, largestLimit: 3, methodLimit: 2)
        #expect(facts.largest.count == 3)
        #expect(facts.largest.first?.size == 8)
        #expect(facts.methods.count == 2)
    }
}
