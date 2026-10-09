import { addArchive, expect, openViaButton, test } from "../fixtures";
import type { Page } from "@playwright/test";

const PATH = "/tmp/pack.zip";

async function openPack(app: Page) {
  await addArchive(app, PATH, { count: 3 });
  await openViaButton(app, PATH);
  await expect(app.getByText("file-1.txt")).toBeVisible();
}

interface ButtonRow {
  id: string;
  cursor: string;
  title: string;
}

/// Every visible button right now: id (or accessible name) + computed
/// cursor + native tooltip.
async function auditButtons(app: Page): Promise<ButtonRow[]> {
  const btns = app.locator("button:visible");
  const n = await btns.count();
  const rows: ButtonRow[] = [];
  for (let i = 0; i < n; i++) {
    rows.push(
      await btns.nth(i).evaluate((el) => ({
        id:
          el.id ||
          el.getAttribute("aria-label") ||
          (el.textContent ?? "").trim().slice(0, 24),
        cursor: getComputedStyle(el).cursor,
        title: (el as HTMLButtonElement).title,
      })),
    );
  }
  return rows;
}

/// Sweep every overlay state in stages (one menu at a time — the extract
/// dialog covers the action row, so stacking them starves Playwright's
/// actionability checks). Merged + deduped by id.
async function auditEverywhere(app: Page): Promise<ButtonRow[]> {
  const seen = new Map<string, ButtonRow>();
  const collect = async () => {
    for (const r of await auditButtons(app)) seen.set(r.id, r);
  };
  await collect();
  await app.getByRole("button", { name: "Change theme" }).click();
  await collect();
  await app.keyboard.press("Escape");
  await app.getByRole("button", { name: "Change language" }).click();
  await collect();
  await app.keyboard.press("Escape");
  await app.getByRole("button", { name: "Extract All" }).click();
  await collect();
  return [...seen.values()];
}

test("every button uses the native arrow cursor", async ({ app }) => {
  await openPack(app);
  const rows = await auditEverywhere(app);
  expect(rows.length).toBeGreaterThan(10);
  const handed = rows.filter((r) => r.cursor === "pointer");
  expect(
    handed,
    `hand cursor on: ${handed.map((r) => r.id).join(", ")}`,
  ).toHaveLength(0);
  for (const r of rows) expect(r.cursor).toBe("default");
});

test("every button names its action on hover", async ({ app }) => {
  await openPack(app);
  const rows = await auditEverywhere(app);
  const untipped = rows.filter((r) => r.title.trim() === "");
  expect(
    untipped,
    `missing tooltip on: ${untipped.map((r) => r.id).join(", ")}`,
  ).toHaveLength(0);
});

test("a held press answers with a scale", async ({ app }) => {
  await openPack(app);
  const btn = app.getByRole("button", { name: "Extract All" });
  await btn.hover();
  await app.mouse.down();
  // The held state needs a frame to apply — poll, don't snapshot (roomy
  // timeout: full-suite parallelism can starve the compositor).
  await expect
    .poll(() => btn.evaluate((el) => getComputedStyle(el).scale), {
      timeout: 5000,
    })
    .not.toBe("none");
  await app.mouse.up();
  // Tailwind v4 drives `scale-*` via the CSS `scale` property.
  const released = await btn.evaluate((el) => getComputedStyle(el).scale);
  expect(released).toBe("none");
});
