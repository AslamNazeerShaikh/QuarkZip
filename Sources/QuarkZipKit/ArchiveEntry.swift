import Foundation

/// Stable identity of an entry inside one archive session.
///
/// Real entries keep the engine index. Folders that only exist implicitly,
/// because the archive stores `a/b.txt` without a `a/` record, get a
/// path-based identity so they never collide with real items.
public enum EntryID: Hashable, Sendable {
    case item(UInt64)
    case folder(ArchivePath)
}

/// One record in an archive listing.
public struct ArchiveEntry: Identifiable, Hashable, Sendable {
    public enum Kind: String, Sendable, CaseIterable {
        case file
        case folder
    }

    public let id: EntryID
    public let path: ArchivePath
    public let kind: Kind
    public let size: UInt64
    public let packedSize: UInt64?
    public let modified: Date?
    public let crc: UInt32?
    public let method: String?
    public let isEncrypted: Bool
    public let attributes: UInt32

    public init(
        id: EntryID,
        path: ArchivePath,
        kind: Kind,
        size: UInt64,
        packedSize: UInt64? = nil,
        modified: Date? = nil,
        crc: UInt32? = nil,
        method: String? = nil,
        isEncrypted: Bool = false,
        attributes: UInt32 = 0
    ) {
        self.id = id
        self.path = path
        self.kind = kind
        self.size = size
        self.packedSize = packedSize
        self.modified = modified
        self.crc = crc
        self.method = method
        self.isEncrypted = isEncrypted
        self.attributes = attributes
    }

    /// A folder that the archive did not list explicitly.
    public static func implicitFolder(_ path: ArchivePath) -> ArchiveEntry {
        ArchiveEntry(id: .folder(path), path: path, kind: .folder, size: 0)
    }

    public var name: String { path.name }

    /// Packed size divided by size, or nil when it cannot be computed.
    public var compressionRatio: Double? {
        guard kind == .file, size > 0, let packedSize else { return nil }
        return Double(packedSize) / Double(size)
    }
}
