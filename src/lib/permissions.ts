/// Detects filesystem permission denials in backend error output.
/// The engine maps EACCES/EPERM to "Permission denied: <path>" (and the
/// Rust preflight does the same for missing/unreadable inputs); looser
/// OS wordings are matched too so the permission dialog never misses.
const MARKERS = [
  "permission denied",
  "operation not permitted",
  "not permitted",
  "eacces",
  "eperm",
];

export function isPermissionError(message: unknown): boolean {
  if (typeof message !== "string") return false;
  const lower = message.toLowerCase();
  return MARKERS.some((m) => lower.includes(m));
}

/// macOS Privacy settings, Full Disk Access pane: the only grant that
/// unblocks TCC-protected locations. Best-effort (Linux ignores it).
export const PRIVACY_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";
