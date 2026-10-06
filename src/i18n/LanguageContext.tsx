/// Dynamic language context: provider + `useLanguage()` hook.
///
/// Detection order: saved choice (`quarkzip.lang`) → `navigator.language`
/// (already reflects the OS locale inside WebKitGTK) → English. Region tags
/// fall back through `resolveLocale` (`pt-BR` → `pt` → `en`), and every
/// lookup falls back per-key to English, so a partial community translation
/// can never blank the UI. Works without a provider (tests, stories): the
/// default context is plain English.
import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { FALLBACK_CODE, localeMeta, LOCALES, resolveLocale } from "./locales";
import { setFormatLocale } from "../lib/format";

const STORAGE_KEY = "quarkzip.lang";

export type Vars = Record<string, string | number>;

function interpolate(template: string, vars: Vars): string {
  let out = template;
  for (const [name, value] of Object.entries(vars)) {
    out = out.split(`{${name}}`).join(String(value));
  }
  return out;
}

/// Pure lookup shared by the hook and the no-provider default context.
export function translate(code: string, key: string, vars: Vars = {}): string {
  const active = localeMeta(code).strings[key];
  const template = active ?? localeMeta(FALLBACK_CODE).strings[key] ?? key;
  if (active === undefined && template === key) {
    console.warn(`[i18n] missing key "${key}"`);
  }
  return interpolate(template, vars);
}

function detectInitial(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES.some((l) => l.code === saved)) return saved;
  } catch {
    /* storage unavailable: fall through to navigator */
  }
  const nav =
    typeof navigator !== "undefined" ? navigator.language : FALLBACK_CODE;
  return resolveLocale(nav);
}

function applySideEffects(code: string): void {
  try {
    document.documentElement.lang = code;
    document.documentElement.dir = localeMeta(code).dir;
  } catch {
    /* non-DOM runtimes */
  }
  setFormatLocale(code);
}

interface LanguageValue {
  lang: string;
  setLang: (code: string) => void;
  t: (key: string, vars?: Vars) => string;
}

const LanguageContext = createContext<LanguageValue>({
  lang: FALLBACK_CODE,
  setLang: () => {},
  t: (key, vars) => translate(FALLBACK_CODE, key, vars),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(() => {
    const initial = detectInitial();
    applySideEffects(initial);
    return initial;
  });

  const setLang = useCallback((code: string) => {
    if (!LOCALES.some((l) => l.code === code)) return;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* storage unavailable: session-only */
    }
    applySideEffects(code);
    setLangState(code);
  }, []);

  const t = useCallback(
    (key: string, vars: Vars = {}) => translate(lang, key, vars),
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageValue {
  return useContext(LanguageContext);
}
