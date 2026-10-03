import { THEME_OPTIONS } from "./theme";

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
      className="fixed bottom-4 right-4 flex rounded-full border border-black/10 bg-white/80 p-1 shadow-lg backdrop-blur dark:border-white/10 dark:bg-zinc-800/80"
    >
      {THEME_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={choice === opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-300 ${
            choice === opt.value
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
