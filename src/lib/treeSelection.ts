/// Tree checkbox selection: an explicit set of in-archive paths with
/// folder-prefix collapse. Checking a folder adds the folder path and drops
/// every path under it (the extract backend expands a folder path to its
/// whole subtree, so descendants are redundant); unchecking removes the
/// path and everything under it. `checked`/`mixed` derive from string
/// prefixes alone — no child loading needed, so collapsed subtrees stay
/// exact. All helpers are pure (copy-on-write) for React state.

/// `child` is strictly under `parent` (`a/b` under `a`, never `a` itself;
/// trailing slashes tolerated on either side).
export function isUnder(parent: string, child: string): boolean {
  if (child === parent) return false;
  const p = parent.replace(/[/\\]+$/, "");
  if (p === "") return false;
  if (!child.startsWith(p)) return false;
  const rest = child.slice(p.length);
  return rest.startsWith("/") || rest.startsWith("\\");
}

/// Check `path`: drop everything under it, then add it.
export function selectPath(
  selected: ReadonlySet<string>,
  path: string,
): Set<string> {
  const next = new Set<string>();
  for (const p of selected) {
    if (!isUnder(path, p)) next.add(p);
  }
  next.add(path);
  return next;
}

/// Uncheck `path`: drop it and everything under it.
export function deselectPath(
  selected: ReadonlySet<string>,
  path: string,
): Set<string> {
  const next = new Set<string>();
  for (const p of selected) {
    if (p !== path && !isUnder(path, p)) next.add(p);
  }
  return next;
}

/// Uncheck `path`, splitting the nearest selected ancestor into its
/// *loaded* children (minus the unchecked branch): the folder checkbox
/// visibly flips checked → mixed, so nothing narrows silently. Unloaded
/// remainder leaves the selection — expand a folder fully before
/// deselecting inside it for exact control.
export function splitForUncheck(
  selected: ReadonlySet<string>,
  path: string,
  /// Loaded immediate-child paths of the split folder.
  loadedChildren: string[],
): Set<string> {
  const ancestor = [...selected].find((p) => isUnder(p, path));
  const next = deselectPath(selected, path);
  if (ancestor === undefined) return next;
  next.delete(ancestor);
  for (const child of loadedChildren) {
    if (child !== path && !isUnder(path, child)) next.add(child);
  }
  return next;
}

/// Display state of one node: checked when explicitly selected or covered
/// by a selected ancestor (inherited — clicking excludes it via
/// [`splitForUncheck`]), mixed when only a descendant is selected.
export function nodeState(
  selected: ReadonlySet<string>,
  path: string,
): boolean | "mixed" {
  if (selected.has(path)) return true;
  for (const p of selected) {
    if (isUnder(p, path)) return true;
  }
  for (const p of selected) {
    if (isUnder(path, p)) return "mixed";
  }
  return false;
}

/// Nearest selected ancestor of `path` (`pics/` and `pics` spell the same
/// folder — zip listings trail slashes), if any.
export function selectedAncestor(
  selected: ReadonlySet<string>,
  path: string,
): string | null {
  const has = (p: string) =>
    selected.has(p) || selected.has(`${p}/`) || selected.has(`${p}\\`);
  let probe = parentPath(path);
  while (probe !== null) {
    if (has(probe)) return probe;
    probe = parentPath(probe);
  }
  return null;
}

/// Basename for display: trailing slashes (zip-style `pics/`) leave an
/// empty last segment, so empty segments are skipped.
export function displayName(path: string): string {
  const segs = path.split(/[/\\]/).filter((s) => s.length > 0);
  return segs.length > 0 ? segs[segs.length - 1] : path;
}

function parentPath(path: string): string | null {
  const trimmed = path.replace(/[/\\]+$/, "");
  const i = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  if (i < 0) return null;
  return trimmed.slice(0, i);
}
