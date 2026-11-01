import Foundation
import QZEngine

/// The real archive service. Wraps the C ABI and turns it into Swift values.
///
/// The C calls run on a background queue. One session is created, read, and
/// closed inside that one call, so no engine handle is shared.
public struct SevenZipArchiveService: ArchiveService {
    public init() {}

    /// Version string reported by the linked engine.
    public static var engineVersion: String {
        String(cString: qz_version())
    }

    public func open(url: URL, password: String?) async throws -> ArchiveSnapshot {
        try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let snapshot = try Self.openSynchronously(url: url, password: password)
                    continuation.resume(returning: snapshot)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    static func openSynchronously(url: URL, password: String?) throws -> ArchiveSnapshot {
        var status = QZ_E_INTERNAL
        var messageBuffer = [CChar](repeating: 0, count: 1024)

        let session: OpaquePointer? = url.path(percentEncoded: false).withCString { path in
            withOptionalCString(password) { passwordPointer in
                qz_open(path, passwordPointer, &status, &messageBuffer, messageBuffer.count)
            }
        }

        guard let session else {
            throw ArchiveError(code: ArchiveError.Code(engineStatus: status.rawValue),
                               message: engineMessage(messageBuffer))
        }
        defer { qz_close(session) }

        let count = qz_entry_count(session)
        let entries = try readEntries(count: count) { index in
            var raw = QzEntry()
            let status = qz_entry_at(session, index, &raw)
            return (status, raw)
        }

        return ArchiveSnapshot(
            url: url,
            formatName: formatName(qz_format_name(session)),
            archiveSize: qz_archive_size(session),
            entries: entries
        )
    }

    /// Pulls entries through an injectable source so the failure and edge
    /// paths can be tested without a corrupt archive on disk.
    static func readEntries(
        count: UInt64,
        next: (UInt64) -> (QzStatus, QzEntry)
    ) throws -> [ArchiveEntry] {
        var entries: [ArchiveEntry] = []
        entries.reserveCapacity(Int(count))
        for index in 0..<count {
            let (status, raw) = next(index)
            guard status.rawValue == QZ_OK.rawValue else {
                throw ArchiveError(code: ArchiveError.Code(engineStatus: status.rawValue))
            }
            entries.append(try makeEntry(raw, index: index))
        }
        return entries
    }

    static func makeEntry(_ raw: QzEntry, index: UInt64) throws -> ArchiveEntry {
        guard let rawPath = raw.path else {
            throw ArchiveError(code: .corrupt,
                               message: "Entry \(index) has no path.")
        }
        let path = try archivePath(rawPath, index: index)
        let kind: ArchiveEntry.Kind = raw.is_dir == 0 ? .file : .folder
        let modified = raw.modified_unix > 0
            ? Date(timeIntervalSince1970: TimeInterval(raw.modified_unix))
            : nil
        return ArchiveEntry(
            id: .item(index),
            path: path,
            kind: kind,
            size: raw.size,
            packedSize: raw.packed_size_defined == 0 ? nil : raw.packed_size,
            modified: modified,
            crc: raw.crc == 0 ? nil : raw.crc,
            method: raw.method.map { String(cString: $0) },
            isEncrypted: raw.is_encrypted != 0,
            attributes: raw.attributes
        )
    }

    static func formatName(_ pointer: UnsafePointer<CChar>?) -> String? {
        pointer.map { String(cString: $0) }
    }

    private static func archivePath(_ pointer: UnsafePointer<CChar>,
                                    index: UInt64) throws -> ArchivePath {
        let raw = String(cString: pointer)
        do {
            return try ArchivePath(raw)
        } catch {
            throw ArchiveError(code: .corrupt,
                               message: "Entry \(index) has a path that cannot be used.",
                               detail: raw)
        }
    }

    static func engineMessage(_ buffer: [CChar]) -> String? {
        let text = buffer.withUnsafeBufferPointer { pointer in
            guard let base = pointer.baseAddress else { return "" }
            return String(cString: base)
        }
        return text.isEmpty ? nil : text
    }
}

private func withOptionalCString<T>(
    _ value: String?,
    _ body: (UnsafePointer<CChar>?) -> T
) -> T {
    guard let value else { return body(nil) }
    return value.withCString(body)
}
