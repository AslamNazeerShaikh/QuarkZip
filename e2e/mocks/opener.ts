/// E2E mock for `@tauri-apps/plugin-opener` — records requested URLs
/// (e.g. the Privacy Settings grant) and revealed paths (Reveal in Finder)
/// instead of leaving the browser.
import { state } from "./backend";

export function openUrl(url: string): Promise<void> {
  state.calls.openedUrls.push(url);
  return Promise.resolve();
}

export function revealItemInDir(path: string): Promise<void> {
  state.calls.revealed.push(path);
  return Promise.resolve();
}
