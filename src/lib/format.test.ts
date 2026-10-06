import { describe, expect, it } from "vitest";
import { formatModified, formatSize } from "./format";

describe("formatSize", () => {
  it("should_show_bytes_without_prefix", () => {
    expect(formatSize(0)).toBe("0B");
    expect(formatSize(128)).toBe("128B");
    expect(formatSize(1023)).toBe("1023B");
  });

  it("should_scale_through_the_full_iec_range", () => {
    expect(formatSize(1024)).toBe("1KiB");
    expect(formatSize(1536)).toBe("1.5KiB");
    expect(formatSize(1024 ** 2)).toBe("1MiB");
    expect(formatSize(6.1 * 1024 ** 2)).toBe("6.1MiB");
    expect(formatSize(2 * 1024 ** 3)).toBe("2GiB");
    expect(formatSize(3 * 1024 ** 4)).toBe("3TiB");
    expect(formatSize(4 * 1024 ** 5)).toBe("4PiB");
    expect(formatSize(5 * 1024 ** 6)).toBe("5EiB");
    expect(formatSize(6 * 1024 ** 7)).toBe("6ZiB");
    expect(formatSize(7 * 1024 ** 8)).toBe("7YiB");
  });

  it("should_show_dash_for_unknown_sizes", () => {
    expect(formatSize(-1)).toBe("—");
    expect(formatSize(NaN)).toBe("—");
  });
});

describe("formatModified", () => {
  it("should_format_stamp_in_local_time_with_am_pm", () => {
    // Fields are local wall time, so the round-trip is TZ-independent.
    expect(formatModified("2026-10-03 21:39:45.9666222")).toBe(
      "Oct 3, 2026, 9:39:45 PM",
    );
    expect(formatModified("2026-10-03 08:05:04")).toBe(
      "Oct 3, 2026, 8:05:04 AM",
    );
    expect(formatModified("2026-10-03 00:00:00")).toBe(
      "Oct 3, 2026, 12:00:00 AM",
    );
  });

  it("should_show_dash_for_missing_stamps", () => {
    expect(formatModified(null)).toBe("—");
    expect(formatModified("")).toBe("—");
  });

  it("should_pass_through_unparseable_stamps", () => {
    expect(formatModified("yesterday")).toBe("yesterday");
  });
});
