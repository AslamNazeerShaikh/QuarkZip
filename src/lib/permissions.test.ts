import { describe, expect, it } from "vitest";
import { PRIVACY_SETTINGS_URL, isPermissionError } from "./permissions";

describe("permissions", () => {
  it("should_detect_denials_and_ignore_other_failures", () => {
    for (const m of [
      "Permission denied: /tmp/out",
      "Operation not permitted (os error 1)",
      "EACCES opening dest",
      "Cannot write output file: EPERM",
    ]) {
      expect(isPermissionError(m)).toBe(true);
    }
    for (const m of [
      "Wrong password",
      "Enter password",
      "CRC Failed : a.txt",
      "No such file or directory: /tmp/x",
      "Cannot open archive (0x80070002)",
      "",
      null,
      undefined,
    ]) {
      expect(isPermissionError(m)).toBe(false);
    }
  });

  it("should_point_at_the_macos_privacy_pane", () => {
    expect(PRIVACY_SETTINGS_URL).toContain("x-apple.systempreferences:");
  });
});
