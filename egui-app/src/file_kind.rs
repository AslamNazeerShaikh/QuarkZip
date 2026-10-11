//! Entry classification ported from `src/lib/fileKind.ts`: folder vs file,
//! extension label from the file name only (dots in directory names are
//! not extensions). Icons are painted geometrically at usage sites
//! (folder = filled rounded mark, file = outline) — no icon font needed.

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Kind {
    Folder,
    Image,
    Video,
    Audio,
    Code,
    Text,
    Sheet,
    Archive,
    Disk,
    Executable,
    Script,
    Font,
    File,
}

pub struct FileKind {
    /// "Folder", the uppercase extension (`PNG`), or translated "File".
    pub label: String,
    pub kind: Kind,
}

fn ext_kind(ext: &str) -> Option<Kind> {
    Some(match ext {
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "bmp" | "ico" | "tiff" | "heic" => {
            Kind::Image
        }
        "mp4" | "mov" | "mkv" | "avi" | "webm" => Kind::Video,
        "mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a" => Kind::Audio,
        "js" | "jsx" | "ts" | "tsx" | "py" | "rs" | "go" | "java" | "c" | "h" | "cpp" | "rb"
        | "php" | "swift" | "kt" | "html" | "css" | "json" | "yaml" | "yml" | "toml" | "xml" => {
            Kind::Code
        }
        "txt" | "md" | "pdf" | "doc" | "docx" | "rtf" => Kind::Text,
        "xls" | "xlsx" | "csv" => Kind::Sheet,
        "zip" | "7z" | "tar" | "gz" | "bz2" | "xz" | "rar" => Kind::Archive,
        "iso" | "dmg" | "img" => Kind::Disk,
        "exe" | "msi" | "dll" | "so" | "dylib" => Kind::Executable,
        "sh" | "bat" | "ps1" => Kind::Script,
        "ttf" | "otf" | "woff" | "woff2" => Kind::Font,
        _ => return None,
    })
}

pub fn file_kind(path: &str, is_folder: bool, folder: &str, file: &str) -> FileKind {
    if is_folder {
        return FileKind {
            label: folder.to_string(),
            kind: Kind::Folder,
        };
    }
    let base = path.rsplit(['/', '\\']).next().unwrap_or(path);
    let ext = match base.rfind('.') {
        Some(dot) if dot > 0 => base[dot + 1..].to_lowercase(),
        _ => String::new(),
    };
    match ext_kind(&ext) {
        Some(kind) => FileKind {
            label: ext.to_uppercase(),
            kind,
        },
        None => FileKind {
            label: if ext.is_empty() {
                file.to_string()
            } else {
                ext.to_uppercase()
            },
            kind: Kind::File,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_label_folders_without_reading_names() {
        let k = file_kind("pics/photo.png", true, "Folder", "File");
        assert_eq!(k.label, "Folder");
        assert_eq!(k.kind, Kind::Folder);
    }

    #[test]
    fn should_read_extensions_from_the_file_name_only() {
        // Dots in directory names are not extensions (the old full-path
        // scan labeled `.bin/download-msgpackr-prebuilds` as BIN).
        let k = file_kind(".bin/download-msgpackr-prebuilds", false, "Folder", "File");
        assert_eq!(k.label, "File");
        let k = file_kind("docs/a.TXT", false, "Folder", "File");
        assert_eq!(k.label, "TXT");
        assert_eq!(k.kind, Kind::Text);
        let k = file_kind("x.7z", false, "Folder", "File");
        assert_eq!(k.kind, Kind::Archive);
    }
}
