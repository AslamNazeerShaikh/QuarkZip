import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ArchiveOverview, { type ArchiveInfo } from "./ArchiveOverview";

const INFO: ArchiveInfo = {
  container_format: "7z",
  physical_size: 255,
  headers_size: 234,
  method: "LZMA2:12",
  solid: "+",
  blocks: "1",
  file_count: 3,
  folder_count: 3,
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
  extra: { "Code Page": "UTF-8" },
};

describe("ArchiveOverview", () => {
  it("should_render_centered_open_action_when_no_archive", () => {
    render(
      <ArchiveOverview
        archive={null}
        info={null}
        loading={false}
        onOpen={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Open archive" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No archive open")).toBeInTheDocument();
  });

  it("should_show_metadata_without_status_pills_when_archive_open", () => {
    render(
      <ArchiveOverview
        archive="/tmp/qz-sample.7z"
        info={INFO}
        loading={false}
        onOpen={() => {}}
      />,
    );
    // Pills removed: format/encryption/solid live in the metadata grid.
    expect(screen.queryByText("Not encrypted")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open archive" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Container")).toBeInTheDocument();
    expect(screen.getAllByText("LZMA2:12").length).toBeGreaterThanOrEqual(1);
  });

  it("should_collapse_to_action_row_and_expand_back_on_toggle", async () => {
    const user = userEvent.setup();
    render(
      <ArchiveOverview
        archive="/tmp/qz-sample.7z"
        info={INFO}
        loading={false}
        onOpen={() => {}}
      />,
    );
    const toggle = screen.getByRole("button", { name: "Collapse details" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Container")).toBeInTheDocument();

    await user.click(toggle);
    expect(
      screen.getByRole("button", { name: "Expand details" }),
    ).toHaveAttribute("aria-expanded", "false");
    // Metadata hides; Test/Checksum stay available.
    expect(screen.queryByText("Container")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Test" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Checksum" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand details" }));
    expect(screen.getByText("Container")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Collapse details" }),
    ).toBeInTheDocument();
  });

  it("should_offer_no_collapse_toggle_without_open_archive", () => {
    render(
      <ArchiveOverview
        archive={null}
        info={null}
        loading={false}
        onOpen={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Collapse details" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Expand details" }),
    ).not.toBeInTheDocument();
  });
});
