import { useEffect, useRef, useState } from "react";

/// Viewport-anchored floating menu: measures the trigger shell while open
/// and positions the listbox through a `document.body` portal, so card
/// `overflow-hidden` (and material `backdrop-filter` traps) can never
/// clip it — e.g. the Language menu on the short collapsed
/// card, where an upward menu is taller than the card itself. Re-measures
/// on window resize. Callers keep their own outside-click/Escape close,
/// extended to the menu element (a portal click would otherwise read as
/// "outside" and swallow the option's click).
export function usePortaledMenu<E extends HTMLElement>(
  open: boolean,
  anchorRef: React.RefObject<E | null>,
) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = anchorRef.current;
      if (el) setRect(el.getBoundingClientRect());
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, anchorRef]);
  return { menuRef, rect };
}

/// Fixed style pinning the menu 8px above its anchor shell, aligned to
/// the shell's left edge and at least as wide as the shell.
export function menuAbove(rect: DOMRect): React.CSSProperties {
  return {
    position: "fixed",
    left: rect.left,
    bottom: window.innerHeight - rect.top + 8,
    minWidth: rect.width,
  };
}

/// Fixed style pinning the menu 8px below its anchor shell, aligned to
/// the shell's left edge and at least as wide as the shell. Used while
/// the overview card is collapsed: the table below has ample room, so
/// the menu drops over it instead of floating up past the card.
export function menuBelow(rect: DOMRect): React.CSSProperties {
  return {
    position: "fixed",
    left: rect.left,
    top: rect.bottom + 8,
    minWidth: rect.width,
  };
}
