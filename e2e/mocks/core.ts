/// E2E mock for `@tauri-apps/api/core` — routes `invoke` to the fake backend.
import { handleInvoke } from "./backend";

export async function invoke<T>(cmd: string, args?: unknown): Promise<T> {
  return (await handleInvoke(cmd, args)) as T;
}
