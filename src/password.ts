/// Detects 7zz password problems in backend error output (mirrors
/// `archive::is_password_output` in Rust — keep the marker lists in sync).
/// Header-encrypted archives refuse to list (`Enter password:` + `Break
/// signaled`, exit 255); test/extract of encrypted content report
/// `Wrong password` / `Cannot open encrypted archive` (exit 2).
const MARKERS = [
  "wrong password",
  "enter password",
  "cannot open encrypted archive",
  "headers error",
  "break signaled",
];

export function isPasswordError(message: unknown): boolean {
  if (typeof message !== "string") return false;
  const lower = message.toLowerCase();
  return MARKERS.some((m) => lower.includes(m));
}
