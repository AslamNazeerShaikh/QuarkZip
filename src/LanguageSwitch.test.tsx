import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import LanguageSwitch from "./LanguageSwitch";
import { LanguageProvider } from "./i18n/LanguageContext";

beforeEach(() => {
  localStorage.clear();
});

describe("LanguageSwitch", () => {
  it("should_list_shipped_languages_and_switch_on_choice", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <LanguageSwitch />
      </LanguageProvider>,
    );
    await user.click(
      screen.getByRole("button", { name: "Change language" }),
    );
    const listbox = screen.getByRole("listbox", { name: "Language" });
    expect(listbox).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "English" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "हिन्दी" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(localStorage.getItem("quarkzip.lang")).toBe("hi");
    // Menu button now shows the native name and translated labels.
    expect(
      screen.getByRole("button", { name: "भाषा बदलें" }),
    ).toBeInTheDocument();
  });
});
