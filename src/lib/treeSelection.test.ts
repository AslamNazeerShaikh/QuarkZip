import { describe, expect, it } from "vitest";
import {
  deselectPath,
  displayName,
  isUnder,
  nodeState,
  selectPath,
  selectedAncestor,
  splitForUncheck,
} from "./treeSelection";

/// Folder-prefix selection: checking collapses subtrees to one path (the
/// extract backend expands folder paths), unchecking prunes, display
/// derives from prefixes alone — exact without loading children.
describe("treeSelection", () => {
  it("should_match_strict_descendants_only", () => {
    expect(isUnder("a", "a/b")).toBe(true);
    expect(isUnder("a", "a")).toBe(false);
    expect(isUnder("a", "ab")).toBe(false);
    expect(isUnder("a", "a/b/c")).toBe(true);
    expect(isUnder("a/", "a/b")).toBe(true);
    expect(isUnder("", "a")).toBe(false);
  });

  it("should_collapse_descendants_when_checking_a_folder", () => {
    const next = selectPath(new Set(["a/b", "a/c", "z.txt"]), "a");
    expect(next).toEqual(new Set(["a", "z.txt"]));
  });

  it("should_prune_the_subtree_when_unchecking_a_folder", () => {
    const next = deselectPath(new Set(["a", "a/b", "z.txt"]), "a");
    expect(next).toEqual(new Set(["z.txt"]));
  });

  it("should_derive_checked_mixed_and_inherited_states", () => {
    const sel = new Set(["a/b"]);
    expect(nodeState(sel, "a/b")).toBe(true);
    expect(nodeState(sel, "a")).toBe("mixed");
    expect(nodeState(sel, "z.txt")).toBe(false);
    expect(nodeState(new Set(["a"]), "a")).toBe(true);
    // Covered by a selected ancestor: shown checked, clicking excludes.
    expect(nodeState(new Set(["a"]), "a/b")).toBe(true);
    expect(nodeState(new Set(["a"]), "a/b/c")).toBe(true);
  });

  it("should_find_selected_ancestors_despite_trailing_slashes", () => {
    expect(selectedAncestor(new Set(["pics/"]), "pics/a.png")).toBe("pics");
    expect(selectedAncestor(new Set(["pics"]), "pics/a.png")).toBe("pics");
    expect(selectedAncestor(new Set(["other"]), "pics/a.png")).toBeNull();
    expect(selectedAncestor(new Set(["pics/a.png"]), "pics/a.png")).toBeNull();
  });

  it("should_split_the_ancestor_into_loaded_siblings_on_uncheck", () => {
    // Folder `a` checked, children loaded: unchecking `a/b` leaves the
    // loaded siblings explicitly selected (folder flips to mixed).
    const next = splitForUncheck(new Set(["a"]), "a/b", ["a/b", "a/c"]);
    expect(next).toEqual(new Set(["a/c"]));
  });

  it("should_plainly_remove_without_a_selected_ancestor", () => {
    const next = splitForUncheck(new Set(["a/c"]), "a/b", ["a/b", "a/c"]);
    expect(next).toEqual(new Set(["a/c"]));
  });

  it("should_show_basenames_despite_trailing_slashes", () => {
    expect(displayName("pics/")).toBe("pics");
    expect(displayName("a/b/c.txt")).toBe("c.txt");
    expect(displayName("lonely")).toBe("lonely");
  });
});
