import Foundation

/// One row of the archive composition chart.
public struct CategoryStat: Identifiable, Sendable, Equatable {
    public let category: EntryCategory
    public let count: Int
    public let bytes: UInt64

    public var id: EntryCategory { category }

    public init(category: EntryCategory, count: Int, bytes: UInt64) {
        self.category = category
        self.count = count
        self.bytes = bytes
    }
}

/// One opened archive: where it came from, what the handler called it, and
/// the immutable tree built from its listing.
public struct ArchiveSnapshot: Sendable {
    public let url: URL
    public let formatName: String?
    public let archiveSize: UInt64
    public let entries: [ArchiveEntry]
    public let tree: ArchiveTree
    public let categoryStats: [CategoryStat]
    public let totalPackedSize: UInt64
    public let encryptedCount: Int

    public init(url: URL,
                formatName: String?,
                archiveSize: UInt64,
                entries: [ArchiveEntry]) {
        self.url = url
        self.formatName = formatName
        self.archiveSize = archiveSize
        self.entries = entries
        self.tree = ArchiveTree(entries: entries)

        var counts: [EntryCategory: (count: Int, bytes: UInt64)] = [:]
        var packed: UInt64 = 0
        var encrypted = 0
        for entry in entries {
            let category = EntryCategory.of(entry)
            var bucket = counts[category] ?? (0, 0)
            bucket.count += 1
            bucket.bytes &+= entry.size
            counts[category] = bucket
            packed &+= entry.packedSize ?? 0
            if entry.isEncrypted { encrypted += 1 }
        }
        self.categoryStats = counts
            .map { CategoryStat(category: $0.key, count: $0.value.count, bytes: $0.value.bytes) }
            .sorted {
                if $0.bytes != $1.bytes { return $0.bytes > $1.bytes }
                if $0.count != $1.count { return $0.count > $1.count }
                return $0.category.rawValue < $1.category.rawValue
            }
        self.totalPackedSize = packed
        self.encryptedCount = encrypted
    }

    public var displayName: String { url.lastPathComponent }

    public var fileCount: Int {
        entries.lazy.filter { $0.kind == .file }.count
    }

    /// Some containers, like tar, never compress their payload. Showing a
    /// packed size and ratio there is noise, and often above 100 percent.
    public var showsCompressionMetrics: Bool {
        guard let formatName else { return true }
        return formatName.lowercased() != "tar"
    }

    public var folderCount: Int { tree.folders.count }

    public var totalUncompressedSize: UInt64 {
        entries.reduce(0) { $0 &+ $1.size }
    }

    /// Packed divided by unpacked, or nil when the container does not
    /// compress or the handler did not report packed sizes.
    public var compressionRatio: Double? {
        guard showsCompressionMetrics,
              totalUncompressedSize > 0,
              totalPackedSize > 0 else { return nil }
        return Double(totalPackedSize) / Double(totalUncompressedSize)
    }

    public func largestEntries(limit: Int = 5) -> [ArchiveEntry] {
        entries
            .filter { $0.kind == .file }
            .sorted { $0.size > $1.size }
            .prefix(max(0, limit))
            .map { $0 }
    }
}

/// The seam between the app and the engine.
///
/// Views and view models depend on this, never on `QZEngine`, so they can run
/// against a fake in tests.
public protocol ArchiveService: Sendable {
    func open(url: URL, password: String?) async throws -> ArchiveSnapshot
}
