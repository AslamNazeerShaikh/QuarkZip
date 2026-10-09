import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ArchiveOverview, { type ArchiveInfo } from "./ArchiveOverview";
import ArchiveTree from "./ArchiveTree";
import ExtractDialog from "./ExtractDialog";
import LanguageSwitch from "./LanguageSwitch";
import ThemeSwitch from "./ThemeSwitch";

/// Tree chunks come from a canned backend (unit tests never touch Tauri).
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({
    rows: [
      { path: "docs", size: null, modified: null, is_folder: true, index: 0 },
      {
        path: "top.txt",
        size: 3,
        modified: null,
        is_folder: false,
        index: 1,
      },
    ],
    total: 2,
    child_counts: { docs: 0 },
  }),
}));

/// Debug-id pins: every structural div and interactive element carries a
/// stable `qz-*` id so Inspect Element maps back to one call site.
/// These tests pin the ids that debugging sessions rely on — and that ids
/// stay unique within a mounted tree (duplicates would mislead lookup).

const INFO: ArchiveInfo = {
  container_format: "7z",
  physical_size: 255,
  headers_size: 234,
  method: "LZMA2:12",
  solid: "+",
  blocks: "1",
  file_count: 3,
  folder_count: 0,
  total_unpacked: 17,
  total_packed: 60,
  compression_ratio: 60 / 17,
  max_depth: 4,
  methods: ["LZMA2:12"],
  encrypted_files: 0,
  encryption_scheme: "None",
  host_os: ["Unix"],
  container_size: 255,
  container_modified: 1791569985,
  extra: { "64-bit": "+", Characteristics: "Zip64" },
};

/// Every `id` in the mounted tree must be unique — a duplicated debug id
/// would point Inspect Element at the wrong call site.
function expectUniqueIds(container: HTMLElement) {
  const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
}

describe("elementIds", () => {
  it("should_expose_tree_shell_and_sort_ids", async () => {
    const { container } = render(
      <ArchiveTree
        archive="/tmp/demo.zip"
        totalEntries={2}
        selected={new Set()}
        onSelectionChange={() => {}}
      />,
    );
    for (const id of [
      "qz-tree-root",
      "qz-tree-card",
      "qz-tree-header",
      "qz-tree-select-all",
      "qz-tree-col-path",
      "qz-tree-col-type",
      "qz-tree-scroll",
    ]) {
      expect(container.querySelector(`#${CSS.escape(id)}`)).not.toBeNull();
    }
    const row = await screen.findByText("docs");
    expect(row.closest("[id^='qz-tree-row-']")).not.toBeNull();
    expectUniqueIds(container);
  });

  it("should_expose_overview_card_and_meta_ids", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const { container } = render(
      <ArchiveOverview
        archive="/tmp/demo.zip"
        info={INFO}
        loading={false}
        onOpen={() => {}}
        utilityControls={<button>Theme</button>}
      />,
    );
    for (const id of [
      "qz-overview-card",
      "qz-overview-open",
      "qz-overview-details",
      "qz-overview-meta-container",
      "qz-overview-meta-ratio",
      "qz-action-row",
      "qz-card-controls",
      "qz-action-more-btn",
      "qz-action-test-btn",
      "qz-action-checksum-btn",
      "qz-action-collapse-btn",
    ]) {
      expect(container.querySelector(`#${CSS.escape(id)}`)).not.toBeNull();
    }
    // Extras use stable per-index ids inside the single extras grid.
    await user.click(
      container.querySelector("#qz-action-more-btn") as HTMLElement,
    );
    expect(container.querySelector("#qz-overview-extra-0")).not.toBeNull();
    expectUniqueIds(container);
  });

  it("should_expose_empty_state_ids", () => {
    const { container } = render(
      <ArchiveOverview
        archive={null}
        info={null}
        loading={false}
        onOpen={() => {}}
      />,
    );
    for (const id of [
      "qz-overview-empty",
      "qz-overview-empty-hero",
      "qz-overview-open-cta",
    ]) {
      expect(container.querySelector(`#${CSS.escape(id)}`)).not.toBeNull();
    }
    expectUniqueIds(container);
  });

  it("should_expose_tree_rows_with_index_ids", () => {
    // Rows carry stable per-index ids (paths contain slashes, so indices
    // identify rows); names render basenames with full-path tooltips.
    const { container } = render(
      <ArchiveTree
        archive={null}
        totalEntries={0}
        selected={new Set()}
        onSelectionChange={() => {}}
      />,
    );
    expect(container.querySelector("#qz-tree-root")).not.toBeNull();
    expect(container.querySelector("#qz-tree-empty")).not.toBeNull();
    expectUniqueIds(container);
  });

  it("should_expose_dialog_and_chrome_ids", () => {
    const { container } = render(
      <>
        <ThemeSwitch choice="system" onChange={() => {}} />
        <LanguageSwitch />
        <ExtractDialog
          open
          mode="all"
          selected={0}
          total={3}
          dest="/tmp/out"
          archivePath="/tmp/demo.zip"
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      </>,
    );
    for (const id of [
      "qz-theme",
      "qz-theme-btn",
      "qz-lang",
      "qz-lang-btn",
      "qz-extract-dialog",
      "qz-extract-card",
      "qz-extract-subfolder",
      "qz-extract-folder-toggle",
      "qz-extract-actions",
      "qz-extract-confirm",
    ]) {
      expect(container.querySelector(`#${CSS.escape(id)}`)).not.toBeNull();
    }
    expectUniqueIds(container);
  });

  it("should_always_show_the_entry_total", () => {
    const { container } = render(
      <ArchiveOverview
        archive="/tmp/demo.zip"
        info={INFO}
        loading={false}
        onOpen={() => {}}
      />,
    );
    // The overview card owns the entry count now (the pager is gone):
    // files + folders stay visible without scrolling.
    expect(container.querySelector("#qz-overview-meta-files")).not.toBeNull();
    expect(container.querySelector("#qz-overview-meta-folders")).not.toBeNull();
  });

  it("should_drop_menus_downward_when_below", async () => {
    const user = userEvent.setup();
    const { container } = render(<LanguageSwitch below />);
    await user.click(container.querySelector("#qz-lang-btn") as HTMLElement);
    const menu = document.querySelector("#qz-lang-menu") as HTMLElement;
    // jsdom measures every rect as zero, so "8px below" is top: 8px.
    expect(menu.style.top).toBe("8px");
    expect(menu.style.bottom).toBe("");
  });

  it("should_raise_menus_upward_by_default", async () => {
    const user = userEvent.setup();
    const { container } = render(<LanguageSwitch />);
    await user.click(container.querySelector("#qz-lang-btn") as HTMLElement);
    const menu = document.querySelector("#qz-lang-menu") as HTMLElement;
    expect(menu.style.bottom).not.toBe("");
    expect(menu.style.top).toBe("");
  });

  it("should_control_collapse_from_the_parent", async () => {
    const user = userEvent.setup();
    const onCollapsedChange = vi.fn();
    const { container, rerender } = render(
      <ArchiveOverview
        archive="/tmp/demo.zip"
        info={INFO}
        loading={false}
        onOpen={() => {}}
        collapsed={false}
        onCollapsedChange={onCollapsedChange}
      />,
    );
    await user.click(
      container.querySelector("#qz-action-collapse-btn") as HTMLElement,
    );
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    // Uncontrolled renders keep their own toggle.
    rerender(
      <ArchiveOverview
        archive="/tmp/demo.zip"
        info={INFO}
        loading={false}
        onOpen={() => {}}
      />,
    );
    await user.click(
      container.querySelector("#qz-action-collapse-btn") as HTMLElement,
    );
    expect(container.querySelector("#qz-overview-details")).toBeNull();
  });

  it("should_veil_dialogs_in_frosted_glass_never_a_dark_dim", () => {
    const { container } = render(
      <ExtractDialog
        open
        mode="all"
        selected={0}
        total={3}
        dest="/tmp/out"
        archivePath="/tmp/demo.zip"
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );
    const veil = container.querySelector("#qz-extract-backdrop");
    expect(veil).not.toBeNull();
    // Bright frosted wash (theme-aware in CSS); a dark dim would show
    // through the translucent card and gray it out.
    expect(veil).toHaveClass("qz-dialog-backdrop");
    expect(veil).not.toHaveClass("bg-black/25");
    expect(container.querySelector(".bg-black\\/25")).toBeNull();
  });
});
