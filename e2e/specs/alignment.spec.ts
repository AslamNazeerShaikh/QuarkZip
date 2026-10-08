/// Window geometry pins at the minimum window (800×675): chrome edges
/// share the content column's vertical lines and one spacing rhythm.
import { addArchive, expect, openViaButton, test } from "../fixtures";

test.use({ viewport: { width: 800, height: 675 } });

async function openBig(
  app: Parameters<typeof openViaButton>[0],
  path = "/tmp/geo.zip",
) {
  await addArchive(app, path, { count: 250 });
  await openViaButton(app, path);
}

test("linux titlebar insets match the card edges", async ({ app }) => {
  await openBig(app);
  const open = await app.locator("#qz-titlebar-open").boundingBox();
  const card = await app.locator("#qz-overview-card").boundingBox();
  const controls = await app.locator("#qz-titlebar-controls").boundingBox();
  // Open's left edge lands on the card's left edge…
  expect(Math.abs(open!.x - card!.x)).toBeLessThan(1.5);
  // …and the window controls land on the card's right edge.
  expect(
    Math.abs(controls!.x + controls!.width - (card!.x + card!.width)),
  ).toBeLessThan(1.5);
  // Vertical rhythm: the button's top air equals its gap down to the card.
  const bar = await app.locator("#qz-titlebar-linux").boundingBox();
  expect(
    Math.abs(open!.y - bar!.y - (card!.y - (open!.y + open!.height))),
  ).toBeLessThan(1.5);
  // Same 28px air as the footer buttons: titlebar top-air == footer top-gap
  // (both derive from one 28px nominal, so root-font scaling cancels out).
  const footer = await app.locator("#qz-app-footer").boundingBox();
  const extract = await app.locator("#qz-app-extract-selected").boundingBox();
  expect(Math.abs(open!.y - bar!.y - (extract!.y - footer!.y))).toBeLessThan(
    1.5,
  );
  // Read-only warning rides below the Linux title too.
  await expect(
    app.getByText("Read-only — extract files, cannot modify"),
  ).toBeVisible();
});

test("macOS open aligns to the card's right edge", async ({ page }) => {
  await page.goto("/?platform=macos");
  await page.evaluate(() => window.__e2e.reset());
  await page.evaluate(() =>
    window.__e2e.addArchive("/tmp/m.zip", { count: 1 }),
  );
  await page.evaluate(() => window.__e2e.drop(["/tmp/m.zip"]));
  await expect(page.locator("#qz-overview-card")).toBeVisible();
  const open = await page.locator("#qz-titlebar-open").boundingBox();
  const card = await page.locator("#qz-overview-card").boundingBox();
  const bar = await page.locator("#qz-titlebar-mac").boundingBox();
  // Right edges share one vertical line…
  expect(
    Math.abs(open!.x + open!.width - (card!.x + card!.width)),
  ).toBeLessThan(1.5);
  // …and top air equals the gap down to the card.
  expect(
    Math.abs(open!.y - bar!.y - (card!.y - (open!.y + open!.height))),
  ).toBeLessThan(1.5);
  // True center despite asymmetric siblings/padding: the title midpoint
  // lands on the window midpoint (in-flow centering sat ~24px right).
  const title = await page.locator("#qz-titlebar-mac-title").boundingBox();
  expect(Math.abs(title!.x + title!.width / 2 - 400)).toBeLessThan(3);
  // Read-only warning rides below the title, italic.
  const hint = page.getByText("Read-only — extract files, cannot modify");
  await expect(hint).toBeVisible();
  expect(await hint.evaluate((el) => getComputedStyle(el).fontStyle)).toBe(
    "italic",
  );
});

test("footer, table, and window share one inset rhythm", async ({ app }) => {
  await openBig(app);
  const extract = await app.locator("#qz-app-extract-selected").boundingBox();
  const wrap = await app.locator("#qz-app-table-wrap").boundingBox();
  const frame = await app.getByTestId("app-frame").boundingBox();
  const footer = await app.locator("#qz-app-footer").boundingBox();
  // Extract's left edge lands on the table's left edge.
  expect(Math.abs(extract!.x - wrap!.x)).toBeLessThan(1.5);
  // One rhythm: left inset == bottom gap == table-to-action gap.
  const leftInset = extract!.x - frame!.x;
  const frameBottom = frame!.y + frame!.height;
  const footerBottom = footer!.y + footer!.height;
  expect(Math.abs(leftInset - (frameBottom - footerBottom))).toBeLessThan(1.5);
  expect(
    Math.abs(extract!.y - (wrap!.y + wrap!.height) - leftInset),
  ).toBeLessThan(2);
});

test("entry total shows at minimum width", async ({ app }) => {
  await openBig(app);
  await expect(app.locator("#qz-pager-total")).toBeVisible();
  await expect(app.locator("#qz-pager-total")).toContainText("250");
});
