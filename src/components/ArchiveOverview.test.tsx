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
  extra: { "64-bit": "+", Characteristics: "Zip64" },
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

  it("should_hide_engine_extras_until_more_pressed", async () => {
    // Fixed 16-cell grid up front; maximum metadata only behind More.
    const user = userEvent.setup();
    const { container } = render(
      <ArchiveOverview
        archive="/tmp/qz-sample.7z"
        info={INFO}
        loading={false}
        onOpen={() => {}}
      />,
    );
    expect(container.querySelector(".overflow-y-auto")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Additional details" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(
      screen.getByRole("region", { name: "Additional details" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Zip64")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Less" }));
    expect(
      screen.queryByRole("region", { name: "Additional details" }),
    ).not.toBeInTheDocument();
  });

  it("should_hide_more_button_when_collapsed_and_not_reopen_extras", async () => {
    const user = userEvent.setup();
    render(
      <ArchiveOverview
        archive="/tmp/qz-sample.7z"
        info={INFO}
        loading={false}
        onOpen={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByText("Zip64")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Collapse details" }));
    expect(
      screen.queryByRole("button", { name: "More" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Expand details" }));
    // Button back, extras not reshown until pressed again.
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
    expect(screen.queryByText("Zip64")).not.toBeInTheDocument();
  });

  it("should_keep_ratio_textual_without_a_bar", () => {
    // Ratio cell is text only, with or without a measurable ratio.
    render(
      <ArchiveOverview
        archive="/tmp/empty.zip"
        info={{ ...INFO, total_unpacked: 0, compression_ratio: 0 }}
        loading={false}
        onOpen={() => {}}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("should_hide_more_when_no_extras_and_shift_controls_left", () => {
    render(
      <ArchiveOverview
        archive="/tmp/qz-sample.zip"
        info={{ ...INFO, extra: {} }}
        loading={false}
        onOpen={() => {}}
        middleControls={<button>Pager</button>}
        utilityControls={<button>Theme</button>}
      />,
    );
    // No dead toggle — and the controls take the row's left end.
    expect(
      screen.queryByRole("button", { name: "More" }),
    ).not.toBeInTheDocument();
    const row = screen.getByTestId("card-controls");
    expect(row.parentElement?.firstElementChild).toBe(row);
  });

  it("should_shift_controls_left_on_collapse_and_back_on_expand", async () => {
    const user = userEvent.setup();
    render(
      <ArchiveOverview
        archive="/tmp/qz-sample.7z"
        info={INFO}
        loading={false}
        onOpen={() => {}}
        middleControls={<button>Pager</button>}
        utilityControls={<button>Theme</button>}
      />,
    );
    const row = screen.getByTestId("card-controls");
    // Expanded: More owns the left end.
    expect(row.parentElement?.firstElementChild).not.toBe(row);
    await user.click(screen.getByRole("button", { name: "Collapse details" }));
    expect(row.parentElement?.firstElementChild).toBe(row);
    await user.click(screen.getByRole("button", { name: "Expand details" }));
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
    expect(row.parentElement?.firstElementChild).not.toBe(row);
  });

  it("should_pack_the_action_row_without_dead_gaps", () => {
    // Regression: `justify-between` spread the wrapped line apart,
    // stranding ~160px between More and the controls on narrow windows.
    render(
      <ArchiveOverview
        archive="/tmp/qz-sample.7z"
        info={INFO}
        loading={false}
        onOpen={() => {}}
        middleControls={<button>Pager</button>}
        utilityControls={<button>Theme</button>}
      />,
    );
    expect(screen.getByTestId("action-row")).toHaveClass("justify-start");
  });

  it("should_ride_controls_in_the_action_row_when_open", () => {
    render(
      <ArchiveOverview
        archive="/tmp/qz-sample.7z"
        info={INFO}
        loading={false}
        onOpen={() => {}}
        middleControls={<button>Pager</button>}
        utilityControls={<button>Theme</button>}
      />,
    );
    const row = screen.getByTestId("card-controls");
    expect(row).toHaveTextContent("Pager");
    expect(row).toHaveTextContent("Theme");
    // Test/Checksum keep the right end of the same row.
    expect(screen.getByRole("button", { name: "Test" })).toBeInTheDocument();
  });

  it("should_pin_utilities_left_when_no_archive", () => {
    render(
      <ArchiveOverview
        archive={null}
        info={null}
        loading={false}
        onOpen={() => {}}
        utilityControls={<button>Theme</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Theme" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Test" }),
    ).not.toBeInTheDocument();
  });
});
