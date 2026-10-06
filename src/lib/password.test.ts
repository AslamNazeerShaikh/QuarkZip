import { describe, expect, it } from "vitest";
import { isPasswordError } from "./password";

describe("isPasswordError", () => {
  it("should_match_real_7zz_password_outputs", () => {
    // Header-encrypted, no password (DEVNULL stdin): prompt + abort.
    expect(isPasswordError("Enter password:\nBreak signaled\n")).toBe(true);
    // Header-encrypted, wrong password.
    expect(
      isPasswordError(
        "Cannot open encrypted archive. Wrong password?\nERRORS:\nHeaders Error",
      ),
    ).toBe(true);
    // Content-encrypted, wrong password.
    expect(isPasswordError("ERROR: Wrong password : data.csv")).toBe(true);
  });

  it("should_match_case_insensitively", () => {
    expect(isPasswordError("ERROR: WRONG PASSWORD")).toBe(true);
  });

  it("should_reject_non_password_failures", () => {
    expect(isPasswordError("Everything is Ok\n")).toBe(false);
    expect(isPasswordError("")).toBe(false);
    expect(isPasswordError("ERROR: CRC Failed : a.txt")).toBe(false);
    expect(isPasswordError("Cannot open file: No such file")).toBe(false);
    expect(isPasswordError("No files to process")).toBe(false);
    expect(isPasswordError(null)).toBe(false);
    expect(isPasswordError(undefined)).toBe(false);
    expect(isPasswordError(42)).toBe(false);
  });
});
