//! Nested file-tree browser ported from `src/components/ArchiveTree.tsx`:
//! folders expand in place, children arrive in 10k chunks on worker threads
//! (collapse drops them — a 10M archive never sits in UI RAM), the visible
//! window renders via `show_rows`, chunk navigation pages *within* a folder,
//! selection is the prefix-collapse set (`selection`), keyboard follows the
//! WAI-ARIA tree pattern with focus scrolling, loading folders show bounded
//! skeleton rows. Guides are painted line work (no font glyphs); the chevron
//! is two strokes; the index column shows the enumerate-order serial.
//!
//! Borrow discipline: flattened rows own chunk-key indices (never
//! references), so rendering + interaction never fight the borrow checker
//! mid-frame. Per-row entry data is resolved into small owned snapshots.

use crate::{
    archive,
    engine::ListingStore,
    file_kind, fmt,
    i18n::{t as tr, Lang},
    selection,
    theme::QzTheme,
    widgets,
};
use eframe::egui;
use std::collections::{HashMap, HashSet};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::thread;

pub const CHILD_CHUNK: usize = 10_000;
const ROW_H: f32 = 36.0;
const SKELETON_ROWS: usize = 6;
const TYPEAHEAD_SECS: f64 = 0.5;
const GUIDE_CELL: f32 = 14.0;

pub struct FolderChunk {
    rows: Vec<archive::ArchiveEntry>,
    total: usize,
    chunk: usize,
}

struct ChunkRes {
    parent: String,
    req: u64,
    chunk: usize,
    rows: Vec<archive::ArchiveEntry>,
    total: usize,
    counts: HashMap<String, usize>,
}

/// Owned flattened row: `Node` carries a chunk-key index + row index into
/// `keys`/`chunks` (resolved per row, never borrowed across calls).
enum FlatRow {
    Node {
        key: usize,
        row: usize,
        depth: usize,
        guides: Vec<bool>,
    },
    Pager {
        parent: String,
        depth: usize,
    },
    Loading {
        depth: usize,
    },
    Empty {
        depth: usize,
    },
}

/// Small owned snapshot of one entry for a single row paint.
#[derive(Clone)]
struct RowInfo {
    path: String,
    is_folder: bool,
    index: usize,
    size: Option<u64>,
    modified: Option<String>,
    depth: usize,
}

pub struct TreeView {
    expanded: HashSet<String>,
    chunks: HashMap<String, FolderChunk>,
    counts: HashMap<String, usize>,
    loading: HashSet<String>,
    pending: HashMap<String, u64>,
    req_id: u64,
    inbox_tx: Sender<ChunkRes>,
    inbox_rx: Option<Receiver<ChunkRes>>,
    focus: Option<usize>,
    need_scroll: bool,
    typeahead: String,
    typeahead_at: f64,
}

impl TreeView {
    pub fn new() -> Self {
        let (tx, rx) = channel();
        Self {
            expanded: HashSet::new(),
            chunks: HashMap::new(),
            counts: HashMap::new(),
            loading: HashSet::new(),
            pending: HashMap::new(),
            req_id: 0,
            inbox_tx: tx,
            inbox_rx: Some(rx),
            focus: None,
            need_scroll: false,
            typeahead: String::new(),
            typeahead_at: 0.0,
        }
    }

    pub fn reset(&mut self) {
        let (tx, rx) = channel();
        self.expanded.clear();
        self.chunks.clear();
        self.counts.clear();
        self.loading.clear();
        self.pending.clear();
        self.inbox_tx = tx;
        self.inbox_rx = Some(rx);
        self.focus = None;
        self.need_scroll = false;
        self.typeahead.clear();
    }

    fn poll(&mut self) {
        // Take the receiver out briefly so `try_recv` doesn't hold `self`.
        let rx = self.inbox_rx.take();
        if let Some(r) = &rx {
            while let Ok(res) = r.try_recv() {
                if self.pending.get(&res.parent).copied() != Some(res.req) {
                    continue;
                }
                self.pending.remove(&res.parent);
                self.loading.remove(&res.parent);
                for (p, n) in res.counts {
                    self.counts.insert(p, n);
                }
                self.chunks.insert(
                    res.parent,
                    FolderChunk {
                        rows: res.rows,
                        total: res.total,
                        chunk: res.chunk,
                    },
                );
            }
        }
        self.inbox_rx = rx;
    }

    fn fetch_chunk(&mut self, store: &ListingStore, parent: &str, chunk: usize) {
        self.req_id += 1;
        let req = self.req_id;
        self.pending.insert(parent.to_string(), req);
        self.loading.insert(parent.to_string());
        let facts = store.facts.clone();
        let parent_owned = parent.to_string();
        let inbox = self.inbox_tx.clone();
        thread::spawn(move || {
            let page = archive::children_of(
                &facts,
                &parent_owned,
                chunk * CHILD_CHUNK,
                CHILD_CHUNK,
                archive::PageSortKey::Path,
                false,
            );
            let want: HashSet<String> = page
                .rows
                .iter()
                .filter(|r| r.is_folder)
                .map(|r| r.path.trim_end_matches(['/', '\\']).to_string())
                .collect();
            let fresh = archive::immediate_child_counts(&facts, &want);
            let child_counts: HashMap<String, usize> = page
                .rows
                .iter()
                .filter(|r| r.is_folder)
                .map(|r| {
                    let p = r.path.trim_end_matches(['/', '\\']).to_string();
                    (r.path.clone(), fresh.get(&p).copied().unwrap_or(0))
                })
                .collect();
            let _ = inbox.send(ChunkRes {
                parent: parent_owned,
                req,
                chunk,
                rows: page.rows,
                total: page.total,
                counts: child_counts,
            });
        });
    }

    pub fn ensure_root(&mut self, store: &ListingStore) {
        if !self.chunks.contains_key("") && !self.loading.contains("") {
            self.fetch_chunk(store, "", 0);
        }
    }

    fn toggle_expand(&mut self, store: &ListingStore, path: &str) {
        if self.expanded.contains(path) {
            self.expanded.remove(path);
            self.chunks
                .retain(|k, _| k != path && !selection::is_under(path, k));
            self.loading
                .retain(|k| k != path && !selection::is_under(path, k));
            self.pending
                .retain(|k, _| k != path && !selection::is_under(path, k));
            self.expanded
                .retain(|k| k != path && !selection::is_under(path, k));
        } else {
            self.expanded.insert(path.to_string());
            if !self.chunks.contains_key(path) && !self.loading.contains(path) {
                self.fetch_chunk(store, path, 0);
            }
        }
    }

    fn toggle_node(selected: &mut HashSet<String>, path: &str, loaded_under: &[String]) {
        if selection::selected_ancestor(selected, path).is_some() {
            // Narrow the ancestor into its loaded children.
            let next = selection::split_for_uncheck(selected, path, loaded_under);
            *selected = next;
        } else if selected.contains(path) {
            *selected = selection::deselect_path(selected, path);
        } else {
            *selected = selection::select_path(selected, path);
        }
    }

    /// Flatten visible rows + interned chunk keys (both owned, no borrows).
    fn flatten(&self) -> (Vec<FlatRow>, Vec<String>) {
        let mut out = Vec::new();
        let mut keys: Vec<String> = Vec::new();
        fn intern(keys: &mut Vec<String>, key: &str) -> usize {
            match keys.iter().position(|k| k == key) {
                Some(i) => i,
                None => {
                    keys.push(key.to_string());
                    keys.len() - 1
                }
            }
        }
        fn walk(
            view: &TreeView,
            keys: &mut Vec<String>,
            key: &str,
            depth: usize,
            guides: Vec<bool>,
            pager: bool,
            out: &mut Vec<FlatRow>,
        ) {
            let rows_len = view.chunks.get(key).map(|c| c.rows.len()).unwrap_or(0);
            let ki = intern(keys, key);
            for i in 0..rows_len {
                let is_folder = view.chunks[key].rows[i].is_folder;
                let path = view.chunks[key].rows[i].path.clone();
                let continues = i + 1 < rows_len || (i + 1 == rows_len && pager);
                let mut g = guides.clone();
                g.push(continues);
                out.push(FlatRow::Node {
                    key: ki,
                    row: i,
                    depth,
                    guides: g.clone(),
                });
                if is_folder && view.expanded.contains(&path) {
                    let cached = view.chunks.get(&path);
                    let kids = cached.map(|c| c.rows.len()).unwrap_or(0);
                    let paged = cached.map(|c| c.total > CHILD_CHUNK).unwrap_or(false);
                    if kids > 0 {
                        walk(view, keys, &path, depth + 1, g.clone(), paged, out);
                    } else if view.loading.contains(&path) {
                        for _ in 0..SKELETON_ROWS {
                            out.push(FlatRow::Loading { depth: depth + 1 });
                        }
                    } else if cached.map(|c| c.total).unwrap_or(usize::MAX) == 0 {
                        out.push(FlatRow::Empty { depth: depth + 1 });
                    }
                    if paged {
                        out.push(FlatRow::Pager {
                            parent: path,
                            depth: depth + 1,
                        });
                    }
                }
            }
        }
        let root_total = self.chunks.get("").map(|c| c.total).unwrap_or(0);
        let root_paged = root_total > CHILD_CHUNK;
        let root_len = self.chunks.get("").map(|c| c.rows.len()).unwrap_or(0);
        if root_len > 0 {
            walk(self, &mut keys, "", 0, Vec::new(), root_paged, &mut out);
            if root_paged {
                out.push(FlatRow::Pager {
                    parent: String::new(),
                    depth: 0,
                });
            }
        } else if self.loading.contains("") {
            for _ in 0..SKELETON_ROWS {
                out.push(FlatRow::Loading { depth: 0 });
            }
        }
        (out, keys)
    }

    fn resolve(&self, keys: &[String], row: &FlatRow) -> Option<RowInfo> {
        let (key, r, depth) = match row {
            FlatRow::Node {
                key, row, depth, ..
            } => (*key, *row, *depth),
            _ => return None,
        };
        let parent = keys.get(key)?.clone();
        let e = self.chunks.get(&parent)?.rows.get(r)?;
        Some(RowInfo {
            path: e.path.clone(),
            is_folder: e.is_folder,
            index: e.index,
            size: e.size,
            modified: e.modified.clone(),
            depth,
        })
    }

    fn loaded_paths(&self) -> Vec<String> {
        let mut out = Vec::new();
        for c in self.chunks.values() {
            for r in &c.rows {
                out.push(r.path.clone());
            }
        }
        out
    }

    fn loaded_children_of(&self, folder: &str) -> Vec<String> {
        self.chunks
            .get(folder)
            .map(|c| c.rows.iter().map(|r| r.path.clone()).collect())
            .unwrap_or_default()
    }

    fn parent_flat_index(&self, keys: &[String], flat: &[FlatRow], index: usize) -> Option<usize> {
        let depth = match &flat[index] {
            FlatRow::Node { depth, .. } => *depth,
            _ => return None,
        };
        if depth == 0 {
            return None;
        }
        for i in (0..index).rev() {
            if let FlatRow::Node { depth: d, .. } = &flat[i] {
                if *d == depth - 1 {
                    // Any ancestor at depth-1 on the path qualifies; the
                    // nearest one above is the parent in a flat walk.
                    let _ = keys;
                    return Some(i);
                }
            }
        }
        None
    }
}

impl TreeView {
    /// Full tree card: static header + virtualized rows. `store=None` shows
    /// the empty state. Selection mutates in place (prefix-collapse set).
    pub fn show(
        &mut self,
        ui: &mut egui::Ui,
        store: Option<&ListingStore>,
        selected: &mut HashSet<String>,
        t: &QzTheme,
        lang: Lang,
        total_entries: usize,
    ) {
        let Some(store) = store else {
            ui.vertical_centered(|ui| {
                ui.add_space(40.0);
                ui.label(
                    egui::RichText::new(tr(lang, "table.empty", &[]))
                        .size(14.0)
                        .color(t.muted),
                );
                ui.label(
                    egui::RichText::new(tr(lang, "table.emptyHint", &[]))
                        .size(12.0)
                        .color(t.faint),
                );
            });
            return;
        };
        self.poll();
        self.ensure_root(store);
        if total_entries == 0 && !self.loading.contains("") {
            ui.vertical_centered(|ui| {
                ui.add_space(40.0);
                ui.label(
                    egui::RichText::new(tr(lang, "table.empty", &[]))
                        .size(14.0)
                        .color(t.muted),
                );
            });
            return;
        }
        let (flat, keys) = self.flatten();
        self.handle_keys(ui, store, selected, &flat, &keys);

        // Static header: checkbox + # + Name + Type + Size + Modified.
        let loaded = self.loaded_paths();
        let all = !loaded.is_empty() && loaded.iter().all(|p| selected.contains(p));
        let some = !all && loaded.iter().any(|p| selected.contains(p));
        let hstate = if all {
            selection::NodeState::Checked
        } else if some {
            selection::NodeState::Mixed
        } else {
            selection::NodeState::Unchecked
        };
        egui::Frame {
            fill: t.bar_bg,
            ..Default::default()
        }
        .show(ui, |ui| {
            ui.horizontal(|ui| {
                ui.add_space(10.0);
                if widgets::checkbox_box(ui, hstate, t).clicked() {
                    if all {
                        for p in &loaded {
                            selected.remove(p);
                        }
                    } else {
                        for p in &loaded {
                            selected.insert(p.clone());
                        }
                    }
                }
                ui.allocate_ui(egui::vec2(80.0, ROW_H), |ui| {
                    ui.centered_and_justified(|ui| {
                        ui.label(egui::RichText::new("#").size(12.0).strong().color(t.faint));
                    });
                });
                ui.allocate_ui(
                    egui::vec2(
                        (ui.available_width() - 96.0 - 128.0 - 256.0).max(40.0),
                        ROW_H,
                    ),
                    |ui| {
                        ui.label(
                            egui::RichText::new(tr(lang, "table.colName", &[]))
                                .size(12.0)
                                .strong()
                                .color(t.faint),
                        );
                    },
                );
                for (w, key) in [
                    (96.0, "table.colType"),
                    (128.0, "table.colSize"),
                    (256.0, "table.colModified"),
                ] {
                    ui.allocate_ui(egui::vec2(w, ROW_H), |ui| {
                        ui.centered_and_justified(|ui| {
                            ui.label(
                                egui::RichText::new(tr(lang, key, &[]))
                                    .size(12.0)
                                    .strong()
                                    .color(t.faint),
                            );
                        });
                    });
                }
            });
        });

        let tree_id = egui::Id::new("qz-tree");
        let flat_len = flat.len();
        egui::ScrollArea::vertical()
            .auto_shrink([false, false])
            .show_rows(ui, ROW_H, flat_len, |ui, range| {
                for idx in range {
                    self.render_row(ui, store, selected, &flat, &keys, idx, t, lang, tree_id);
                }
            });
    }

    fn handle_keys(
        &mut self,
        ui: &mut egui::Ui,
        store: &ListingStore,
        selected: &mut HashSet<String>,
        flat: &[FlatRow],
        keys: &[String],
    ) {
        if flat.is_empty() {
            return;
        }
        if !ui.memory(|m| m.has_focus(egui::Id::new("qz-tree"))) {
            return;
        }
        let cur = self.focus.unwrap_or(0).min(flat.len() - 1);
        let mut want = self.focus;
        ui.input(|i| {
            if i.key_pressed(egui::Key::ArrowDown) {
                want = Some((cur + 1).min(flat.len() - 1));
            } else if i.key_pressed(egui::Key::ArrowUp) {
                want = Some(cur.saturating_sub(1));
            } else if i.key_pressed(egui::Key::Home) {
                want = Some(0);
            } else if i.key_pressed(egui::Key::End) {
                want = Some(flat.len() - 1);
            }
        });
        let mut toggle_expand_at: Option<String> = None;
        let mut collapse_at: Option<String> = None;
        let mut toggle_select_at: Option<String> = None;
        let mut page_at: Option<(String, i64)> = None;
        // Resolve the focused row once (owned snapshot, no borrow held).
        let cur_info = self.resolve(keys, &flat[cur]);
        let cur_is_open_folder = cur_info
            .as_ref()
            .map(|n| n.is_folder && self.expanded.contains(&n.path))
            .unwrap_or(false);
        ui.input(|i| {
            if i.key_pressed(egui::Key::Enter) {
                match &flat[cur] {
                    FlatRow::Node { .. } => {
                        if let Some(n) = &cur_info {
                            if n.is_folder {
                                toggle_expand_at = Some(n.path.clone());
                            }
                        }
                    }
                    FlatRow::Pager { parent, .. } => {
                        page_at = Some((parent.clone(), 1));
                    }
                    _ => {}
                }
            } else if i.key_pressed(egui::Key::ArrowRight) {
                if let Some(n) = &cur_info {
                    if n.is_folder {
                        if !self.expanded.contains(&n.path) {
                            toggle_expand_at = Some(n.path.clone());
                        } else {
                            want = Some((cur + 1).min(flat.len() - 1));
                        }
                    }
                }
            } else if i.key_pressed(egui::Key::ArrowLeft) {
                if cur_is_open_folder {
                    if let Some(n) = &cur_info {
                        collapse_at = Some(n.path.clone());
                    }
                } else if let Some(p) = self.parent_flat_index(keys, flat, cur) {
                    want = Some(p);
                }
            } else if i.key_pressed(egui::Key::Space) {
                if let Some(n) = &cur_info {
                    toggle_select_at = Some(n.path.clone());
                }
            }
        });
        // `self` is borrowed by the input closure above; resolve-then-act
        // below keeps each borrow short. (NLL ends the closure borrow here.)
        if let Some(path) = toggle_expand_at {
            self.toggle_expand(store, &path);
        }
        if let Some(path) = collapse_at {
            if self.expanded.contains(&path) {
                self.toggle_expand(store, &path);
            }
        }
        if let Some(path) = toggle_select_at {
            let kids = match selection::selected_ancestor(selected, &path) {
                Some(anc) => self.loaded_children_of(&anc),
                None => Vec::new(),
            };
            Self::toggle_node(selected, &path, &kids);
        }
        if let Some((parent, dir)) = page_at {
            let (chunk, total) = self
                .chunks
                .get(&parent)
                .map(|c| (c.chunk, c.total))
                .unwrap_or((0, 0));
            let pages = (total + CHILD_CHUNK - 1) / CHILD_CHUNK.max(1);
            let next = (chunk as i64 + dir).clamp(0, pages.max(1) as i64 - 1) as usize;
            if next != chunk && !self.loading.contains(&parent) {
                self.fetch_chunk(store, &parent, next);
            }
        }
        // Typeahead: next visible name with the typed prefix (500ms buffer).
        let typed: String = ui.input(|i| {
            i.events
                .iter()
                .filter_map(|ev| match ev {
                    egui::Event::Text(s) if s.len() == 1 && !s.starts_with(' ') => Some(s.clone()),
                    _ => None,
                })
                .collect()
        });
        if !typed.is_empty() {
            let now = ui.input(|i| i.time);
            if now - self.typeahead_at > TYPEAHEAD_SECS {
                self.typeahead.clear();
            }
            self.typeahead.push_str(&typed.to_lowercase());
            self.typeahead_at = now;
            let needle = self.typeahead.clone();
            for step in 1..=flat.len() {
                let i = (cur + step) % flat.len();
                if let Some(n) = self.resolve(keys, &flat[i]) {
                    if selection::display_name(&n.path)
                        .to_lowercase()
                        .starts_with(&needle)
                    {
                        want = Some(i);
                        break;
                    }
                }
            }
        }
        if want != self.focus {
            self.focus = want;
            self.need_scroll = true;
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn render_row(
        &mut self,
        ui: &mut egui::Ui,
        store: &ListingStore,
        selected: &mut HashSet<String>,
        flat: &[FlatRow],
        keys: &[String],
        idx: usize,
        t: &QzTheme,
        lang: Lang,
        tree_id: egui::Id,
    ) {
        let row = &flat[idx];
        let w = ui.available_width();
        let (rect, resp) = ui.allocate_exact_size(egui::vec2(w, ROW_H), egui::Sense::click());
        let focused = self.focus == Some(idx);
        let scroll_here = focused && self.need_scroll;
        match row {
            FlatRow::Node { .. } => {
                let Some(n) = self.resolve(keys, row) else {
                    return;
                };
                let state = selection::node_state(selected, &n.path);
                if state != selection::NodeState::Unchecked {
                    ui.painter().rect_filled(rect, 0.0, t.primary_soft);
                }
                if focused {
                    ui.painter().rect_stroke(
                        rect,
                        0.0,
                        egui::Stroke::new(1.0, t.primary.linear_multiply(0.5)),
                        egui::StrokeKind::Inside,
                    );
                }
                // Guides: vertical continuations + the row's own elbow.
                let guides = match row {
                    FlatRow::Node { guides, .. } => guides.clone(),
                    _ => Vec::new(),
                };
                let base_x = rect.min.x + 10.0 + 40.0 + 80.0;
                let p = ui.painter_at(rect);
                for i in 0..n.depth {
                    if guides.get(i).copied().unwrap_or(false) {
                        let x = base_x + i as f32 * GUIDE_CELL + GUIDE_CELL / 2.0;
                        p.line_segment(
                            [egui::pos2(x, rect.min.y), egui::pos2(x, rect.max.y)],
                            egui::Stroke::new(1.0, t.faint.linear_multiply(0.6)),
                        );
                    }
                }
                {
                    let x = base_x + n.depth as f32 * GUIDE_CELL + GUIDE_CELL / 2.0;
                    let mid = rect.center().y;
                    p.line_segment(
                        [egui::pos2(x, rect.min.y), egui::pos2(x, mid)],
                        egui::Stroke::new(1.0, t.faint.linear_multiply(0.6)),
                    );
                    p.line_segment(
                        [egui::pos2(x, mid), egui::pos2(x + GUIDE_CELL / 2.0, mid)],
                        egui::Stroke::new(1.0, t.faint.linear_multiply(0.6)),
                    );
                }
                let mut do_expand = false;
                let mut do_select = false;
                ui.scope_builder(egui::UiBuilder::new().max_rect(rect), |ui| {
                    ui.horizontal(|ui| {
                        ui.spacing_mut().item_spacing = egui::vec2(0.0, 0.0);
                        ui.add_space(10.0);
                        if widgets::checkbox_box(ui, state, t).clicked() {
                            do_select = true;
                        }
                        ui.allocate_ui(egui::vec2(80.0, ROW_H), |ui| {
                            ui.centered_and_justified(|ui| {
                                ui.label(
                                    egui::RichText::new(format!("{}", n.index + 1))
                                        .size(13.0)
                                        .color(t.faint),
                                );
                            });
                        });
                        ui.add_space(n.depth as f32 * GUIDE_CELL + GUIDE_CELL);
                        if n.is_folder {
                            let open = self.expanded.contains(&n.path);
                            let (r, _) = ui
                                .allocate_exact_size(egui::vec2(24.0, ROW_H), egui::Sense::click());
                            let c = r.center();
                            let s = egui::Stroke::new(1.5, t.faint);
                            let pp = ui.painter_at(r);
                            if open {
                                pp.line_segment(
                                    [c + egui::vec2(-4.0, -2.0), c + egui::vec2(0.0, 2.0)],
                                    s,
                                );
                                pp.line_segment(
                                    [c + egui::vec2(0.0, 2.0), c + egui::vec2(4.0, -2.0)],
                                    s,
                                );
                            } else {
                                pp.line_segment(
                                    [c + egui::vec2(-2.0, -4.0), c + egui::vec2(2.0, 0.0)],
                                    s,
                                );
                                pp.line_segment(
                                    [c + egui::vec2(2.0, 0.0), c + egui::vec2(-2.0, 4.0)],
                                    s,
                                );
                            }
                            if ui.input(|i| i.pointer.primary_clicked())
                                && ui
                                    .input(|i| i.pointer.hover_pos())
                                    .map(|pos| r.contains(pos))
                                    .unwrap_or(false)
                            {
                                do_expand = true;
                            }
                        } else {
                            ui.add_space(24.0);
                        }
                        // Kind mark: filled tab for folders, orange for
                        // archives/disks, outline for everything else.
                        let kind = file_kind::file_kind(
                            &n.path,
                            n.is_folder,
                            &tr(lang, "filekind.folder", &[]),
                            &tr(lang, "filekind.file", &[]),
                        );
                        {
                            let (r, _) = ui
                                .allocate_exact_size(egui::vec2(24.0, ROW_H), egui::Sense::hover());
                            let pp = ui.painter_at(r);
                            let mark =
                                egui::Rect::from_center_size(r.center(), egui::vec2(13.0, 11.0));
                            use file_kind::Kind as K;
                            let filled = matches!(kind.kind, K::Folder | K::Archive | K::Disk);
                            let (fill, edge) = match kind.kind {
                                K::Folder => (t.info_soft, t.info_dot),
                                K::Archive | K::Disk => (t.warning_soft, t.warning_dot),
                                _ => (egui::Color32::TRANSPARENT, t.muted),
                            };
                            if filled {
                                pp.rect_filled(mark, 2.0, fill);
                            }
                            pp.rect_stroke(
                                mark,
                                2.0,
                                egui::Stroke::new(1.0, edge),
                                egui::StrokeKind::Inside,
                            );
                        }
                        let count = if n.is_folder {
                            match self.counts.get(&n.path) {
                                Some(1) => {
                                    format!("  {}", tr(lang, "tree.itemOne", &[]))
                                }
                                Some(c) => format!(
                                    "  {}",
                                    tr(
                                        lang,
                                        "tree.itemsOther",
                                        &[("count", &fmt::format_count(*c as u64, lang))]
                                    )
                                ),
                                None => String::new(),
                            }
                        } else {
                            String::new()
                        };
                        let name_w = (w
                            - 10.0
                            - 40.0
                            - 80.0
                            - (n.depth as f32 * GUIDE_CELL + GUIDE_CELL)
                            - 24.0
                            - 24.0
                            - 96.0
                            - 128.0
                            - 256.0)
                            .max(40.0);
                        ui.allocate_ui(egui::vec2(name_w, ROW_H), |ui| {
                            ui.horizontal(|ui| {
                                ui.add(
                                    egui::Label::new(
                                        egui::RichText::new(selection::display_name(&n.path))
                                            .size(13.0)
                                            .color(t.text),
                                    )
                                    .truncate(),
                                );
                                if !count.is_empty() {
                                    ui.label(egui::RichText::new(count).size(12.0).color(t.faint));
                                }
                            });
                        });
                        let kind_label = file_kind::file_kind(
                            &n.path,
                            n.is_folder,
                            &tr(lang, "filekind.folder", &[]),
                            &tr(lang, "filekind.file", &[]),
                        )
                        .label;
                        ui.allocate_ui(egui::vec2(96.0, ROW_H), |ui| {
                            ui.centered_and_justified(|ui| {
                                ui.add(
                                    egui::Label::new(
                                        egui::RichText::new(kind_label).size(13.0).color(t.muted),
                                    )
                                    .truncate(),
                                );
                            });
                        });
                        ui.allocate_ui(egui::vec2(128.0, ROW_H), |ui| {
                            ui.centered_and_justified(|ui| {
                                ui.label(
                                    egui::RichText::new(if n.is_folder {
                                        "—".to_string()
                                    } else {
                                        match n.size {
                                            Some(s) => fmt::format_size(s as i128),
                                            None => "—".to_string(),
                                        }
                                    })
                                    .size(13.0)
                                    .color(t.text),
                                );
                            });
                        });
                        ui.allocate_ui(egui::vec2(256.0, ROW_H), |ui| {
                            ui.centered_and_justified(|ui| {
                                ui.add(
                                    egui::Label::new(
                                        egui::RichText::new(fmt::format_modified(
                                            n.modified.as_deref(),
                                            lang,
                                        ))
                                        .size(13.0)
                                        .color(t.muted),
                                    )
                                    .truncate(),
                                );
                            });
                        });
                    });
                });
                if resp.clicked() {
                    self.focus = Some(idx);
                    self.need_scroll = false;
                    ui.memory_mut(|m| m.request_focus(tree_id));
                }
                if do_select {
                    let kids = match selection::selected_ancestor(selected, &n.path) {
                        Some(anc) => self.loaded_children_of(&anc),
                        None => Vec::new(),
                    };
                    Self::toggle_node(selected, &n.path, &kids);
                    self.focus = Some(idx);
                }
                if do_expand {
                    self.toggle_expand(store, &n.path);
                    self.focus = Some(idx);
                }
            }
            FlatRow::Pager { parent, depth, .. } => {
                let (chunk, total) = self
                    .chunks
                    .get(parent)
                    .map(|c| (c.chunk, c.total))
                    .unwrap_or((0, 0));
                let pages = (total + CHILD_CHUNK - 1) / CHILD_CHUNK.max(1);
                let busy = self.loading.contains(parent);
                let start = chunk * CHILD_CHUNK + 1;
                let end = ((chunk + 1) * CHILD_CHUNK).min(total);
                let label = tr(
                    lang,
                    "tree.chunkOf",
                    &[
                        ("start", &fmt::format_count(start as u64, lang)),
                        ("end", &fmt::format_count(end as u64, lang)),
                        ("total", &fmt::format_count(total as u64, lang)),
                    ],
                );
                let mut go: Option<usize> = None;
                ui.scope_builder(egui::UiBuilder::new().max_rect(rect), |ui| {
                    ui.horizontal(|ui| {
                        ui.add_space(*depth as f32 * GUIDE_CELL + 50.0);
                        ui.add_enabled_ui(chunk > 0 && !busy, |ui| {
                            if ui.add(egui::Button::new("<").frame(false)).clicked() {
                                go = Some(chunk.saturating_sub(1));
                            }
                        });
                        ui.label(egui::RichText::new(label).size(12.0).color(t.muted));
                        ui.add_enabled_ui(chunk + 1 < pages && !busy, |ui| {
                            if ui.add(egui::Button::new(">").frame(false)).clicked() {
                                go = Some(chunk + 1);
                            }
                        });
                    });
                });
                if resp.clicked() {
                    self.focus = Some(idx);
                    ui.memory_mut(|m| m.request_focus(tree_id));
                }
                if let Some(next) = go {
                    self.fetch_chunk(store, parent, next);
                    self.focus = Some(idx);
                }
            }
            FlatRow::Loading { depth, .. } => {
                ui.scope_builder(egui::UiBuilder::new().max_rect(rect), |ui| {
                    ui.horizontal(|ui| {
                        ui.add_space(10.0 + 40.0 + 80.0 + *depth as f32 * GUIDE_CELL + 48.0);
                        widgets::skeleton_bars(ui, t, &[160.0, 48.0, 56.0]);
                    });
                });
            }
            FlatRow::Empty { depth, .. } => {
                ui.scope_builder(egui::UiBuilder::new().max_rect(rect), |ui| {
                    ui.horizontal(|ui| {
                        ui.add_space(10.0 + 40.0 + 80.0 + *depth as f32 * GUIDE_CELL + 48.0);
                        ui.label(
                            egui::RichText::new(tr(lang, "tree.emptyFolder", &[]))
                                .size(12.0)
                                .color(t.faint),
                        );
                    });
                });
            }
        }
        if scroll_here {
            ui.scroll_to_rect(rect, Some(egui::Align::Center));
            self.need_scroll = false;
        }
    }
}
