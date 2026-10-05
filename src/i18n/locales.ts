/// Language registry — the XDM-style index for translations.
///
/// Mirrors `app/XDM/Lang/index.txt` from subhra74/xdm: one display-name entry
/// per language file. To contribute a translation, add one JSON file next to
/// `en.json` and one entry below — see `docs/i18n.md`.
import en from "./locales/en.json";
import hi from "./locales/hi.json";

export interface LocaleMeta {
  /** BCP-47-ish code: `en`, `hi`, or region-specific like `pt-BR`. */
  code: string;
  /** English display name (for docs lists). */
  label: string;
  /** Native display name shown in the language menu. */
  native: string;
  /** Text direction for `document.dir`. */
  dir: "ltr" | "rtl";
  strings: Record<string, string>;
}

export const FALLBACK_CODE = "en";

export const LOCALES: LocaleMeta[] = [
  { code: "en", label: "English", native: "English", dir: "ltr", strings: en },
  { code: "hi", label: "Hindi", native: "हिन्दी", dir: "ltr", strings: hi },
];

/// Resolve a browser/OS locale tag to a shipped code with region fallback:
/// `pt-BR` → `pt` → `en`. Case- and separator-insensitive (`pt_BR` works).
export function resolveLocale(tag: string | null | undefined): string {
  const norm = (tag ?? "").trim().replace(/_/g, "-").toLowerCase();
  if (!norm) return FALLBACK_CODE;
  const exact = LOCALES.find((l) => l.code.toLowerCase() === norm);
  if (exact) return exact.code;
  const base = norm.split("-")[0];
  const partial = LOCALES.find((l) => l.code.toLowerCase() === base);
  if (partial) return partial.code;
  return FALLBACK_CODE;
}

export function localeMeta(code: string): LocaleMeta {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}
