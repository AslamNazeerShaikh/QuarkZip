import Foundation

/// A coarse bucket used by the color system, filters, and composition
/// charts. The category is derived from the entry kind and file extension,
/// never stored in the archive.
public enum EntryCategory: String, CaseIterable, Sendable, Hashable {
    case folder
    case document
    case image
    case video
    case audio
    case archive
    case code
    case other

    public var displayName: String {
        switch self {
        case .folder: return "Folder"
        case .document: return "Document"
        case .image: return "Image"
        case .video: return "Video"
        case .audio: return "Audio"
        case .archive: return "Archive"
        case .code: return "Code"
        case .other: return "Other"
        }
    }

    /// One unique emoji per bucket. Shown only when the emoji setting is on.
    public var emoji: String {
        switch self {
        case .folder: return "📁"
        case .document: return "📄"
        case .image: return "🖼️"
        case .video: return "🎬"
        case .audio: return "🎵"
        case .archive: return "📦"
        case .code: return "💻"
        case .other: return "📃"
        }
    }

    /// Filled form for tiles, sidebar emphasis, and selected states.
    public var symbolName: String { filledSymbolName }

    public var filledSymbolName: String {
        switch self {
        case .folder: return "folder.fill"
        case .document: return "doc.text.fill"
        case .image: return "photo.fill"
        case .video: return "film.fill"
        case .audio: return "waveform.circle.fill"
        case .archive: return "archivebox.fill"
        case .code: return "chevron.left.forwardslash.chevron.right"
        case .other: return "doc.fill"
        }
    }

    /// Outline form for dense rows, where a fill reads too heavy at 10 to 12 pt.
    public var outlineSymbolName: String {
        switch self {
        case .folder: return "folder"
        case .document: return "doc.text"
        case .image: return "photo"
        case .video: return "film"
        case .audio: return "waveform"
        case .archive: return "archivebox"
        case .code: return "chevron.left.forwardslash.chevron.right"
        case .other: return "doc"
        }
    }

    public static func of(_ entry: ArchiveEntry) -> EntryCategory {
        entry.kind == .folder ? .folder : of(fileName: entry.path.name)
    }

    public static func of(fileName: String) -> EntryCategory {
        let fileExtension = (fileName as NSString).pathExtension.lowercased()
        guard !fileExtension.isEmpty else { return .other }
        if imageExtensions.contains(fileExtension) { return .image }
        if videoExtensions.contains(fileExtension) { return .video }
        if audioExtensions.contains(fileExtension) { return .audio }
        if archiveExtensions.contains(fileExtension) { return .archive }
        if codeExtensions.contains(fileExtension) { return .code }
        if documentExtensions.contains(fileExtension) { return .document }
        return .other
    }

    private static let imageExtensions: Set<String> = [
        "png", "jpg", "jpeg", "gif", "heic", "heif", "tif", "tiff", "bmp",
        "webp", "svg", "raw", "dng", "psd", "avif",
    ]

    private static let videoExtensions: Set<String> = [
        "mp4", "mov", "m4v", "avi", "mkv", "webm", "wmv", "flv", "mpg", "mpeg",
    ]

    private static let audioExtensions: Set<String> = [
        "mp3", "wav", "aiff", "aif", "flac", "m4a", "aac", "ogg", "opus", "mid",
    ]

    private static let archiveExtensions: Set<String> = [
        "zip", "7z", "tar", "gz", "tgz", "bz2", "tbz2", "xz", "txz", "rar",
        "cab", "iso", "dmg", "zst", "lz", "lzma", "jar", "war", "pkg",
    ]

    private static let codeExtensions: Set<String> = [
        "swift", "c", "cc", "cpp", "cxx", "h", "hpp", "m", "mm", "js", "jsx",
        "ts", "tsx", "py", "rb", "go", "rs", "java", "kt", "kts", "cs", "php",
        "sh", "bash", "zsh", "fish", "json", "xml", "yaml", "yml", "toml",
        "html", "css", "scss", "sql", "plist", "pbxproj",
    ]

    private static let documentExtensions: Set<String> = [
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md",
        "rtf", "csv", "pages", "numbers", "keynote", "epub", "tex", "log",
    ]
}
