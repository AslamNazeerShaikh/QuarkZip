/// Format a byte count the way `ls -lh` shows it: B/K/M/G/T units on a
/// 1024 base, one decimal, trailing `.0` stripped (`1536` → `1.5K`).
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "K", "M", "G", "T"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}${units[unit]}`;
}
