/// Narrow-window action row (800px): one centered line — More, the
/// controls cluster (icon-only Test/Checksum, Theme, Language, About last)
/// and the collapse chevron pack with no dead gaps.
import { addArchive, expect, openViaButton, test } from "../fixtures";

test.use({ viewport: { width: 800, height: 675 } });

const PATH = "/tmp/gappy.zip";

async function openWithExtras(
  app: Parameters<typeof openViaButton>[0],
): Promise<void> {
  // Multi-page (jump field out, wide readout): the row genuinely
  // overflowed at 800px, like the 10M archive in the report.
  await addArchive(app, PATH, {
    count: 250,
    info: {
      container_format: "zip",
      physical_size: 1024,
      headers_size: 128,
      method: "Deflate",
      solid: "—",
      blocks: "1",
      file_count: 250,
      folder_count: 0,
      total_unpacked: 2048,
      total_packed: 1024,
      compression_ratio: 0.5,
      max_depth: 1,
      methods: ["Deflate"],
      encrypted_files: 0,
      encryption_scheme: "—",
      host_os: ["Unix"],
      container_size: 1024,
      container_modified: 1_759_623_585,
      extra: { "64-bit": "+" },
    },
  });
  await openViaButton(app, PATH);
  await expect(app.getByText("file-1.txt")).toBeVisible();
}

test("centered single line with no dead gaps", async ({ app }) => {
  await openWithExtras(app);
  const row = app.getByTestId("action-row");
  await expect(row).toHaveClass(/justify-center/);
  const more = await app.getByRole("button", { name: "More" }).boundingBox();
  const controls = await app.getByTestId("card-controls").boundingBox();
  const rowBox = await row.boundingBox();
  const collapse = await app
    .getByRole("button", { name: "Collapse details" })
    .boundingBox();
  expect(more).not.toBeNull();
  expect(controls).not.toBeNull();
  expect(rowBox).not.toBeNull();
  expect(collapse).not.toBeNull();
  // More sits one gap from the cluster (the old `justify-between` left
  // ~160px of dead air here).
  expect(controls!.x - (more!.x + more!.width)).toBeLessThan(24);
  // Everything shares one line now that Test/Checksum are icon-only.
  for (const box of [controls!, collapse!]) {
    expect(Math.abs(box.y - more!.y)).toBeLessThan(4);
  }
  // The packed group is centered: symmetric inner padding (±32px slack).
  const leftPad = more!.x - rowBox!.x - 20;
  const rightPad =
    rowBox!.x + rowBox!.width - 20 - (collapse!.x + collapse!.width);
  expect(Math.abs(leftPad - rightPad)).toBeLessThan(32);
});
