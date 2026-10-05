/// E2E mock for `@tauri-apps/api/core` — routes `invoke` to the fake backend.
import { handleInvoke } from "./backend";

export async function invoke<T>(cmd: string, args?: unknown): Promise<T> {
  return (await handleInvoke(cmd, args)) as T;
}

/// Test stub for Tauri's streaming `Channel`: holds the message handler the
/// backend calls into synchronously (no real IPC in e2e mode).
export class Channel<T = unknown> {
  private handler: (response: T) => void;

  constructor(onmessage?: (response: T) => void) {
    this.handler = onmessage ?? (() => {});
  }

  set onmessage(handler: (response: T) => void) {
    this.handler = handler;
  }

  get onmessage(): (response: T) => void {
    return this.handler;
  }

  emit(response: T): void {
    this.handler(response);
  }
}
