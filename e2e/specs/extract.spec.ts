import {
  addArchive,
  calls,
  expect,
  failNextExtract,
  openViaButton,
  stubPicker,
  test,
} from "../fixtures";

const PATH = "/tmp/pack.zip";

async function openPack(app: Parameters<typeof openViaButton>[0]) {
  await addArchive(app, PATH, { count: 3 });
  await openViaButton(app, PATH);
  await expect(app.getByText("file-1.txt")).toBeVisible();
}

test("confirm shows all-count and dest, cancel dismisses", async ({
  app,
}) => {
  await openPack(app);
  await app
    .getByRole("button", { name: "Extract", exact: true })
    .click();
  const dialog = app.getByRole("dialog", { name: "Extract files?" });
  await expect(dialog).toContainText("All 3 files will be extracted to");
  await expect(dialog).toContainText("/tmp");
  await app.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  // Nothing was sent to the backend.
  expect((await calls(app)).extracts).toHaveLength(0);
});

test("confirm shows selected-of-total count", async ({ app }) => {
  await addArchive(app, PATH, {
    entries: [{ path: "a.txt" }, { path: "b.txt" }, { path: "c.txt" }],
  });
  await openViaButton(app, PATH);
  await app.getByRole("checkbox", { name: "Select a.txt" }).click();
  await app.getByRole("checkbox", { name: "Select c.txt" }).click();
  await app
    .getByRole("button", { name: "Extract", exact: true })
    .click();
  await expect(
    app.getByRole("dialog", { name: "Extract files?" }),
  ).toContainText("2 of 3 selected files");
});

test("escape and backdrop click cancel the confirm", async ({ app }) => {
  await openPack(app);
  await app
    .getByRole("button", { name: "Extract", exact: true })
    .click();
  const dialog = app.getByRole("dialog", { name: "Extract files?" });
  await expect(dialog).toBeVisible();
  await app.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await app
    .getByRole("button", { name: "Extract", exact: true })
    .click();
  await expect(
    app.getByRole("dialog", { name: "Extract files?" }),
  ).toBeVisible();
  // Far-left edge is backdrop (dialog card is centered).
  await app.mouse.click(8, 300);
  await expect(
    app.getByRole("dialog", { name: "Extract files?" }),
  ).toHaveCount(0);
});

test("successful extract shows the completion dialog", async ({ app }) => {
  await openPack(app);
  await app
    .getByRole("button", { name: "Extract", exact: true })
    .click();
  await app.getByRole("button", { name: "Proceed" }).click();
  const done = app.getByRole("dialog", { name: "Extraction complete" });
  await expect(done).toContainText("3 files extracted to");
  await expect(done).toContainText("/tmp");
  await app.getByRole("button", { name: "OK" }).click();
  await expect(done).toHaveCount(0);

  const seen = await calls(app);
  expect(seen.extracts).toHaveLength(1);
  expect(seen.extracts[0]).toMatchObject({
    path: PATH,
    dest: "/tmp",
    files: [],
  });
});

test("extract sends only the selected in-archive paths", async ({ app }) => {
  await addArchive(app, PATH, {
    entries: [{ path: "a.txt" }, { path: "b.txt" }],
  });
  await openViaButton(app, PATH);
  await app.getByRole("checkbox", { name: "Select b.txt" }).click();
  await app
    .getByRole("button", { name: "Extract", exact: true })
    .click();
  await app.getByRole("button", { name: "Proceed" }).click();
  await expect(
    app.getByRole("dialog", { name: "Extraction complete" }),
  ).toContainText("1 files extracted to");
  const seen = await calls(app);
  expect(seen.extracts[0].files).toEqual(["b.txt"]);
});

test("failed extract shows the failure dialog", async ({ app }) => {
  await openPack(app);
  await failNextExtract(app, "disk full (e2e)");
  await app
    .getByRole("button", { name: "Extract", exact: true })
    .click();
  await app.getByRole("button", { name: "Proceed" }).click();
  const failed = app.getByRole("dialog", { name: "Extraction failed" });
  await expect(failed).toContainText("disk full (e2e)");
  await expect(failed).toContainText("/tmp");
  await app.keyboard.press("Escape");
  await expect(failed).toHaveCount(0);
});

test("destination picker updates where files go", async ({ app }) => {
  await openPack(app);
  await stubPicker(app, { dir: "/home/user/out" });
  await app.getByRole("button", { name: "Choose where to extract" }).click();
  await expect(
    app.getByRole("button", { name: "Choose where to extract" }),
  ).toContainText("/home/user/out");
  await app
    .getByRole("button", { name: "Extract", exact: true })
    .click();
  await app.getByRole("button", { name: "Proceed" }).click();
  await expect(
    app.getByRole("dialog", { name: "Extraction complete" }),
  ).toContainText("/home/user/out");
  const seen = await calls(app);
  expect(seen.extracts[0].dest).toBe("/home/user/out");
});

test("cancelled destination picker keeps the old dest", async ({ app }) => {
  await openPack(app);
  await stubPicker(app, { dir: null });
  await app.getByRole("button", { name: "Choose where to extract" }).click();
  await expect(
    app.getByRole("button", { name: "Choose where to extract" }),
  ).toContainText("/tmp");
});

test("extract is disabled for an empty archive", async ({ app }) => {
  await addArchive(app, "/tmp/empty.zip", { count: 0 });
  await openViaButton(app, "/tmp/empty.zip");
  await expect(
    app.getByRole("button", { name: "Extract", exact: true }),
  ).toBeDisabled();
});
