import { getVersion } from "@tauri-apps/api/app";
import { arch as getArch, platform as getPlatform } from "@tauri-apps/plugin-os";

export const APP_NAME = "QuarkZip";
export const APP_FALLBACK_VERSION = "0.1.0";

export interface AppInfo {
  version: string;
  releaseDate: string;
  commitId: string;
  os: string;
  arch: string;
}

/// Friendly OS label for the raw `plugin-os` platform string.
export function friendlyOs(raw: string): string {
  switch (raw) {
    case "macos":
      return "macOS";
    case "windows":
      return "Windows";
    case "linux":
      return "Linux";
    case "android":
      return "Android";
    case "ios":
      return "iOS";
    default:
      return raw || "unknown";
  }
}

/// Friendly CPU label: `aarch64` reads as Arm64, `x86_64`/`x86` as x64/x86.
export function friendlyArch(raw: string): string {
  switch (raw) {
    case "aarch64":
      return "Arm64 (aarch64)";
    case "arm":
      return "Arm (arm)";
    case "x86_64":
      return "x64 (x86_64)";
    case "x86":
      return "x86 (x86)";
    default:
      return raw || "unknown";
  }
}

function buildValue(name: "__QZ_COMMIT_ID__" | "__QZ_RELEASE_DATE__", fallback: string): string {
  try {
    const value =
      name === "__QZ_COMMIT_ID__"
        ? (typeof __QZ_COMMIT_ID__ !== "undefined" ? __QZ_COMMIT_ID__ : fallback)
        : (typeof __QZ_RELEASE_DATE__ !== "undefined" ? __QZ_RELEASE_DATE__ : fallback);
    return value || fallback;
  } catch {
    return fallback;
  }
}

/// Best-effort runtime info: Tauri APIs when present, honest fallbacks
/// otherwise (tests, browser, e2e mocks without `arch`).
export async function loadAppInfo(): Promise<AppInfo> {
  let version = APP_FALLBACK_VERSION;
  try {
    version = (await getVersion()) || APP_FALLBACK_VERSION;
  } catch {
    version = APP_FALLBACK_VERSION;
  }

  let rawOs = "unknown";
  try {
    if (typeof getPlatform === "function") rawOs = getPlatform() || "unknown";
  } catch {
    rawOs = "unknown";
  }

  let rawArch = "unknown";
  try {
    if (typeof getArch === "function") rawArch = getArch() || "unknown";
  } catch {
    rawArch = "unknown";
  }

  return {
    version,
    releaseDate: buildValue("__QZ_RELEASE_DATE__", "—"),
    commitId: buildValue("__QZ_COMMIT_ID__", "dev"),
    os: friendlyOs(rawOs),
    arch: friendlyArch(rawArch),
  };
}
