import { describe, expect, it } from "vitest";
import {
  appendDateStamp,
  dateStamp,
  defaultFolderName,
  joinDest,
  validateFolderName,
} from "./extractFolder";

describe("extractFolder", () => {
  it("should_strip_archive_extensions_for_the_default_name", () => {
    expect(defaultFolderName("/tmp/photo.zip")).toBe("photo");
    expect(defaultFolderName("/tmp/data.tar.gz")).toBe("data");
    expect(defaultFolderName("C:\\Users\\me\\backup.7Z")).toBe("backup");
    expect(defaultFolderName("/tmp/my.backup.7z")).toBe("my.backup");
    expect(defaultFolderName("/tmp/notes.txt")).toBe("notes.txt");
    expect(defaultFolderName("/tmp/.7z")).toBe("extracted");
    expect(defaultFolderName("/tmp/.bashrc.zip")).toBe(".bashrc");
  });

  it("should_reject_bad_names_with_stable_codes", () => {
    expect(validateFolderName("  ")).toBe("empty");
    expect(validateFolderName("a/b")).toBe("invalid_chars");
    expect(validateFolderName("a:b")).toBe("invalid_chars");
    expect(validateFolderName("a\tb")).toBe("invalid_chars");
    expect(validateFolderName(".")).toBe("reserved");
    expect(validateFolderName("..")).toBe("reserved");
    expect(validateFolderName("a".repeat(256))).toBe("too_long");
    expect(validateFolderName("😀".repeat(64))).toBe("too_long");
    expect(validateFolderName("😀".repeat(63))).toBeNull();
    expect(validateFolderName("café ünïcode")).toBeNull();
  });

  it("should_reject_lone_surrogates_as_invalid_unicode", () => {
    expect(validateFolderName("ab\uD800cd")).toBe("invalid_unicode");
    expect(validateFolderName("ab\uDC00cd")).toBe("invalid_unicode");
  });

  it("should_join_the_subfolder_without_double_slashes", () => {
    expect(joinDest("/tmp/out", null)).toBe("/tmp/out");
    expect(joinDest("/tmp/out/", "photo")).toBe("/tmp/out/photo");
    expect(joinDest("/tmp/out", "photo")).toBe("/tmp/out/photo");
  });

  it("should_stamp_datetime_underscore_separated", () => {
    const d = new Date(2026, 9, 8, 14, 5, 9);
    expect(dateStamp(d)).toBe("2026-10-08_14-05-09");
    expect(appendDateStamp("photo", d)).toBe("photo_2026-10-08_14-05-09");
  });

  it("should_trim_the_head_never_the_stamp_when_too_long", () => {
    const d = new Date(2026, 9, 8, 14, 5, 9);
    const out = appendDateStamp("a".repeat(250), d);
    expect(new TextEncoder().encode(out).length).toBeLessThanOrEqual(255);
    expect(out.endsWith("_2026-10-08_14-05-09")).toBe(true);
  });
});
