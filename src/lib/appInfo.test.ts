import { describe, expect, it } from "vitest";
import { friendlyArch, friendlyOs } from "./appInfo";

describe("appInfo labels", () => {
  it("should_label_os_platforms", () => {
    expect(friendlyOs("macos")).toBe("macOS");
    expect(friendlyOs("windows")).toBe("Windows");
    expect(friendlyOs("linux")).toBe("Linux");
    expect(friendlyOs("")).toBe("unknown");
  });

  it("should_label_cpu_architectures", () => {
    expect(friendlyArch("aarch64")).toBe("Arm64 (aarch64)");
    expect(friendlyArch("x86_64")).toBe("x64 (x86_64)");
    expect(friendlyArch("x86")).toBe("x86 (x86)");
    expect(friendlyArch("")).toBe("unknown");
  });
});
