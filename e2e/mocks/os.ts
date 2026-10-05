/// E2E mock for `@tauri-apps/plugin-os` (sync in plugin-os v2).
import { state } from "./backend";

export function platform(): string {
  return state.osPlatform;
}

export function arch(): string {
  return state.osArch;
}
