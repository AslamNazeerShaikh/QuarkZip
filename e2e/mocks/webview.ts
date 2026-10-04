/// E2E mock for `@tauri-apps/api/webview`.
import { state, type DropEvent } from "./backend";

export function getCurrentWebview() {
  return {
    onDragDropEvent: (cb: (e: DropEvent) => void) => {
      state.dropHandlers.push(cb);
      return Promise.resolve(() => {
        const i = state.dropHandlers.indexOf(cb);
        if (i >= 0) state.dropHandlers.splice(i, 1);
      });
    },
  };
}
