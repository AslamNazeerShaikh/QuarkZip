import Foundation

/// An immutable index of an archive listing.
///
/// The tree is built once per open. It never walks the entry array per row:
/// children are pre-grouped by parent folder, and folders that the archive
/// omits are synthesized so navigation always works.
public struct ArchiveTree: Sendable {
    /// Real entries in archive order, one per path. Later duplicates are
    /// dropped.
    public let entries: [ArchiveEntry]

    /// Every folder path, including implicit ones, sorted.
    public let folders: [ArchivePath]

    private let childrenByFolder: [ArchivePath: [ArchiveEntry]]
    private let entriesByPath: [ArchivePath: ArchiveEntry]

    public init(entries: [ArchiveEntry]) {
        var seen = Set<ArchivePath>()
        var real: [ArchiveEntry] = []
        var children: [ArchivePath: [ArchiveEntry]] = [:]
        var realFolders = Set<ArchivePath>()
        var byPath: [ArchivePath: ArchiveEntry] = [:]

        for entry in entries where seen.insert(entry.path).inserted {
            real.append(entry)
            byPath[entry.path] = entry
            children[entry.path.parent, default: []].append(entry)
            if entry.kind == .folder {
                realFolders.insert(entry.path)
            }
        }

        var allFolders = realFolders
        for entry in real {
            var parent = entry.path.parent
            while !parent.isRoot {
                allFolders.insert(parent)
                parent = parent.parent
            }
        }

        for folder in allFolders where !realFolders.contains(folder) {
            children[folder.parent, default: []].append(.implicitFolder(folder))
        }

        self.entries = real
        self.folders = allFolders.sorted()
        self.childrenByFolder = children
        self.entriesByPath = byPath
    }

    /// Direct children of a folder. Unsorted; apply `EntrySort` at the view.
    public func children(of folder: ArchivePath) -> [ArchiveEntry] {
        childrenByFolder[folder] ?? []
    }

    /// The real entry for a path, if the archive listed it.
    public func entry(at path: ArchivePath) -> ArchiveEntry? {
        entriesByPath[path]
    }

    public var isEmpty: Bool { entries.isEmpty }
}
