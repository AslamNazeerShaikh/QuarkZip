import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App blank canvas", () => {
  it("should_render_drag_header_when_mounted", () => {
    const { container } = render(<App />);
    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
    expect(header).toHaveAttribute("data-tauri-drag-region");
  });

  it("should_render_empty_main_when_no_archive_open", () => {
    render(<App />);
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main).toBeEmptyDOMElement();
  });
});
