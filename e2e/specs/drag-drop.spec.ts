import { addArchive, expect, test } from "../fixtures";

const PATH = "/tmp/dropped.zip";

test("hover shows the drop overlay, leave hides it", async ({ app }) => {
  await app.evaluate(() => window.__e2e.dragOver([]));
  await expect(app.getByText("Drop to open archive")).toBeVisible();
  await app.evaluate(() => window.__e2e.dragLeave());
  await expect(app.getByText("Drop to open archive")).not.toBeVisible();
});

test("dropping a file opens the archive", async ({ app }) => {
  await addArchive(app, PATH, { count: 2 });
  await app.evaluate((p) => window.__e2e.drop([p]), PATH);
  await expect(app.getByText("file-1.txt")).toBeVisible();
  await expect(app.locator("header")).toContainText(`QuarkZip | ${PATH}`);
});

test("dropping an unknown archive shows an error", async ({ app }) => {
  await app.evaluate((p) => window.__e2e.drop([p]), "/tmp/nope.zip");
  await expect(app.getByRole("alert")).toContainText("no such archive");
  await expect(app.getByText("No archive open")).toBeVisible();
});

test("dropping with no paths is a no-op", async ({ app }) => {
  await app.evaluate(() => window.__e2e.drop([]));
  await expect(app.getByText("No archive open")).toBeVisible();
  await expect(app.getByRole("alert")).toHaveCount(0);
});

test("dropping a second archive replaces the first", async ({ app }) => {
  await addArchive(app, "/tmp/a.zip", { entries: [{ path: "aaa.txt" }] });
  await addArchive(app, "/tmp/b.zip", { entries: [{ path: "bbb.txt" }] });
  await app.evaluate(() => window.__e2e.drop(["/tmp/a.zip"]));
  await expect(app.getByText("aaa.txt")).toBeVisible();
  await app.evaluate(() => window.__e2e.drop(["/tmp/b.zip"]));
  await expect(app.getByText("bbb.txt")).toBeVisible();
  await expect(app.getByText("aaa.txt")).not.toBeVisible();
});
