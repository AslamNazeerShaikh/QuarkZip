/// Format a byte count in IEC binary style: B/KiB/MiB/…/YiB on a 1024
/// base, one decimal, trailing `.0` stripped (`1536` → `1.5KiB`).
/// File sizes are whole bytes, so there is no sub-byte bit step — the scale
/// starts at B and runs to YiB.

/// Active Intl locale tag for counts/dates. The language provider sets this
/// on init and on every switch; default `en-US` keeps unit tests and
/// no-provider renders deterministic.
let activeLocale = "en-US";

export function setFormatLocale(tag: string): void {
  try {
    // Throws on malformed tags — fall back instead of breaking formatting.
    new Intl.NumberFormat(tag);
    activeLocale = tag;
  } catch {
    activeLocale = "en-US";
  }
}

export function getFormatLocale(): string {
  return activeLocale;
}

/// Locale-grouped integer (`10000` → `10,000` in en, `१०,०००` in hi).
export function formatCount(value: number): string {
  return value.toLocaleString(activeLocale);
}

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

/// Format a `Date` in the system's local time zone with AM/PM
/// (`Oct 3, 2026, 9:39:45 PM`). The active UI locale shapes the output;
/// tests pin `en-US` via the default above.
export function formatDateTimeLocal(date: Date): string {
  return date.toLocaleString(activeLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
const MODIFIED_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/;

/// Format a 7zz `Modified` stamp (`2026-10-03 21:39:45.966`) in the system's
/// local time zone with AM/PM (`Oct 3, 2026, 9:39:45 PM`). 7zz stamps carry
/// no offset, so the fields are read as local wall time. Returns `—` for
/// null/blank and the raw string when it does not parse.
export function formatModified(raw: string | null): string {
  if (raw === null || raw.trim() === "") return "—";
  const m = raw.trim().match(MODIFIED_RE);
  if (!m) return raw;
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
  const date = new Date(+y, +mo - 1, +d, +h, +mi, +s);
  if (Number.isNaN(date.getTime())) return raw;
  return formatDateTimeLocal(date);
}
