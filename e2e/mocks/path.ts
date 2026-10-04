/// E2E mock for `@tauri-apps/api/path`.
export function dirname(path: string): Promise<string> {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return Promise.resolve(i <= 0 ? "/" : path.slice(0, i));
}
