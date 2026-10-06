import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// @ts-expect-error type error without @types/node package
import process from "node:process";
// @ts-expect-error type error without @types/node package
import { fileURLToPath } from "node:url";
// @ts-expect-error type error without @types/node package
import { execSync } from "node:child_process";
const host = process.env.TAURI_DEV_HOST;

function shortCommit(): string {
  const fromEnv =
    process.env.GITHUB_SHA?.slice(0, 7) || process.env.VITE_APP_COMMIT_ID;
  if (fromEnv) return fromEnv;
  try {
    return execSync("git rev-parse --short HEAD").toString().trim() || "dev";
  } catch {
    return "dev";
  }
}

// E2E mode (`vite --mode e2e`, used by Playwright): the real Tauri IPC
// modules are swapped for an in-memory fake (`e2e/mocks/*`) so the full UI
// runs in plain Chromium. Unit tests run in `test` mode — unaffected.
const e2eMocks = [
  "@tauri-apps/api/core",
  "@tauri-apps/api/window",
  "@tauri-apps/api/webview",
  "@tauri-apps/api/path",
  "@tauri-apps/plugin-dialog",
  "@tauri-apps/plugin-os",
].map((id) => ({
  find: id,
  replacement: fileURLToPath(
    new URL(
      `./e2e/mocks/${id.replace("@tauri-apps/", "").replace("plugin-", "").replace("api/", "")}.ts`,
      import.meta.url,
    ),
  ),
}));

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: mode === "e2e" ? { alias: e2eMocks } : {},
  define: {
    __QZ_COMMIT_ID__: JSON.stringify(shortCommit()),
    __QZ_RELEASE_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov"],
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
