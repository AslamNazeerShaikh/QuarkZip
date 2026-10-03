import { invoke } from "@tauri-apps/api/core";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header
        data-tauri-drag-region
        onMouseDown={(e) => {
          if (e.button === 0) void invoke("drag_window");
        }}
        className="h-14 shrink-0 cursor-default select-none"
      />
      <main className="flex flex-1" />
    </div>
  );
}
