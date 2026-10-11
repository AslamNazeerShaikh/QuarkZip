//! Tree checkbox selection ported 1:1 from `src/lib/treeSelection.ts`:
//! an explicit path set with folder-prefix collapse. Checking a folder adds
//! the folder path and drops everything under it (the extract engine
//! expands a folder path to its subtree); `checked`/`mixed` derive from
//! string prefixes alone — no child loading needed, so collapsed subtrees
//! stay exact.

use std::collections::HashSet;

pub fn trim_sep(path: &str) -> &str {
    path.trim_end_matches(['/', '\\'])
}

/// `child` strictly under `parent` (trailing slashes tolerated).
pub fn is_under(parent: &str, child: &str) -> bool {
    if child == parent {
        return false;
    }
    let p = trim_sep(parent);
    if p.is_empty() {
        return false;
    }
    let Some(rest) = child.strip_prefix(p) else {
        return false;
    };
    rest.starts_with('/') || rest.starts_with('\\')
}

/// Check `path`: drop everything under it, then add it.
pub fn select_path(selected: &HashSet<String>, path: &str) -> HashSet<String> {
    let mut next = HashSet::new();
    for p in selected {
        if !is_under(path, p) {
            next.insert(p.clone());
        }
    }
    next.insert(path.to_string());
    next
}

/// Uncheck `path`: drop it and everything under it.
pub fn deselect_path(selected: &HashSet<String>, path: &str) -> HashSet<String> {
    let mut next = HashSet::new();
    for p in selected {
        if p != path && !is_under(path, p) {
            next.insert(p.clone());
        }
    }
    next
}

/// Uncheck `path`, splitting the nearest selected ancestor into its
/// *loaded* children (minus the unchecked branch).
pub fn split_for_uncheck(
    selected: &HashSet<String>,
    path: &str,
    loaded_children: &[String],
) -> HashSet<String> {
    let ancestor = selected.iter().find(|p| is_under(p, path)).cloned();
    let mut next = deselect_path(selected, path);
    if let Some(a) = ancestor {
        next.remove(&a);
        for child in loaded_children {
            if child != path && !is_under(path, child) {
                next.insert(child.clone());
            }
        }
    }
    next
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum NodeState {
    Checked,
    Mixed,
    Unchecked,
}

/// Display state: checked when explicitly selected or covered by a selected
/// ancestor; mixed when only a descendant is selected.
pub fn node_state(selected: &HashSet<String>, path: &str) -> NodeState {
    if selected.contains(path) {
        return NodeState::Checked;
    }
    for p in selected {
        if is_under(p, path) {
            return NodeState::Checked;
        }
    }
    for p in selected {
        if is_under(path, p) {
            return NodeState::Mixed;
        }
    }
    NodeState::Unchecked
}

fn parent_path(path: &str) -> Option<&str> {
    let trimmed = trim_sep(path);
    let i = trimmed.rfind(['/', '\\'])?;
    Some(&trimmed[..i])
}

/// Nearest selected ancestor (`pics/` and `pics` spell the same folder).
pub fn selected_ancestor(selected: &HashSet<String>, path: &str) -> Option<String> {
    let mut probe = parent_path(path);
    while let Some(p) = probe {
        if selected.contains(p)
            || selected.contains(&format!("{p}/"))
            || selected.contains(&format!("{p}\\"))
        {
            return Some(p.to_string());
        }
        probe = parent_path(p);
    }
    None
}

/// Basename for display (zip-style `pics/` trailing slashes skipped).
pub fn display_name(path: &str) -> &str {
    let trimmed = trim_sep(path);
    match trimmed.rfind(['/', '\\']) {
        Some(i) => &trimmed[i + 1..],
        None => {
            if trimmed.is_empty() {
                path
            } else {
                trimmed
            }
        }
    }
}

/// Box-drawing prefix (algorithm reference for the painted guides in
/// `tree`: one 4-char cell per ancestor plus the row's own elbow).
/// Pinned by test; the tree paints the same geometry with line segments.
#[allow(dead_code)]
pub fn guide_prefix(guides: &[bool], depth: usize) -> String {
    let mut out = String::new();
    for i in 0..depth {
        out.push_str(if guides.get(i).copied().unwrap_or(false) {
            "│   "
        } else {
            "    "
        });
    }
    let last = if depth < guides.len() {
        guides[depth]
    } else {
        true
    };
    out.push_str(if last { "├── " } else { "└── " });
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn set(paths: &[&str]) -> HashSet<String> {
        paths.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn should_collapse_folders_on_check() {
        let sel = select_path(&set(&["docs/a.txt", "top.txt"]), "docs");
        assert!(sel.contains("docs"));
        assert!(!sel.contains("docs/a.txt"));
        assert!(sel.contains("top.txt"));
    }

    #[test]
    fn should_derive_mixed_and_inherited_checked() {
        let sel = set(&["docs"]);
        assert_eq!(node_state(&sel, "docs/a.txt"), NodeState::Checked);
        assert_eq!(node_state(&sel, "docs"), NodeState::Checked);
        let sel2 = set(&["docs/a.txt"]);
        assert_eq!(node_state(&sel2, "docs"), NodeState::Mixed);
        assert_eq!(node_state(&sel2, "top.txt"), NodeState::Unchecked);
    }

    #[test]
    fn should_split_ancestor_on_inner_uncheck() {
        let sel = set(&["docs"]);
        let next = split_for_uncheck(
            &sel,
            "docs/a.txt",
            &["docs/a.txt".into(), "docs/b.txt".into()],
        );
        assert!(!next.contains("docs"));
        assert!(!next.contains("docs/a.txt"));
        assert!(next.contains("docs/b.txt"));
    }

    #[test]
    fn should_tolerate_trailing_slashes() {
        assert!(is_under("pics", "pics/a.jpg"));
        assert!(is_under("pics/", "pics/a.jpg"));
        assert!(!is_under("pics", "pics2/a.jpg"));
        assert!(!is_under("pics", "pics"));
        assert_eq!(display_name("pics/"), "pics");
        assert_eq!(guide_prefix(&[true, false], 1), "│   └── ");
    }
}
