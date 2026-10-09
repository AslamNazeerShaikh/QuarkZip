import { Check, Minus } from "lucide-react";

/// Theme-painted checkbox (button + `role="checkbox"`). The native input is
/// OS-painted: on Linux WebKitGTK it ignores `accent-color` and the check
/// glyph renders clipped/missing at small sizes — so the box, check, and
/// indeterminate dash are all drawn from `--qz-*` tokens instead. Shared by
/// the tree (and formerly the table): `label` doubles as the tooltip.
export default function TableCheckbox({
  label,
  checked,
  onToggle,
  id,
}: {
  label: string;
  checked: boolean | "mixed";
  onToggle: () => void;
  id?: string;
}) {
  const on = checked !== false;
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onToggle}
      className={`flex h-4 w-4 items-center justify-center rounded-[5px] border transition-all duration-150 outline-none motion-safe:active:scale-[0.9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--qz-primary)] ${
        on
          ? "border-transparent bg-[var(--qz-primary)]"
          : "border-[var(--qz-border)] bg-transparent hover:border-[var(--qz-primary)]"
      }`}
    >
      {checked === "mixed" ? (
        <Minus
          size={12}
          strokeWidth={3}
          aria-hidden
          className="text-[var(--qz-on-primary)]"
        />
      ) : (
        checked && (
          <Check
            size={12}
            strokeWidth={3}
            aria-hidden
            className="text-[var(--qz-on-primary)]"
          />
        )
      )}
    </button>
  );
}
