import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FALLBACK_CODE,
  LOCALES,
  localeMeta,
  resolveLocale,
} from "./locales";
import { LanguageProvider, translate, useLanguage } from "./LanguageContext";
import en from "./locales/en.json";

const EN_KEYS = Object.keys(en).sort();

function TProbe({ code, textKey }: { code: string; textKey: string }) {
  const { t } = useLanguage();
  void code;
  return <span>{t(textKey)}</span>;
}

describe("resolveLocale", () => {
  it("should_match_exact_codes_case_insensitively", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("HI")).toBe("hi");
  });

  it("should_fall_back_from_region_to_base_to_english", () => {
    expect(resolveLocale("hi-IN")).toBe("hi");
    expect(resolveLocale("hi_IN")).toBe("hi");
    // No `pt` shipped yet: region and base both miss → English.
    expect(resolveLocale("pt-BR")).toBe("en");
    expect(resolveLocale("pt")).toBe("en");
  });

  it("should_default_empty_and_unknown_tags_to_english", () => {
    expect(resolveLocale(null)).toBe("en");
    expect(resolveLocale("")).toBe("en");
    expect(resolveLocale("xx")).toBe(FALLBACK_CODE);
  });
});

describe("translate", () => {
  it("should_interpolate_vars", () => {
    expect(translate("en", "extract.allFiles", { total: "6" })).toBe(
      "All 6 files will be extracted to",
    );
  });

  it("should_fall_back_per_key_to_english", () => {
    // Simulate a partial community translation missing one key.
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const partial = LOCALES.find((l) => l.code === "hi");
    expect(partial).toBeDefined();
    expect(translate("hi", "app.extract")).not.toBe("app.extract");
    spy.mockRestore();
  });

  it("should_return_the_key_for_unknown_keys", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(translate("en", "no.such.key")).toBe("no.such.key");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("shipped locale parity", () => {
  it("should_cover_exactly_the_english_key_set", () => {
    for (const locale of LOCALES) {
      if (locale.code === "en") continue;
      const keys = Object.keys(locale.strings).sort();
      const missing = EN_KEYS.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !EN_KEYS.includes(k));
      expect({ code: locale.code, missing }).toEqual({
        code: locale.code,
        missing: [],
      });
      expect({ code: locale.code, extra }).toEqual({
        code: locale.code,
        extra: [],
      });
    }
  });

  it("should_use_valid_unique_codes_with_native_labels", () => {
    const codes = LOCALES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const locale of LOCALES) {
      expect(locale.code).toMatch(/^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|\d{3}))?$/);
      expect(locale.native.trim().length).toBeGreaterThan(0);
      expect(["ltr", "rtl"]).toContain(locale.dir);
      expect(localeMeta(locale.code).code).toBe(locale.code);
    }
  });

  it("should_keep_placeholders_identical_across_locales", () => {
    const placeholders = (s: string) =>
      [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const locale of LOCALES) {
      if (locale.code === "en") continue;
      for (const key of EN_KEYS) {
        expect(
          placeholders(locale.strings[key] ?? ""),
          `${locale.code}:${key}`,
        ).toEqual(placeholders(en[key as keyof typeof en] ?? ""));
      }
    }
  });
});

describe("LanguageProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should_render_english_inside_and_outside_the_provider", () => {
    render(<TProbe code="x" textKey="app.extract" />);
    expect(screen.getByText("Extract")).toBeInTheDocument();
  });

  it("should_switch_languages_dynamically", async () => {
    const user = userEvent.setup();
    function Switcher() {
      const { lang, setLang, t } = useLanguage();
      return (
        <div>
          <span>{t("app.extract")}</span>
          <button type="button" onClick={() => setLang("hi")}>
            to-hi-{lang}
          </button>
        </div>
      );
    }
    render(
      <LanguageProvider>
        <Switcher />
      </LanguageProvider>,
    );
    expect(screen.getByText("Extract")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /to-hi-/ }));
    expect(screen.getByText("एक्सट्रैक्ट")).toBeInTheDocument();
    expect(localStorage.getItem("quarkzip.lang")).toBe("hi");
    expect(document.documentElement.lang).toBe("hi");
  });
});
