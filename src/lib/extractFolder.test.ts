import { describe, expect, it } from "vitest";
import {
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
});
