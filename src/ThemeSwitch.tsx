import { THEME_OPTIONS, type ThemeChoice } from "./theme";

/// Floating Light / System / Dark segmented control.
export default function ThemeSwitch({
  choice,
  onChange,
}: {
  choice: ThemeChoice;
  onChange: (c: ThemeChoice) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Color theme"
      className="fixed bottom-4 right-4 flex rounded-full border border-[var(--qz-border)] bg-[var(--qz-surface)]/80 p-1 shadow-lg backdrop-blur"
    >
      {THEME_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={choice === opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-300 ${
            choice === opt.value
              ? "bg-[var(--qz-primary)] text-white dark:text-[var(--qz-bg)]"
              : "text-[var(--qz-muted)] hover:text-[var(--qz-text)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
