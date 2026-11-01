import Foundation

/// A failure the user can understand and the UI can switch on.
///
/// Codes are stable. Messages are for people. Never match on the message.
public struct ArchiveError: Error, Equatable, Sendable, LocalizedError {
    public enum Code: String, Sendable, CaseIterable {
        case notAnArchive
        case passwordRequired
        case wrongPassword
        case corrupt
        case unsupportedFormat
        case unsafePath
        case io
        case cancelled
        case internalError
    }

    public let code: Code
    public let message: String
    public let detail: String?
    public let path: String?

    public init(code: Code,
                message: String? = nil,
                detail: String? = nil,
                path: String? = nil) {
        self.code = code
        self.message = message ?? code.defaultMessage
        self.detail = detail
        self.path = path
    }

    public var errorDescription: String? { message }
}

extension ArchiveError.Code {
    /// Short sentence used when the engine gives no better wording.
    public var defaultMessage: String {
        switch self {
        case .notAnArchive:
            return "This file is not an archive QuarkZip can read."
        case .passwordRequired:
            return "This archive is password protected."
        case .wrongPassword:
            return "That password did not work."
        case .corrupt:
            return "This archive is damaged."
        case .unsupportedFormat:
            return "This archive format cannot be used for that action."
        case .unsafePath:
            return "The archive contains a file that would be written outside the destination."
        case .io:
            return "The file could not be read or written."
        case .cancelled:
            return "The operation was cancelled."
        case .internalError:
            return "The engine hit an unexpected error."
        }
    }

    /// Whether the UI should offer the password sheet again.
    public var needsPassword: Bool {
        self == .passwordRequired || self == .wrongPassword
    }
}
