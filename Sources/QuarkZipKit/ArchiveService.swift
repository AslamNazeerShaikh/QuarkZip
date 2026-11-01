import Foundation

/// One opened archive: where it came from, what the handler called it, and
/// the immutable tree built from its listing.
public struct ArchiveSnapshot: Sendable {
    public let url: URL
    public let formatName: String?
    public let archiveSize: UInt64
    public let entries: [ArchiveEntry]
    public let tree: ArchiveTree

    public init(url: URL,
                formatName: String?,
                archiveSize: UInt64,
                entries: [ArchiveEntry]) {
        self.url = url
        self.formatName = formatName
        self.archiveSize = archiveSize
        self.entries = entries
        self.tree = ArchiveTree(entries: entries)
    }

    public var displayName: String { url.lastPathComponent }

    public var fileCount: Int {
        entries.lazy.filter { $0.kind == .file }.count
    }

    public var folderCount: Int { tree.folders.count }

    public var totalUncompressedSize: UInt64 {
        entries.reduce(0) { $0 &+ $1.size }
    }
}

/// The seam between the app and the engine.
///
/// Views and view models depend on this, never on `QZEngine`, so they can run
/// against a fake in tests.
public protocol ArchiveService: Sendable {
    func open(url: URL, password: String?) async throws -> ArchiveSnapshot
}
