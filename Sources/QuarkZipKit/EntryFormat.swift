import Foundation

/// Display formatting shared by the browser and the inspector.
///
/// Every function is pure and takes its locale, time zone, or unit system as
/// an argument so tests never depend on the machine.
///
/// Sizes always use binary IEC units (1 KiB = 1,024 bytes) so a byte count
/// never depends on Finder's decimal display.
public enum EntryFormat {
    /// File size in binary IEC units, for example `1.5 KiB` or `12.1 KiB`.
    public static func bytes(_ value: UInt64) -> String {
        if value == 0 { return "0 B" }
        if value < 1_024 { return "\(value) B" }
        let units = ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB"]
        var scaled = Double(value)
        var unitIndex = -1
        while scaled >= 1_024 && unitIndex < units.count - 1 {
            scaled /= 1_024
            unitIndex += 1
        }
        let formatted: String
        if scaled >= 100 {
            formatted = String(format: "%.0f", scaled)
        } else {
            formatted = String(format: "%.1f", scaled)
        }
        return "\(formatted) \(units[unitIndex])"
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

    /// A compact date for dense tables, or an em dash when absent.
    public static func shortDate(_ value: Date?,
                                 timeZone: TimeZone = .current,
                                 locale: Locale = .current) -> String {
        guard let value else { return "—" }
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.timeZone = timeZone
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: value)
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
