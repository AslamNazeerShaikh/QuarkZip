import Foundation

/// A named slice of the browser. Sidebar rows and filter chips both set it.
public enum EntryFilter: Hashable, Sendable {
    case all
    case category(EntryCategory)
    case folders
    case encrypted
    case large

    /// Entries at or above this size appear under Large Items.
    public static let largeThreshold: UInt64 = 10 * 1024 * 1024

    public var title: String {
        switch self {
        case .all: return "All Entries"
        case .category(let category): return category.displayName
        case .folders: return "Folders"
        case .encrypted: return "Encrypted"
        case .large: return "Large Items"
        }
    }

    public func matches(_ entry: ArchiveEntry) -> Bool {
        switch self {
        case .all:
            return true
        case .category(let category):
            return EntryCategory.of(entry) == category
        case .folders:
            return entry.kind == .folder
        case .encrypted:
            return entry.isEncrypted
        case .large:
            return entry.kind == .file && entry.size >= Self.largeThreshold
        }
    }
}
