import {
  Disc3,
  File,
  FileArchive,
  FileAudio,
  FileCode2,
  FileCog,
  FileImage,
  FileSpreadsheet,
  FileTerminal,
  FileText,
  FileType,
  FileVideo,
  Folder,
  type LucideIcon,
} from "lucide-react";

export interface FileKind {
  /** "Folder" or the uppercase extension (e.g. "PNG"), "File" when unknown. */
  label: string;
  icon: LucideIcon;
  isFolder: boolean;
}

const EXTENSIONS: Record<string, { label?: string; icon: LucideIcon }> = {
  // Images
  png: { icon: FileImage },
  jpg: { icon: FileImage },
  jpeg: { icon: FileImage },
  gif: { icon: FileImage },
  webp: { icon: FileImage },
  svg: { icon: FileImage },
  bmp: { icon: FileImage },
  ico: { icon: FileImage },
  tiff: { icon: FileImage },
  heic: { icon: FileImage },
  // Video
  mp4: { icon: FileVideo },
  mov: { icon: FileVideo },
  mkv: { icon: FileVideo },
  avi: { icon: FileVideo },
  webm: { icon: FileVideo },
  // Audio
  mp3: { icon: FileAudio },
  wav: { icon: FileAudio },
  flac: { icon: FileAudio },
  aac: { icon: FileAudio },
  ogg: { icon: FileAudio },
  m4a: { icon: FileAudio },
  // Code & text
  js: { icon: FileCode2 },
  jsx: { icon: FileCode2 },
  ts: { icon: FileCode2 },
  tsx: { icon: FileCode2 },
  py: { icon: FileCode2 },
  rs: { icon: FileCode2 },
  go: { icon: FileCode2 },
  java: { icon: FileCode2 },
  c: { icon: FileCode2 },
  h: { icon: FileCode2 },
  cpp: { icon: FileCode2 },
  rb: { icon: FileCode2 },
  php: { icon: FileCode2 },
  swift: { icon: FileCode2 },
  kt: { icon: FileCode2 },
  html: { icon: FileCode2 },
  css: { icon: FileCode2 },
  json: { icon: FileCode2 },
  yaml: { icon: FileCode2 },
  yml: { icon: FileCode2 },
  toml: { icon: FileCode2 },
  xml: { icon: FileCode2 },
  txt: { icon: FileText },
  md: { icon: FileText },
  pdf: { icon: FileText },
  doc: { icon: FileText },
  docx: { icon: FileText },
  rtf: { icon: FileText },
  // Sheets
  xls: { icon: FileSpreadsheet },
  xlsx: { icon: FileSpreadsheet },
  csv: { icon: FileSpreadsheet },
  // Archives & disks
  zip: { icon: FileArchive },
  "7z": { icon: FileArchive },
  tar: { icon: FileArchive },
  gz: { icon: FileArchive },
  bz2: { icon: FileArchive },
  xz: { icon: FileArchive },
  rar: { icon: FileArchive },
  iso: { icon: Disc3 },
  dmg: { icon: Disc3 },
  img: { icon: Disc3 },
  // Executables & scripts
  exe: { icon: FileCog },
  msi: { icon: FileCog },
  dll: { icon: FileCog },
  so: { icon: FileCog },
  dylib: { icon: FileCog },
  sh: { icon: FileTerminal },
  bat: { icon: FileTerminal },
  ps1: { icon: FileTerminal },
  // Fonts
  ttf: { icon: FileType },
  otf: { icon: FileType },
  woff: { icon: FileType },
  woff2: { icon: FileType },
};

/// Classify an archive entry for display: folder vs file, matching icon,
/// and short type label. Folders are entries with no reported size.
export function fileKind(path: string, size: number | null): FileKind {
  if (size === null || size === 0) {
    return { label: "Folder", icon: Folder, isFolder: true };
  }
  const dot = path.lastIndexOf(".");
  const ext = dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
  const known = ext ? EXTENSIONS[ext] : undefined;
  if (!known) return { label: ext ? ext.toUpperCase() : "File", icon: File, isFolder: false };
  return {
    label: ext.toUpperCase(),
    icon: known.icon,
    isFolder: false,
  };
}
