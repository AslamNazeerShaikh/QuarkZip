import Foundation

/// A normalized path inside an archive.
///
/// Archive paths always use `/`, never start with one, and never contain
/// `.` or `..` components. Constructing an `ArchivePath` is the first line of
/// defense against zip-slip entries.
public struct ArchivePath: Hashable, Sendable, Comparable, CustomStringConvertible {
    public enum InvalidReason: String, Error, Sendable, Equatable {
        case empty
        case absolute
        case parentTraversal
        case currentDirectory
        case driveLetter
        case nullByte
        case emptyComponent
    }

    public let components: [String]

    /// The archive root. It has no components and renders as an empty string.
    public static let root = ArchivePath(components: [])

    private init(components: [String]) {
        self.components = components
    }

    /// Parses a raw entry path from an archive.
    public init(_ raw: String) throws {
        guard !raw.isEmpty else { throw InvalidReason.empty }
        guard !raw.utf8.contains(0) else { throw InvalidReason.nullByte }

        var normalized = raw.replacingOccurrences(of: "\\", with: "/")
        if normalized.hasPrefix("/") { throw InvalidReason.absolute }
        if normalized.count >= 2, normalized[normalized.index(normalized.startIndex, offsetBy: 1)] == ":" {
            let first = normalized[normalized.startIndex]
            if first.isASCII, first.isLetter { throw InvalidReason.driveLetter }
        }
        while normalized.hasSuffix("/") { normalized.removeLast() }
        guard !normalized.isEmpty else { throw InvalidReason.empty }

        let parts = normalized.split(separator: "/", omittingEmptySubsequences: false).map(String.init)
        guard !parts.contains(where: \.isEmpty) else { throw InvalidReason.emptyComponent }
        guard !parts.contains("..") else { throw InvalidReason.parentTraversal }
        guard !parts.contains(".") else { throw InvalidReason.currentDirectory }

        self.components = parts
    }

    private init(validated components: [String]) {
        self.components = components
    }

    /// Adds one path component. The component must be a single name.
    public func appending(_ component: String) throws -> ArchivePath {
        guard !component.isEmpty else { throw InvalidReason.emptyComponent }
        guard !component.contains("/"), !component.contains("\\") else {
            throw InvalidReason.emptyComponent
        }
        guard !component.utf8.contains(0) else { throw InvalidReason.nullByte }
        guard component != "." else { throw InvalidReason.currentDirectory }
        guard component != ".." else { throw InvalidReason.parentTraversal }
        return ArchivePath(validated: components + [component])
    }

    /// The containing folder, or the root for a top-level item.
    public var parent: ArchivePath {
        components.count <= 1 ? .root : ArchivePath(validated: Array(components.dropLast()))
    }

    /// The last component, or an empty string at the root.
    public var name: String { components.last ?? "" }

    public var isRoot: Bool { components.isEmpty }

    /// True when `self` sits strictly below `other`.
    public func isDescendant(of other: ArchivePath) -> Bool {
        guard other.components.count < components.count else { return false }
        return Array(components.prefix(other.components.count)) == other.components
    }

    public var description: String { components.joined(separator: "/") }

    public static func < (lhs: ArchivePath, rhs: ArchivePath) -> Bool {
        lhs.description < rhs.description
    }
}
