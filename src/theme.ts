/// Theme model: explicit choice persisted in localStorage, resolved against
/// the OS preference when set to "system".

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "quarkzip-theme";

export function resolveTheme(
  choice: ThemeChoice,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (choice === "system") return systemPrefersDark ? "dark" : "light";
  return choice;
}

/// Applies the resolved theme to <html>: toggles `.dark` (used by the
/// Tailwind `dark:` custom variant) and sets `color-scheme` so native
/// controls (scrollbars, forms) follow too.
export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function loadChoice(): ThemeChoice {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "system"
    ? raw
    : "system";
}

export function saveChoice(choice: ThemeChoice): void {
  localStorage.setItem(STORAGE_KEY, choice);
}

/// Options for the theme segmented control.
///
/// NOTE: keep this annotated const in this .ts file, not in a .tsx file —
/// the vite:oxc transform used under `vitest --coverage` rejects an
/// annotated `const X: T[] = [...]` inside TSX (plain `vitest run` is fine).
export const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
];
