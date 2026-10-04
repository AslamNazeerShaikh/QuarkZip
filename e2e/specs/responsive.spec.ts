/// Real production window size (792x660): layout must hold together.
import { addArchive, expect, openViaButton, test } from "../fixtures";

test.use({ viewport: { width: 792, height: 660 } });

test("app fits without horizontal overflow", async ({ app }) => {
  await addArchive(app, "/tmp/narrow.zip", { count: 150 });
  await openViaButton(app, "/tmp/narrow.zip");
  const overflow = await app.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(app.getByText("file-1.txt", { exact: true })).toBeVisible();
  await expect(app.getByText("1 / 2")).toBeVisible();
  await expect(app.locator("header")).toContainText("narrow.zip");
});

test("wide-screen total count stays hidden", async ({ app }) => {
  await addArchive(app, "/tmp/narrow.zip", { count: 150 });
  await openViaButton(app, "/tmp/narrow.zip");
  await expect(app.getByText("1 / 2")).toBeVisible();
  // Present in the DOM (wide screens show it) but hidden here: scope to
  // the footer so the overview "Files" count does not match.
  await expect(
    app.locator("footer").getByText("150", { exact: true }),
  ).toBeHidden();
});

test("dialogs stay usable at window size", async ({ app }) => {
  await addArchive(app, "/tmp/narrow.zip", { count: 5 });
  await openViaButton(app, "/tmp/narrow.zip");
  await app.getByRole("button", { name: "Extract", exact: true }).click();
  const dialog = app.getByRole("dialog", { name: "Extract files?" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(792);
  await app.getByRole("button", { name: "Proceed" }).click();
  await expect(
    app.getByRole("dialog", { name: "Extraction complete" }),
  ).toBeVisible();
});
