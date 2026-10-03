import { describe, expect, it } from "vitest";
import { formatSize } from "./format";

describe("formatSize", () => {
  it("should_show_bytes_without_unit", () => {
    expect(formatSize(0)).toBe("0B");
    expect(formatSize(128)).toBe("128B");
    expect(formatSize(1023)).toBe("1023B");
  });

  it("should_scale_through_units", () => {
    expect(formatSize(1024)).toBe("1K");
    expect(formatSize(1536)).toBe("1.5K");
    expect(formatSize(1024 * 1024)).toBe("1M");
    expect(formatSize(6.1 * 1024 * 1024)).toBe("6.1M");
    expect(formatSize(2 * 1024 ** 3)).toBe("2G");
  });

  it("should_show_dash_for_unknown_sizes", () => {
    expect(formatSize(-1)).toBe("—");
    expect(formatSize(NaN)).toBe("—");
  });
});
