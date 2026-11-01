import Foundation

/// Column the browser sorts by.
public enum EntrySortField: String, Sendable, CaseIterable {
    case name
    case size
    case packedSize
    case modified
    case kind
}

/// A deterministic, stable order for archive entries.
public struct EntrySort: Sendable, Equatable {
    public var field: EntrySortField
    public var ascending: Bool
    public var foldersFirst: Bool

    public init(field: EntrySortField = .name,
                ascending: Bool = true,
                foldersFirst: Bool = true) {
        self.field = field
        self.ascending = ascending
        self.foldersFirst = foldersFirst
    }

    public func sorted(_ entries: [ArchiveEntry]) -> [ArchiveEntry] {
        entries.sorted(by: isOrderedBefore)
    }

    private func isOrderedBefore(_ lhs: ArchiveEntry, _ rhs: ArchiveEntry) -> Bool {
        if foldersFirst, lhs.kind != rhs.kind {
            return lhs.kind == .folder
        }
        switch compare(lhs, rhs) {
        case .orderedAscending:
            return ascending
        case .orderedDescending:
            return !ascending
        case .orderedSame:
            break
        }
        let byName = Self.compareNames(lhs.name, rhs.name)
        if byName != .orderedSame {
            return byName == .orderedAscending
        }
        if lhs.path != rhs.path {
            return lhs.path < rhs.path
        }
        return Self.stableKey(lhs.id) < Self.stableKey(rhs.id)
    }

    private func compare(_ lhs: ArchiveEntry, _ rhs: ArchiveEntry) -> ComparisonResult {
        switch field {
        case .name:
            return Self.compareNames(lhs.name, rhs.name)
        case .size:
            return Self.compare(lhs.size, rhs.size)
        case .packedSize:
            return Self.compare(lhs.packedSize ?? 0, rhs.packedSize ?? 0)
        case .modified:
            return Self.compare(lhs.modified?.timeIntervalSince1970 ?? 0,
                                rhs.modified?.timeIntervalSince1970 ?? 0)
        case .kind:
            return Self.compare(lhs.kind.rawValue, rhs.kind.rawValue)
        }
    }

    private static func compare<T: Comparable>(_ lhs: T, _ rhs: T) -> ComparisonResult {
        if lhs < rhs { return .orderedAscending }
        if lhs > rhs { return .orderedDescending }
        return .orderedSame
    }

    /// Case-insensitive, numeric-aware comparison independent of the user's
    /// locale, so tests and sort order stay stable.
    static func compareNames(_ lhs: String, _ rhs: String) -> ComparisonResult {
        lhs.compare(rhs,
                    options: [.caseInsensitive, .numeric, .widthInsensitive],
                    range: nil,
                    locale: Locale(identifier: "en_US_POSIX"))
    }

    private static func stableKey(_ id: EntryID) -> String {
        switch id {
        case .item(let index): return "0-\(index)"
        case .folder(let path): return "1-\(path.description)"
        }
    }
}
