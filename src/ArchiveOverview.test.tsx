import { render, screen } from "@testing-library/react";
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
});
