import { invoke } from "@tauri-apps/api/core";
import ThemeSwitch from "./ThemeSwitch";
import { useTheme } from "./useTheme";

export default function App() {
  const { choice, setChoice } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--qz-bg)] text-[var(--qz-text)]">
      <header
        data-tauri-drag-region
        onMouseDown={(e) => {
          if (e.button === 0) void invoke("drag_window");
        }}
        className="h-14 shrink-0 cursor-default select-none"
      />
      <main className="flex flex-1" />
      <ThemeSwitch choice={choice} onChange={setChoice} />
    </div>
  );
}
