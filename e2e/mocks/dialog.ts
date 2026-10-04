/// E2E mock for `@tauri-apps/plugin-dialog`.
import { state } from "./backend";

export function open(
  opts: { directory?: boolean } = {},
): Promise<string | null> {
  const result = opts.directory ? state.openDirResult : state.openFileResult;
  // Unstubbed → behave like a cancellation (safer than inventing a path).
  return Promise.resolve(result ?? null);
}
