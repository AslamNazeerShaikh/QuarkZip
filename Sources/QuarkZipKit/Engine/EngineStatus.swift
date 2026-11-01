import Foundation
import QZEngine

extension ArchiveError.Code {
    /// Maps the C status code to the domain error code.
    ///
    /// `QZ_OK` is never passed here; it maps to `.internalError` so a caller
    /// that forgets to check cannot silently succeed.
    init(engineStatus status: UInt32) {
        switch status {
        case QZ_E_NOT_ARCHIVE.rawValue:
            self = .notAnArchive
        case QZ_E_PASSWORD.rawValue:
            self = .passwordRequired
        case QZ_E_WRONG_PASSWORD.rawValue:
            self = .wrongPassword
        case QZ_E_CORRUPT.rawValue:
            self = .corrupt
        case QZ_E_UNSUPPORTED.rawValue:
            self = .unsupportedFormat
        case QZ_E_UNSAFE_PATH.rawValue:
            self = .unsafePath
        case QZ_E_IO.rawValue:
            self = .io
        case QZ_E_CANCELLED.rawValue:
            self = .cancelled
        case QZ_OK.rawValue, QZ_E_INTERNAL.rawValue:
            self = .internalError
        default:
            self = .internalError
        }
    }
}