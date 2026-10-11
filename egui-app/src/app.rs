//! QuarkZip shell ported from `src/App.tsx`: title strip, overview card,
//! tree, footer, dialog stack, worker polling, drag-and-drop. The renderer
//! holds tree chunks only; the full listing lives in `engine::ListingStore`.

use crate::{
    archive,
    engine::{self, ChecksumEvent, ExtractEvent, ListEvent, TestEvent},
    i18n::{t as tr, Lang},
    prefs,
    theme::{resolve, theme_for, Accent, QzTheme, ThemeChoice},
    tree::TreeView,
    widgets,
};
use eframe::egui;
use std::collections::HashSet;
use std::sync::mpsc::Receiver;
use std::time::Instant;

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum LoadPhase {
    Listing,
    Details,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum ExtractMode {
    Selected,
    All,
    Empty,
}

#[derive(Clone)]
pub struct ExtractResult {
    pub ok: bool,
    pub file_count: usize,
    pub message: String,
    pub dest: String,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum PwMode {
    Open,
    Extract,
    Test,
}

#[derive(Clone)]
pub enum PwPhase {
    Idle,
    Checking(u32),
    Verified,
    Wrong,
    Error(String),
}

#[derive(Clone)]
pub enum CheckPhase {
    Idle,
    Running(u32),
    Done(String),
    Cancelled,
    Error(String),
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum PermMode {
    Extract,
    Test,
}

pub struct QuarkApp {
    pub theme_choice: ThemeChoice,
    pub accent: Accent,
    pub lang: Lang,
    pub collapsed: bool,
    pub dark: bool,
    pub theme: QzTheme,
    system_check_at: Instant,
    pub store: Option<engine::ListingStore>,
    pub info: Option<archive::ArchiveInfo>,
    pub error: Option<String>,
    pub opening: Option<String>,
    opening_password: Option<String>,
    pub list_handle: Option<engine::ListHandle>,
    pub load_entries: u64,
    pub load_phase: LoadPhase,
    pub load_start: Instant,
    pub tree: TreeView,
    pub selected: HashSet<String>,
    pub dest: String,
    pub extracting: bool,
    pub extract_rx: Option<Receiver<ExtractEvent>>,
    pub confirming: Option<ExtractMode>,
    pub pending_extract: Option<(ExtractMode, String)>,
    pub done_info: Option<ExtractResult>,
    pub ex_create_folder: bool,
    pub ex_name: String,
    pub ex_stamp: Option<String>,
    pub ex_last_probe: Option<String>,
    pub ex_exists: Option<bool>,
    pub about_open: bool,
    pub test_open: bool,
    pub test_rx: Option<Receiver<TestEvent>>,
    pub test_pct: u32,
    pub test_done: Option<Result<(), String>>,
    pub archive_password: Option<String>,
    pub checksum_open: bool,
    pub cs_algo: engine::ChecksumAlgo,
    pub cs_expected: String,
    pub cs_rx: Option<Receiver<ChecksumEvent>>,
    pub cs_cancel: Option<std::sync::Arc<std::sync::atomic::AtomicBool>>,
    pub cs_phase: CheckPhase,
    pub pw_open: bool,
    pub pw_path: Option<String>,
    pub pw_mode: PwMode,
    pub pw_text: String,
    pub pw_show: bool,
    pub pw_phase: PwPhase,
    pub pw_attempts: u32,
    pub pw_rx: Option<Receiver<TestEvent>>,
    pub permission: Option<(PermMode, String)>,
    pub theme_open: bool,
    pub lang_open: bool,
    pub show_extra: bool,
    pub want_open: bool,
    last_titled: Option<String>,
}

impl QuarkApp {
    pub fn new(ctx: &egui::Context) -> Self {
        let prefs = prefs::load();
        let system_dark = matches!(dark_light::detect(), Ok(dark_light::Mode::Dark));
        let dark = resolve(prefs.theme, system_dark);
        let theme = theme_for(dark, prefs.accent);
        ctx.set_visuals(crate::theme::visuals(&theme));
        Self {
            theme_choice: prefs.theme,
            accent: prefs.accent,
            lang: prefs.lang,
            collapsed: prefs.collapsed,
            dark,
            theme,
            system_check_at: Instant::now(),
            store: None,
            info: None,
            error: None,
            opening: None,
            opening_password: None,
            list_handle: None,
            load_entries: 0,
            load_phase: LoadPhase::Listing,
            load_start: Instant::now(),
            tree: TreeView::new(),
            selected: HashSet::new(),
            dest: String::new(),
            extracting: false,
            extract_rx: None,
            confirming: None,
            pending_extract: None,
            done_info: None,
            ex_create_folder: false,
            ex_name: String::new(),
            ex_stamp: None,
            ex_last_probe: None,
            ex_exists: None,
            about_open: false,
            test_open: false,
            test_rx: None,
            test_pct: 0,
            test_done: None,
            archive_password: None,
            checksum_open: false,
            cs_algo: engine::ChecksumAlgo::Sha256,
            cs_expected: String::new(),
            cs_rx: None,
            cs_cancel: None,
            cs_phase: CheckPhase::Idle,
            pw_open: false,
            pw_path: None,
            pw_mode: PwMode::Open,
            pw_text: String::new(),
            pw_show: false,
            pw_phase: PwPhase::Idle,
            pw_attempts: 0,
            pw_rx: None,
            permission: None,
            theme_open: false,
            lang_open: false,
            show_extra: false,
            want_open: false,
            last_titled: None,
        }
    }

    pub fn loading(&self) -> bool {
        self.list_handle.is_some()
    }

    pub fn save_prefs(&self) {
        prefs::save(&prefs::Prefs {
            theme: self.theme_choice,
            accent: self.accent,
            lang: self.lang,
            collapsed: self.collapsed,
        });
    }

    pub fn retheme(&mut self, ctx: &egui::Context) {
        self.theme = theme_for(self.dark, self.accent);
        ctx.set_visuals(crate::theme::visuals(&self.theme));
    }

    pub fn set_theme(&mut self, choice: ThemeChoice) {
        self.theme_choice = choice;
        self.dark = resolve(choice, self.dark);
        self.save_prefs();
    }

    pub fn set_accent(&mut self, accent: Accent) {
        self.accent = accent;
        self.save_prefs();
    }

    pub fn set_lang(&mut self, lang: Lang) {
        self.lang = lang;
        self.save_prefs();
    }

    pub fn set_collapsed(&mut self, collapsed: bool) {
        self.collapsed = collapsed;
        self.save_prefs();
    }

    pub fn set_confirming(&mut self, mode: ExtractMode) {
        self.confirming = Some(mode);
        self.ex_create_folder = false;
        self.ex_name = self
            .store
            .as_ref()
            .map(|s| archive::default_folder_name(&s.path))
            .unwrap_or_default();
        self.ex_stamp = None;
        self.ex_last_probe = None;
        self.ex_exists = None;
    }

    // ——— open flow ———

    pub fn list_path(&mut self, path: String, password: Option<String>) {
        self.opening_password = password.clone();
        self.list_handle = Some(engine::spawn_list(path.clone(), password));
        self.opening = Some(path);
        self.load_entries = 0;
        self.load_phase = LoadPhase::Listing;
        self.load_start = Instant::now();
        self.error = None;
        self.done_info = None;
    }

    pub fn cancel_loading(&mut self) {
        if let Some(h) = self.list_handle.take() {
            h.cancel.store(true, std::sync::atomic::Ordering::SeqCst);
        }
        self.opening = None;
    }

    pub fn finish_list(&mut self, res: Result<engine::ListingStore, String>) {
        let opening = self.opening.clone();
        self.list_handle = None;
        self.opening = None;
        match res {
            Ok(store) => {
                self.load_phase = LoadPhase::Details;
                self.info = Some(store.info());
                self.dest = engine::default_dest(&store.path);
                self.store = Some(store);
                self.tree.reset();
                self.selected.clear();
                self.archive_password = self.opening_password.clone();
                self.show_extra = false;
                self.error = None;
            }
            Err(message) => {
                if engine::is_password_error(&message) {
                    if let Some(path) = opening {
                        self.ask_password(path, PwMode::Open);
                    } else {
                        self.error = Some(message);
                    }
                } else {
                    self.error = Some(message);
                    self.store = None;
                    self.info = None;
                    self.archive_password = None;
                    self.dest = String::new();
                    self.tree.reset();
                    self.selected.clear();
                }
            }
        }
    }

    /// `open_path` keeps the failing path across the async gap (the
    /// `opening` field is cleared before the result arrives).
    pub fn list_path_with_recovery(&mut self, path: String, password: Option<String>) {
        self.list_path(path, password);
    }

    pub fn ask_password(&mut self, path: String, mode: PwMode) {
        self.pw_open = true;
        self.pw_path = Some(path);
        self.pw_mode = mode;
        self.pw_text = String::new();
        self.pw_show = false;
        self.pw_phase = PwPhase::Idle;
        self.pw_attempts = 0;
        self.pw_rx = None;
    }

    pub fn close_password_gate(&mut self) {
        self.pw_open = false;
        self.pw_path = None;
        self.pw_rx = None;
        self.pw_phase = PwPhase::Idle;
    }

    pub fn pw_accept_label(&self) -> String {
        match self.pw_mode {
            PwMode::Extract => tr(self.lang, "app.extract", &[]),
            PwMode::Test => tr(self.lang, "overview.test", &[]),
            PwMode::Open => tr(self.lang, "password.open", &[]),
        }
    }

    pub fn check_password(&mut self) {
        if let Some(path) = self.pw_path.clone() {
            let pw = self.pw_text.clone();
            self.pw_phase = PwPhase::Checking(0);
            self.pw_rx = Some(engine::spawn_test(path, Some(pw)));
        }
    }

    pub fn accept_password(&mut self, path: String, password: String) {
        self.close_password_gate();
        match self.pw_mode {
            PwMode::Extract => {
                self.archive_password = Some(password.clone());
                let (mode, dest) = self
                    .pending_extract
                    .clone()
                    .unwrap_or((ExtractMode::All, self.dest.clone()));
                self.start_extract(mode, &dest, Some(password));
            }
            PwMode::Test => {
                self.archive_password = Some(password);
                self.test_open = true;
                self.test_start();
            }
            PwMode::Open => {
                // `opening` was cleared; open explicitly with the password.
                self.list_path_with_recovery(path, Some(password));
            }
        }
    }

    // ——— extract ———

    pub fn start_extract(&mut self, mode: ExtractMode, dest: &str, password: Option<String>) {
        let Some(store) = &self.store else {
            return;
        };
        if dest.is_empty() || self.extracting || store.total() == 0 {
            return;
        }
        let total = store.total();
        let select_all = mode != ExtractMode::Selected
            || self.selected.is_empty()
            || self.selected.len() >= total;
        let files: Vec<String> = if select_all {
            Vec::new()
        } else {
            self.selected.iter().cloned().collect()
        };
        let count = if select_all { total } else { files.len() };
        let pw = password.or_else(|| self.archive_password.clone());
        self.pending_extract = Some((mode, dest.to_string()));
        self.extracting = true;
        self.extract_rx = Some(engine::spawn_extract(
            store.path.clone(),
            dest.to_string(),
            files,
            pw,
        ));
        let _ = count;
    }

    pub fn finish_extract(&mut self, res: Result<u64, String>, selective: bool, dest: String) {
        self.extracting = false;
        self.extract_rx = None;
        match res {
            Ok(written) => {
                if written == 0 && selective {
                    self.done_info = Some(ExtractResult {
                        ok: false,
                        file_count: 0,
                        message: "No files to process — nothing matched the selection.".to_string(),
                        dest,
                    });
                } else {
                    let count = if selective {
                        written as usize
                    } else {
                        self.store.as_ref().map(|s| s.total()).unwrap_or(0)
                    };
                    self.done_info = Some(ExtractResult {
                        ok: true,
                        file_count: count,
                        message: String::new(),
                        dest,
                    });
                }
            }
            Err(message) => {
                if engine::is_password_error(&message) && self.archive_password.is_none() {
                    if let Some(store) = &self.store {
                        self.ask_password(store.path.clone(), PwMode::Extract);
                    }
                } else if engine::is_permission_error(&message) {
                    self.permission = Some((PermMode::Extract, dest));
                } else {
                    self.done_info = Some(ExtractResult {
                        ok: false,
                        file_count: 0,
                        message,
                        dest,
                    });
                }
            }
        }
    }

    // ——— test ———

    pub fn test_start(&mut self) {
        if let Some(store) = &self.store {
            self.test_done = None;
            self.test_pct = 0;
            self.test_rx = Some(engine::spawn_test(
                store.path.clone(),
                self.archive_password.clone(),
            ));
        }
    }

    // ——— checksum ———

    pub fn start_checksum(&mut self) {
        if let Some(store) = &self.store {
            let handle = engine::spawn_checksum(store.path.clone(), self.cs_algo);
            self.cs_rx = Some(handle.rx);
            self.cs_cancel = Some(handle.cancel);
            self.cs_phase = CheckPhase::Running(0);
        }
    }

    pub fn cancel_checksum(&mut self) {
        if let Some(flag) = self.cs_cancel.take() {
            flag.store(true, std::sync::atomic::Ordering::SeqCst);
        }
    }

    pub fn close_checksum(&mut self) {
        self.cancel_checksum();
        self.checksum_open = false;
        self.cs_rx = None;
        self.cs_phase = CheckPhase::Idle;
    }

    // ——— worker polling ———

    pub fn poll_workers(&mut self) {
        // List.
        let mut list_done = None;
        if let Some(h) = &self.list_handle {
            while let Ok(ev) = h.rx.try_recv() {
                match ev {
                    ListEvent::Progress(n) => self.load_entries = n,
                    ListEvent::Done(res) => {
                        list_done = Some(res);
                        break;
                    }
                }
            }
        }
        if let Some(res) = list_done {
            // A cancel drops the handle (above), so late results can never
            // arrive — the previous listing stays intact by construction.
            self.finish_list(res);
        }
        // Extract.
        let mut extract_done = None;
        if let Some(rx) = &self.extract_rx {
            while let Ok(ev) = rx.try_recv() {
                let ExtractEvent::Done(res) = ev;
                extract_done = Some(res);
                break;
            }
        }
        if let Some(res) = extract_done {
            let (selective, dest) = self
                .pending_extract
                .clone()
                .map(|(m, d)| (m == ExtractMode::Selected && !self.selected.is_empty(), d))
                .unwrap_or((false, self.dest.clone()));
            self.finish_extract(res, selective, dest);
        }
        // Test dialog worker.
        let mut test_done = None;
        if let Some(rx) = &self.test_rx {
            while let Ok(ev) = rx.try_recv() {
                match ev {
                    TestEvent::Pct(p) => {
                        self.test_pct = p;
                        if self.pw_open {
                            self.pw_phase = PwPhase::Checking(p);
                        }
                    }
                    TestEvent::Done(res) => {
                        test_done = Some(res);
                        break;
                    }
                }
            }
        }
        if let Some(res) = test_done {
            self.test_rx = None;
            if self.pw_open {
                // Password verification verdict.
                match res {
                    Ok(()) => self.pw_phase = PwPhase::Verified,
                    Err(message) => {
                        if engine::is_password_error(&message) {
                            self.pw_attempts += 1;
                            self.pw_phase = PwPhase::Wrong;
                        } else {
                            self.pw_phase = PwPhase::Error(message);
                        }
                    }
                }
                self.pw_rx = None;
            } else if self.test_open {
                match res {
                    Ok(()) => self.test_done = Some(Ok(())),
                    Err(message) => {
                        if self.archive_password.is_none() && engine::is_password_error(&message) {
                            self.test_open = false;
                            self.test_done = None;
                            if let Some(store) = &self.store {
                                self.ask_password(store.path.clone(), PwMode::Test);
                            }
                        } else if engine::is_permission_error(&message) {
                            self.test_open = false;
                            self.test_done = None;
                            if let Some(store) = &self.store {
                                self.permission = Some((PermMode::Test, store.path.clone()));
                            }
                        } else {
                            self.test_done = Some(Err(message));
                        }
                    }
                }
            }
        }
        // Checksum worker.
        let mut check_done = None;
        if let Some(rx) = &self.cs_rx {
            while let Ok(ev) = rx.try_recv() {
                match ev {
                    ChecksumEvent::Pct(p) => {
                        if matches!(self.cs_phase, CheckPhase::Running(_)) {
                            self.cs_phase = CheckPhase::Running(p);
                        }
                    }
                    ChecksumEvent::Done(res) => {
                        check_done = Some(res);
                        break;
                    }
                }
            }
        }
        if let Some(res) = check_done {
            self.cs_rx = None;
            self.cs_cancel = None;
            match res {
                Ok(digest) => self.cs_phase = CheckPhase::Done(digest),
                Err(message) => {
                    if message == "cancelled" {
                        self.cs_phase = CheckPhase::Cancelled;
                    } else {
                        self.cs_phase = CheckPhase::Error(message);
                    }
                }
            }
        }
    }

    pub fn busy(&self) -> bool {
        self.loading() || self.extracting || self.test_open || self.checksum_open || self.pw_open
    }
}

impl QuarkApp {
    /// 92px mac title strip: 76px light inset left, Open right (archive
    /// only), title absolutely centered via a non-interactive overlay.
    pub fn titlebar(&mut self, ui: &mut egui::Ui, strip_w: f32) {
        let t = self.theme;
        let lang = self.lang;
        let has_archive = self.store.is_some();
        // Overlay title first (buttons paint above it, keep their clicks).
        if let Some(path) = self.store.as_ref().map(|s| s.path.clone()) {
            let max_w = (strip_w - 76.0 - 170.0).max(120.0);
            let (dir, file) = match path.rfind(['/', '\\']) {
                Some(i) => (path[..=i].to_string(), path[i + 1..].to_string()),
                None => (path.clone(), String::new()),
            };
            let prefix = "QuarkZip | ";
            let prefix_w = measure(ui, prefix, 13.0);
            let file_w = measure(ui, &file, 13.0);
            let dir_budget = (max_w - prefix_w - file_w - 16.0).max(40.0);
            let dir_shown = middle_fit(ui, &dir, dir_budget);
            let title_w = prefix_w + measure(ui, &dir_shown, 13.0) + file_w + 16.0;
            let subtitle = tr(lang, "titlebar.readonlyHint", &[]);
            egui::Area::new(egui::Id::new("qz-title"))
                .order(egui::Order::Middle)
                .fixed_pos(egui::pos2(0.0, 0.0))
                .show(ui.ctx(), |ui| {
                    ui.allocate_ui(egui::vec2(strip_w, 92.0), |ui| {
                        ui.vertical(|ui| {
                            ui.add_space(30.0);
                            ui.horizontal(|ui| {
                                ui.add_space(((strip_w - title_w).max(0.0)) / 2.0);
                                ui.label(
                                    egui::RichText::new(prefix)
                                        .size(13.0)
                                        .strong()
                                        .color(t.glass_text),
                                );
                                ui.add(
                                    egui::Label::new(
                                        egui::RichText::new(dir_shown)
                                            .size(13.0)
                                            .color(t.glass_muted),
                                    )
                                    .truncate(),
                                );
                                ui.label(egui::RichText::new(file).size(13.0).color(t.glass_muted));
                            });
                            ui.vertical_centered(|ui| {
                                ui.add(
                                    egui::Label::new(
                                        egui::RichText::new(subtitle)
                                            .size(10.0)
                                            .italics()
                                            .color(t.glass_muted),
                                    )
                                    .truncate(),
                                );
                            });
                        });
                    });
                });
        } else {
            egui::Area::new(egui::Id::new("qz-title"))
                .order(egui::Order::Middle)
                .fixed_pos(egui::pos2(0.0, 0.0))
                .show(ui.ctx(), |ui| {
                    ui.allocate_ui(egui::vec2(strip_w, 92.0), |ui| {
                        ui.vertical(|ui| {
                            ui.add_space(30.0);
                            ui.vertical_centered(|ui| {
                                ui.label(
                                    egui::RichText::new("QuarkZip")
                                        .size(13.0)
                                        .strong()
                                        .color(t.glass_text),
                                );
                            });
                        });
                    });
                });
        }
        // Button row above the overlay.
        ui.horizontal(|ui| {
            ui.set_min_height(92.0);
            ui.add_space(76.0);
            ui.add_space(ui.available_width());
            if has_archive {
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    ui.add_space(28.0);
                    ui.add_enabled_ui(!self.loading(), |ui| {
                        if widgets::tint_button(ui, &tr(lang, "app.openNew", &[]), &t, t.open)
                            .clicked()
                        {
                            self.want_open = true;
                        }
                    });
                });
            }
        });
    }

    pub fn footer(&mut self, ui: &mut egui::Ui) {
        let Some(store) = self.store.as_ref() else {
            return;
        };
        let total = store.total();
        let t = self.theme;
        let lang = self.lang;
        let busy = self.extracting;
        let can_go = !self.dest.is_empty() && !busy && total > 0;
        ui.horizontal(|ui| {
            ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
            ui.add_enabled_ui(can_go, |ui| {
                let label = if busy {
                    tr(lang, "app.extracting", &[])
                } else {
                    tr(lang, "app.extractSelected", &[])
                };
                if widgets::primary_button(ui, &label, &t).clicked() {
                    self.set_confirming(if self.selected.is_empty() {
                        ExtractMode::Empty
                    } else {
                        ExtractMode::Selected
                    });
                }
            });
            ui.add_enabled_ui(can_go, |ui| {
                if widgets::success_button(ui, &tr(lang, "app.extractAll", &[]), &t).clicked() {
                    self.set_confirming(ExtractMode::All);
                }
            });
            // Destination chooser absorbs every spare pixel, truncates.
            let dest_label = if self.dest.is_empty() {
                tr(lang, "app.chooseFolder", &[])
            } else {
                middle_chars(&self.dest, 56)
            };
            if widgets::secondary_button(ui, &dest_label, &t).clicked() {
                if let Some(dir) = engine::pick_folder() {
                    self.dest = dir;
                    self.done_info = None;
                }
            }
        });
    }
}

fn measure(ui: &egui::Ui, text: &str, size: f32) -> f32 {
    ui.ctx().fonts_mut(|f| {
        f.layout_no_wrap(
            text.to_string(),
            egui::FontId::proportional(size),
            egui::Color32::WHITE,
        )
        .size()
        .x
    })
}

/// Middle-truncate `dir` to fit `budget` px (file name always survives —
/// the caller budgets separately).
fn middle_fit(ui: &egui::Ui, dir: &str, budget: f32) -> String {
    if measure(ui, dir, 13.0) <= budget || dir.len() <= 8 {
        return dir.to_string();
    }
    let chars: Vec<char> = dir.chars().collect();
    let mut lo = 4;
    let mut hi = chars.len();
    while lo < hi {
        let mid = (lo + hi + 1) / 2;
        let head = chars[..mid / 2].iter().collect::<String>();
        let tail = chars[chars.len() - (mid - mid / 2)..]
            .iter()
            .collect::<String>();
        if measure(ui, &format!("{head}…{tail}"), 13.0) <= budget {
            lo = mid;
        } else {
            hi = mid - 1;
        }
    }
    let head = chars[..lo / 2].iter().collect::<String>();
    let tail = chars[chars.len() - (lo - lo / 2)..]
        .iter()
        .collect::<String>();
    format!("{head}…{tail}")
}

/// Char-count middle truncate for the dest label.
fn middle_chars(s: &str, budget: usize) -> String {
    let chars: Vec<char> = s.chars().collect();
    if chars.len() <= budget {
        return s.to_string();
    }
    let head = chars[..20].iter().collect::<String>();
    let tail = chars[chars.len() - 20..].iter().collect::<String>();
    format!("{head}…{tail}")
}

impl eframe::App for QuarkApp {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        let ctx = ui.ctx().clone();
        let ctx = &ctx;
        // System theme follows the OS in "system" mode (2s poll).
        if self.theme_choice == crate::theme::ThemeChoice::System
            && self.system_check_at.elapsed().as_secs() >= 2
        {
            self.system_check_at = std::time::Instant::now();
            let dark = matches!(dark_light::detect(), Ok(dark_light::Mode::Dark));
            if dark != self.dark {
                self.dark = dark;
                self.retheme(ctx);
            }
        }
        self.poll_workers();

        if self.want_open {
            self.want_open = false;
            if let Some(path) = engine::pick_archive() {
                self.list_path_with_recovery(path, None);
            }
        }

        // Drag-and-drop open: hover frame + drop lists the first file.
        let dropped: Vec<std::path::PathBuf> = ctx.input(|i| {
            i.raw
                .dropped_files
                .iter()
                .filter_map(|f| {
                    let p = f.path().to_path_buf();
                    if p.is_file() {
                        Some(p)
                    } else {
                        None
                    }
                })
                .collect()
        });
        if let Some(first) = dropped.first() {
            self.list_path_with_recovery(first.to_string_lossy().into_owned(), None);
        }
        let dragging = ctx.input(|i| !i.raw.hovered_files.is_empty());

        // OS window title follows the archive.
        let titled = self.store.as_ref().map(|s| s.path.clone());
        if titled != self.last_titled {
            self.last_titled = titled.clone();
            ctx.send_viewport_cmd(egui::ViewportCommand::Title(match titled {
                Some(p) => format!("QuarkZip | {p}"),
                None => "QuarkZip".to_string(),
            }));
        }

        // Frame wash (macOS glass reads through the alpha).
        egui::CentralPanel::default()
            .frame(egui::Frame {
                fill: self.theme.frame_bg,
                ..Default::default()
            })
            .show(ui, |ui| {
                let strip_w = ui.available_width();
                self.titlebar(ui, strip_w);
                ui.horizontal(|ui| {
                    ui.add_space(28.0);
                    ui.vertical(|ui| {
                        ui.set_width(ui.available_width());
                        if let Some(err) = self.error.clone() {
                            ui.label(egui::RichText::new(err).size(13.0).color(self.theme.danger));
                            ui.add_space(8.0);
                        }
                        if self.store.is_some() {
                            self.overview_open(ui);
                        } else {
                            // Empty card shares the column with the tree.
                            let h = (ui.available_height() - 44.0 - 120.0).max(220.0) / 2.0;
                            ui.allocate_ui(egui::vec2(ui.available_width(), h), |ui| {
                                self.overview_empty(ui);
                            });
                        }
                        ui.add_space(28.0);
                        // Tree absorbs the rest.
                        let tree_h = (ui.available_height() - 44.0).max(120.0);
                        ui.allocate_ui(egui::vec2(ui.available_width(), tree_h), |ui| {
                            widgets::card_frame(&self.theme).show(ui, |ui| {
                                ui.set_width(ui.available_width());
                                let store = self.store.as_ref();
                                let total = store.map(|s| s.total()).unwrap_or(0);
                                // Borrow split: tree + selection + theme.
                                let (tree, selected) = (&mut self.tree, &mut self.selected);
                                let t = self.theme;
                                let lang = self.lang;
                                match store {
                                    Some(s) => tree.show(ui, Some(s), selected, &t, lang, total),
                                    None => tree.show(ui, None, selected, &t, lang, 0),
                                }
                            });
                        });
                        ui.add_space(28.0);
                        self.footer(ui);
                    });
                    ui.add_space(28.0);
                });
            });

        // Drop overlay above content, below dialogs.
        if dragging {
            let r = ctx.viewport_rect();
            egui::Area::new(egui::Id::new("qz-drop"))
                .order(egui::Order::Foreground)
                .fixed_pos(egui::pos2(12.0, 12.0))
                .show(ctx, |ui| {
                    let inner = egui::Rect::from_min_size(
                        egui::pos2(0.0, 0.0),
                        egui::vec2(r.width() - 24.0, r.height() - 24.0),
                    );
                    ui.allocate_rect(inner, egui::Sense::hover());
                    let p = ui.painter();
                    // Dotted primary frame.
                    let step = 10.0;
                    let mut x = inner.min.x;
                    while x < inner.max.x {
                        let x2 = (x + 5.0).min(inner.max.x);
                        p.line_segment(
                            [egui::pos2(x, inner.min.y), egui::pos2(x2, inner.min.y)],
                            egui::Stroke::new(1.5, self.theme.primary),
                        );
                        p.line_segment(
                            [egui::pos2(x, inner.max.y), egui::pos2(x2, inner.max.y)],
                            egui::Stroke::new(1.5, self.theme.primary),
                        );
                        x += step;
                    }
                    let mut y = inner.min.y;
                    while y < inner.max.y {
                        let y2 = (y + 5.0).min(inner.max.y);
                        p.line_segment(
                            [egui::pos2(inner.min.x, y), egui::pos2(inner.min.x, y2)],
                            egui::Stroke::new(1.5, self.theme.primary),
                        );
                        p.line_segment(
                            [egui::pos2(inner.max.x, y), egui::pos2(inner.max.x, y2)],
                            egui::Stroke::new(1.5, self.theme.primary),
                        );
                        y += step;
                    }
                    p.rect_filled(inner, 12.0, self.theme.primary.linear_multiply(0.08));
                    ui.scope_builder(egui::UiBuilder::new().max_rect(inner), |ui| {
                        ui.centered_and_justified(|ui| {
                            ui.label(
                                egui::RichText::new(tr(self.lang, "app.dropHint", &[]))
                                    .size(14.0)
                                    .strong()
                                    .color(self.theme.text),
                            );
                        });
                    });
                });
        }

        // Dialog stack (at most one open at a time by construction, except
        // Done over a closed confirm — order matches App.tsx).
        self.load_dialog(ctx);
        self.extract_dialog(ctx);
        self.done_dialog(ctx);
        self.about_dialog(ctx);
        self.test_dialog(ctx);
        self.checksum_dialog(ctx);
        self.password_dialog(ctx);
        self.permission_dialog(ctx);

        if self.busy() || self.loading() {
            ctx.request_repaint();
        }
    }
}
