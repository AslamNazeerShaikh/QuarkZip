/// Real production window size (792x660): layout must hold together.
import {
  addArchive,
  expect,
  expectPage,
  openViaButton,
  test,
} from "../fixtures";

test.use({ viewport: { width: 792, height: 660 } });

test("app fits without horizontal overflow", async ({ app }) => {
  await addArchive(app, "/tmp/narrow.zip", { count: 150 });
  await openViaButton(app, "/tmp/narrow.zip");
  const overflow = await app.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(app.getByText("file-1.txt", { exact: true })).toBeVisible();
  await expectPage(app, 1, 2);
  await expect(app.locator("header")).toContainText("narrow.zip");
});

test("narrow-screen total count stays visible", async ({ app }) => {
  await addArchive(app, "/tmp/narrow.zip", { count: 150 });
  await openViaButton(app, "/tmp/narrow.zip");
  await expectPage(app, 1, 2);
  // The entry total always shows, narrow windows included — scope to the
  // card controls so the overview "Files" count does not match.
  await expect(
    app.getByTestId("card-controls").getByText("150", { exact: true }),
  ).toBeVisible();
});

test("dialogs stay usable at window size", async ({ app }) => {
  await addArchive(app, "/tmp/narrow.zip", { count: 5 });
  await openViaButton(app, "/tmp/narrow.zip");
  await app.getByRole("button", { name: "Extract All" }).click();
  const dialog = app.getByRole("dialog", { name: "Extract all files?" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(792);
  await app.getByRole("button", { name: "Proceed" }).click();
  await expect(
    app.getByRole("dialog", { name: "Extraction complete" }),
  ).toBeVisible();
});
