import Foundation

/// Display formatting shared by the browser and the inspector.
///
/// Every function is pure and takes its locale, time zone, or unit system as
/// an argument so tests never depend on the machine.
public enum EntryFormat {
    /// File size in Finder's decimal units, for example `1.2 MB`.
    public static func bytes(_ value: UInt64) -> String {
        value.formatted(.byteCount(style: .file))
    }

    /// Packed size when known, otherwise an em dash.
    public static func packed(_ value: UInt64?) -> String {
        guard let value else { return "—" }
        return bytes(value)
    }

    /// Compression ratio as a whole percentage.
    public static func ratio(_ value: Double?) -> String {
        guard let value, value.isFinite else { return "—" }
        return "\(Int((value * 100).rounded()))%"
    }

    /// CRC-32 as eight uppercase hexadecimal digits.
    public static func crc(_ value: UInt32?) -> String {
        guard let value else { return "—" }
        return String(format: "%08X", value)
    }

    /// Method string from the handler, or an em dash.
    public static func method(_ value: String?) -> String {
        guard let value, !value.isEmpty else { return "—" }
        return value
    }

    /// A short date and time, or an em dash when the entry has none.
    public static func date(_ value: Date?,
                            timeZone: TimeZone = .current,
                            locale: Locale = .current) -> String {
        guard let value else { return "—" }
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.timeZone = timeZone
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: value)
    }
}
