import { describe, expect, it } from "vitest";
// @ts-expect-error no @types/node in this repo (same as vite.config.ts)
import { readFileSync, readdirSync, statSync } from "node:fs";
// @ts-expect-error no @types/node in this repo (same as vite.config.ts)
import { join } from "node:path";
// @ts-expect-error no @types/node in this repo (same as vite.config.ts)
import process from "node:process";

/// Chrome rules (see docs/ui-guidelines.md "Interaction / states" and the
/// base rule in index.css): native arrow cursor on every button (never the
/// hand — Apple HIG reserves it for URL links), press-scale feedback, and
/// a native tooltip on every button. Source scans so future buttons obey
/// without anyone rendering every screen.

function srcFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir) as string[]) {
    const full = join(dir, entry) as string;
    if ((statSync(full) as { isDirectory(): boolean }).isDirectory()) {
      if (entry === "node_modules") continue;
      srcFiles(full, out);
    } else if (/\.tsx?$/.test(full) && !/\.test\.tsx?$/.test(full)) {
      out.push(full);
    }
  }
  return out;
}

function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
}

/// Every `<button>`/`<Button>` opening tag (tags wrap lines, so the match
/// runs to the line holding the lone closing `>`), except the `Button`
/// primitive itself (it forwards `title` via `...rest`).
function buttonTags(src: string): string[] {
  const tags: string[] = [];
  const re = /<(button|Button)\b([\s\S]*?)\n\s*(\/?>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) tags.push(m[2]);
  return tags;
}

describe("chrome rules", () => {
  it("should_never_use_the_hand_cursor_on_buttons", () => {
    const root = join(process.cwd() as string, "src") as string;
    const offenders: string[] = [];
    for (const file of srcFiles(root)) {
      const clean = withoutComments(readFileSync(file, "utf8") as string);
      // Split the token so this very file never matches itself.
      if (clean.includes("cursor-" + "pointer")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("should_give_every_button_a_native_tooltip", () => {
    const root = join(process.cwd() as string, "src") as string;
    const missing: string[] = [];
    for (const file of srcFiles(root)) {
      if (file.endsWith("components/ui/button.tsx")) continue;
      const src = readFileSync(file, "utf8") as string;
      for (const tag of buttonTags(src)) {
        if (!tag.includes("title=")) {
          const id = tag.match(/id="([^"]+)"/)?.[1] ?? "(no id)";
          missing.push(`${file} :: ${id}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("should_animate_presses_on_every_raw_button", () => {
    // `<Button>` inherits its press from the primitive (pinned in
    // `button.test.tsx`) — only raw `<button>` tags carry the class,
    // inline or via a shared `className={...}` constant in the same file
    // (TitleBar's `openClass`/`btn`).
    const root = join(process.cwd() as string, "src") as string;
    const missing: string[] = [];
    for (const file of srcFiles(root)) {
      if (file.endsWith("components/ui/button.tsx")) continue;
      const src = readFileSync(file, "utf8") as string;
      const re = /<button\b([\s\S]*?)\n\s*(\/?>)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const tag = m[1];
        if (tag.includes("motion-safe:active:scale-")) continue;
        const ref = tag.match(/className=\{([A-Za-z_]+)\}/)?.[1];
        const def = ref
          ? (src.match(new RegExp(`const ${ref} =\\s*"([^"]+)"`))?.[1] ?? "")
          : "";
        if (!def.includes("motion-safe:active:scale-")) {
          const id = tag.match(/id="([^"]+)"/)?.[1] ?? "(no id)";
          missing.push(`${file} :: ${id}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
