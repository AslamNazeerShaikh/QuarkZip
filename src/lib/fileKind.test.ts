import { describe, expect, it } from "vitest";
import { fileKind } from "./fileKind";
import {
  File,
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileVideo,
  Folder,
} from "lucide-react";

describe("fileKind", () => {
  it("should_classify_folders_by_flag_not_size", () => {
    expect(fileKind("pics", true)).toMatchObject({
      label: "Folder",
      icon: Folder,
      isFolder: true,
    });
    expect(fileKind("empty.txt", false).isFolder).toBe(false);
  });

  it("should_map_known_types_to_icons", () => {
    expect(fileKind("a.PNG", false).icon).toBe(FileImage);
    expect(fileKind("b.mp4", false).icon).toBe(FileVideo);
    expect(fileKind("c.mp3", false).icon).toBe(FileAudio);
    expect(fileKind("d.ts", false).icon).toBe(FileCode2);
    expect(fileKind("e.zip", false).icon).toBe(FileArchive);
  });

  it("should_label_with_uppercase_extension", () => {
    expect(fileKind("a.png", false).label).toBe("PNG");
    expect(fileKind("archive.7z", false).label).toBe("7Z");
  });

  it("should_fall_back_for_unknown_or_missing_extensions", () => {
    expect(fileKind("weird.xyz123", false)).toMatchObject({
      label: "XYZ123",
      icon: File,
      isFolder: false,
    });
    expect(fileKind("Makefile", false)).toMatchObject({
      label: "File",
      icon: File,
    });
  });

  it("should_derive_the_extension_from_the_file_name_only", () => {
    // Dots in directory names are not extensions (regression: the Type
    // column once showed `BIN/DOWNLOAD-…` for these, overflowing rows).
    expect(
      fileKind(
        "QuarkZip/.opencode/node_modules/.bin/download-msgpackr-prebuilds",
        false,
      ).label,
    ).toBe("File");
    expect(fileKind("QuarkZip/.git/logs/HEAD", false).label).toBe("File");
    expect(fileKind("a.d/photo.png", false).label).toBe("PNG");
    expect(fileKind(".gitignore", false).label).toBe("File");
  });
});
