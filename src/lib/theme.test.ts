import { beforeEach, describe, expect, it } from "vitest";
import { applyTheme, loadChoice, resolveTheme, saveChoice } from "./theme";

describe("resolveTheme", () => {
  it("should_follow_system_when_choice_is_system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("should_ignore_system_when_choice_is_static", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("applyTheme", () => {
  it("should_toggle_dark_class_and_color_scheme", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");

    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});

describe("choice persistence", () => {
  beforeEach(() => localStorage.clear());

  it("should_roundtrip_saved_choice", () => {
    saveChoice("dark");
    expect(loadChoice()).toBe("dark");
  });

  it("should_default_to_system_when_nothing_saved", () => {
    expect(loadChoice()).toBe("system");
  });

  it("should_default_to_system_when_saved_value_invalid", () => {
    localStorage.setItem("quarkzip-theme", "neon");
    expect(loadChoice()).toBe("system");
  });
});
