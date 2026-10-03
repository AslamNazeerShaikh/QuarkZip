/// Format a byte count in IEC binary style: B/KiB/MiB/…/YiB on a 1024
/// base, one decimal, trailing `.0` stripped (`1536` → `1.5KiB`).
/// File sizes are whole bytes, so there is no sub-byte bit step — the scale
/// starts at B and runs to YiB.
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}${units[unit]}`;
}
