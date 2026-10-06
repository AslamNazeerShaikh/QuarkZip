import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  loadChoice,
  resolveTheme,
  saveChoice,
  type ResolvedTheme,
  type ThemeChoice,
} from "../lib/theme";

/// Tracks the persisted theme choice, applies the resolved theme to <html>,
/// and re-resolves live when the OS preference changes in "system" mode.
export function useTheme(): {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
  setChoice: (c: ThemeChoice) => void;
} {
  const [choice, setChoiceState] = useState<ThemeChoice>(loadChoice);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved = resolveTheme(choice, systemDark);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const setChoice = useCallback((c: ThemeChoice) => {
    saveChoice(c);
    setChoiceState(c);
  }, []);

  return { choice, resolved, setChoice };
}
