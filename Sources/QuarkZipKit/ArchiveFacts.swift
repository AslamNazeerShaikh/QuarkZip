import Foundation

/// One method's share of an archive, for the inspector's Methods card.
public struct ArchiveMethodCount: Sendable, Equatable, Hashable, Identifiable {
    public let name: String
    public let count: Int

    public var id: String { name }

    public init(name: String, count: Int) {
        self.name = name
        self.count = count
    }
}

/// Archive-wide totals computed once per open, so views never scan every
/// entry per frame. `largest` keeps a top-N without a full sort: one pass,
/// O(n * limit) with a tiny limit.
public struct ArchiveFacts: Sendable, Equatable {
    public let files: Int
    public let folders: Int
    public let totalSize: UInt64
    public let largest: [ArchiveEntry]
    public let methods: [ArchiveMethodCount]

    public static let empty = ArchiveFacts(files: 0, folders: 0, totalSize: 0,
                                           largest: [], methods: [])

    public init(files: Int, folders: Int, totalSize: UInt64,
                largest: [ArchiveEntry], methods: [ArchiveMethodCount]) {
        self.files = files
        self.folders = folders
        self.totalSize = totalSize
        self.largest = largest
        self.methods = methods
    }

    public static func make(from entries: [ArchiveEntry],
                            largestLimit: Int = 5,
                            methodLimit: Int = 5) -> ArchiveFacts {
        var files = 0
        var folders = 0
        var total: UInt64 = 0
        var top: [ArchiveEntry] = []
        top.reserveCapacity(max(largestLimit, 0))
        var methodCounts: [String: Int] = [:]
        for entry in entries {
            if entry.kind == .folder {
                folders += 1
            } else {
                files += 1
                if top.count < largestLimit || entry.size > (top.last?.size ?? 0) {
                    top.append(entry)
                    top.sort { $0.size > $1.size }
                    if top.count > largestLimit {
                        top.removeLast()
                    }
                }
            }
            total &+= entry.size
            if let method = entry.method, !method.isEmpty {
                methodCounts[method, default: 0] += 1
            }
        }
        let methods = methodCounts
            .sorted { $0.value > $1.value }
            .prefix(max(methodLimit, 0))
            .map { ArchiveMethodCount(name: $0.key, count: $0.value) }
        return ArchiveFacts(files: files, folders: folders, totalSize: total,
                            largest: top, methods: methods)
    }
}
