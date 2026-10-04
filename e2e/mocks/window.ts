/// E2E mock for `@tauri-apps/api/window`.
import { state } from "./backend";

export function getCurrentWindow() {
  return {
    setTitle: (title: string) => {
      state.calls.setTitle.push(title);
      return Promise.resolve();
    },
    minimize: () => {
      state.calls.minimize += 1;
      return Promise.resolve();
    },
    toggleMaximize: () => {
      state.calls.toggleMaximize += 1;
      state.maximized = !state.maximized;
      for (const cb of resizeHandlers) void cb();
      return Promise.resolve();
    },
    close: () => {
      state.calls.close += 1;
      return Promise.resolve();
    },
    isMaximized: () => Promise.resolve(state.maximized),
    onResized: (cb: () => void) => {
      resizeHandlers.add(cb);
      return Promise.resolve(() => {
        resizeHandlers.delete(cb);
      });
    },
  };
}

const resizeHandlers = new Set<() => void>();
