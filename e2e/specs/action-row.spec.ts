/// Narrow-window action row (800px): with extras behind More the row must
/// wrap into packed lines — never strand a dead gap between More and the
/// pagination cluster while the actions drop below.
import { addArchive, expect, openViaButton, test } from "../fixtures";

test.use({ viewport: { width: 800, height: 675 } });

const PATH = "/tmp/gappy.zip";

async function openWithExtras(
  app: Parameters<typeof openViaButton>[0],
): Promise<void> {
  // Multi-page (jump field out, wide readout): the row genuinely
  // overflows at 800px, like the 10M archive in the report.
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
  await expect(app.getByText("1 / 3")).toBeVisible();
}

test("more sits adjacent to the controls, actions pack below", async ({
  app,
}) => {
  await openWithExtras(app);
  await expect(app.getByRole("button", { name: "More" })).toBeVisible();
  const more = await app.getByRole("button", { name: "More" }).boundingBox();
  const controls = await app.getByTestId("card-controls").boundingBox();
  expect(more).not.toBeNull();
  expect(controls).not.toBeNull();
  // Same line, one gap apart (gap-x-2 = 8px + measurement slack) — the
  // old `justify-between` left ~160px of dead air here.
  expect(controls!.x - (more!.x + more!.width)).toBeLessThan(24);
  expect(Math.abs(controls!.y - more!.y)).toBeLessThan(4);
  // The integrity actions wrap to a packed second line, left-aligned.
  const testBtn = await app.getByRole("button", { name: "Test" }).boundingBox();
  expect(testBtn!.y).toBeGreaterThan(more!.y + more!.height);
});
