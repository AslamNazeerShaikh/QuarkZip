import { describe, expect, it } from "vitest";
import { fileKind } from "./fileKind";
import { File, FileArchive, FileAudio, FileCode2, FileImage, FileVideo, Folder } from "lucide-react";

describe("fileKind", () => {
  it("should_classify_folders_by_missing_or_zero_size", () => {
    expect(fileKind("pics", null)).toMatchObject({ label: "Folder", icon: Folder, isFolder: true });
    expect(fileKind("pics", 0)).toMatchObject({ label: "Folder", isFolder: true });
  });

  it("should_map_known_types_to_icons", () => {
    expect(fileKind("a.PNG", 10).icon).toBe(FileImage);
    expect(fileKind("b.mp4", 10).icon).toBe(FileVideo);
    expect(fileKind("c.mp3", 10).icon).toBe(FileAudio);
    expect(fileKind("d.ts", 10).icon).toBe(FileCode2);
    expect(fileKind("e.zip", 10).icon).toBe(FileArchive);
  });

  it("should_label_with_uppercase_extension", () => {
    expect(fileKind("a.png", 10).label).toBe("PNG");
    expect(fileKind("archive.7z", 10).label).toBe("7Z");
  });

  it("should_fall_back_for_unknown_or_missing_extensions", () => {
    expect(fileKind("weird.xyz123", 10)).toMatchObject({ label: "XYZ123", icon: File, isFolder: false });
    expect(fileKind("Makefile", 10)).toMatchObject({ label: "File", icon: File });
  });
});
