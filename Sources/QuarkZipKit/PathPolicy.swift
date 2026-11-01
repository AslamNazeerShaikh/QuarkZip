import Foundation

/// The decision made for one entry before extraction writes anything.
public struct PathPolicy: Sendable {
    public enum Verdict: Equatable, Sendable {
        case safe
        case collision
        case unsafe(ArchivePath.InvalidReason)
    }

    public init() {}

    /// Classifies an entry against the files already present at the
    /// destination. Folders may merge; files may not.
    public func verdict(for entry: ArchiveEntry,
                        existing: Set<ArchivePath>) -> Verdict {
        if entry.path.isRoot {
            return .unsafe(.empty)
        }
        if entry.kind == .folder {
            return .safe
        }
        return existing.contains(entry.path) ? .collision : .safe
    }

    /// Filters entries down to the ones that must be reported before a run.
    public func conflicts(for entries: [ArchiveEntry],
                          existing: Set<ArchivePath>) -> [ArchiveEntry] {
        entries.filter { verdict(for: $0, existing: existing) != .safe }
    }
}
