import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ArchiveOverview, { type ArchiveInfo } from "./ArchiveOverview";
import ArchiveTable from "./ArchiveTable";
import ExtractDialog from "./ExtractDialog";
import LanguageSwitch from "./LanguageSwitch";
import Pagination from "./Pagination";
import ThemeSwitch from "./ThemeSwitch";

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
  it("should_expose_pager_shell_and_jump_ids", () => {
    const { container } = render(
      <Pagination
        page={0}
        pageCount={3}
        pageSize={100}
        total={250}
        onPage={() => {}}
        onPageSize={() => {}}
      />,
    );
    for (const id of [
      "qz-pager",
      "qz-pager-size",
      "qz-pager-size-btn",
      "qz-pager-prev",
      "qz-pager-next",
      "qz-pager-jump",
      "qz-pager-jump-input",
      "qz-pager-jump-total",
    ]) {
      expect(container.querySelector(`#${CSS.escape(id)}`)).not.toBeNull();
    }
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
        middleControls={<span>pager</span>}
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

  it("should_expose_table_rows_with_serial_ids", () => {
    const { container } = render(
      <ArchiveTable
        data={[
          { path: "b.txt", size: 2, modified: null, is_folder: false },
          { path: "a.txt", size: 1, modified: null, is_folder: false },
          { path: "docs", size: null, modified: null, is_folder: true },
        ]}
        page={0}
        pageSize={100}
        sortKey={null}
        sortDir="asc"
        onSortKey={() => {}}
        listingId="/tmp/demo.zip"
      />,
    );
    for (const id of [
      "qz-table-root",
      "qz-table-header",
      "qz-table-sort-path",
      "qz-table-scroll",
      "qz-table-row-1",
      "qz-table-row-1-path",
      "qz-table-row-2-size",
      "qz-table-select-row-3",
    ]) {
      expect(container.querySelector(`#${CSS.escape(id)}`)).not.toBeNull();
    }
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
      <Pagination
        page={0}
        pageCount={3}
        pageSize={100}
        total={250}
        onPage={() => {}}
        onPageSize={() => {}}
      />,
    );
    // No responsive gate: narrow windows show the count too.
    const total = container.querySelector("#qz-pager-total");
    expect(total).not.toBeNull();
    expect(total).not.toHaveClass("hidden");
    expect(total?.textContent).toBe("250");
  });

  it("should_drop_menus_downward_when_below", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <Pagination
          page={0}
          pageCount={3}
          pageSize={100}
          total={250}
          onPage={() => {}}
          onPageSize={() => {}}
          below
        />
        <LanguageSwitch below />
      </>,
    );
    // Portals mount on document.body, outside the render container —
    // and opening one menu closes the other, so assert each in turn.
    await user.click(
      container.querySelector("#qz-pager-size-btn") as HTMLElement,
    );
    let menu = document.querySelector("#qz-pager-size-menu") as HTMLElement;
    // jsdom measures every rect as zero, so "8px below" is top: 8px.
    expect(menu.style.top).toBe("8px");
    expect(menu.style.bottom).toBe("");
    await user.click(container.querySelector("#qz-lang-btn") as HTMLElement);
    menu = document.querySelector("#qz-lang-menu") as HTMLElement;
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
});
