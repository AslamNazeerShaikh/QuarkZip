//! Overview card ported from `src/components/ArchiveOverview.tsx`: empty
//! state with the centered Open CTA, or the 16-cell engine metadata grid +
//! More/Less + the centered integrity action row (More, Test, Checksum,
//! Theme, Language, About, collapse chevron). Theme/Language expand inline.

use crate::{
    archive::ArchiveInfo,
    fmt,
    i18n::t as tr,
    theme::{QzTheme, ThemeChoice, ACCENTS},
    widgets,
};
use eframe::egui;

fn meta_cell(ui: &mut egui::Ui, label: &str, value: &str, t: &QzTheme) {
    ui.vertical(|ui| {
        ui.spacing_mut().item_spacing = egui::vec2(0.0, 4.0);
        widgets::micro_label(ui, label, t);
        ui.add(egui::Label::new(egui::RichText::new(value).size(14.0).color(t.text)).truncate());
    });
}

fn meta_grid(ui: &mut egui::Ui, cells: Vec<(String, String)>, t: &QzTheme) {
    egui::Grid::new(format!("qz-grid-{}", cells.len()))
        .num_columns(4)
        .spacing([24.0, 16.0])
        .show(ui, |ui| {
            for (i, (label, value)) in cells.into_iter().enumerate() {
                meta_cell(ui, &label, &value, t);
                if i % 4 == 3 {
                    ui.end_row();
                }
            }
        });
}

impl crate::app::QuarkApp {
    pub fn overview_empty(&mut self, ui: &mut egui::Ui) {
        let t = self.theme;
        let lang = self.lang;
        widgets::card_frame(&t).show(ui, |ui| {
            ui.set_width(ui.available_width());
            ui.vertical_centered(|ui| {
                ui.add_space(24.0);
                // Archive mark: primary-soft disc.
                let (r, _) = ui.allocate_exact_size(egui::vec2(44.0, 44.0), egui::Sense::hover());
                ui.painter().circle_filled(r.center(), 22.0, t.primary_soft);
                widgets::paint_folder(ui.painter(), r, t.primary);
                ui.add_space(12.0);
                ui.label(
                    egui::RichText::new(tr(lang, "overview.emptyTitle", &[]))
                        .size(16.0)
                        .strong()
                        .color(t.text),
                );
                ui.label(
                    egui::RichText::new(tr(lang, "overview.emptyDesc", &[]))
                        .size(13.0)
                        .color(t.muted),
                );
                ui.add_space(8.0);
                let label = if self.loading() {
                    tr(lang, "overview.reading", &[])
                } else {
                    tr(lang, "overview.openCta", &[])
                };
                ui.add_enabled_ui(!self.loading(), |ui| {
                    if widgets::primary_button(ui, &label, &t).clicked() {
                        self.want_open = true;
                    }
                });
                ui.add_space(4.0);
                ui.label(
                    egui::RichText::new(tr(lang, "overview.powered", &[]))
                        .size(12.0)
                        .color(t.faint),
                );
                ui.add_space(16.0);
            });
            // Utilities live here until an archive opens (extreme left).
            ui.horizontal(|ui| {
                ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
                self.theme_control(ui);
                self.lang_control(ui);
                self.about_button(ui);
            });
            ui.add_space(20.0);
        });
    }

    pub fn overview_open(&mut self, ui: &mut egui::Ui) {
        let loading = self.loading();
        let has_info = self.info.is_some();
        let has_extras = self
            .info
            .as_ref()
            .map(|i| !i.extra.is_empty())
            .unwrap_or(false);
        widgets::card_frame(&self.theme).show(ui, |ui| {
            ui.set_width(ui.available_width());
            if !self.collapsed {
                ui.add_space(20.0);
                ui.horizontal(|ui| {
                    ui.add_space(20.0);
                    ui.vertical(|ui| {
                        ui.set_width(ui.available_width());
                        if loading && !has_info {
                            ui.vertical_centered(|ui| {
                                ui.label(
                                    egui::RichText::new(tr(
                                        self.lang,
                                        "overview.readingDetails",
                                        &[],
                                    ))
                                    .size(14.0)
                                    .color(self.theme.muted),
                                );
                            });
                        } else if let Some(info) = self.info.clone() {
                            self.info_grids(ui, &info);
                        } else {
                            ui.vertical_centered(|ui| {
                                ui.label(
                                    egui::RichText::new(tr(self.lang, "overview.unavailable", &[]))
                                        .size(14.0)
                                        .color(self.theme.muted),
                                );
                            });
                        }
                    });
                    ui.add_space(20.0);
                });
            }
            // Action row: one centered line (More, Test, Checksum, Theme,
            // Language, About, collapse). Wrapped lines pack gap-free.
            ui.add_space(16.0);
            ui.horizontal(|ui| {
                let avail = ui.available_width();
                ui.add_space((avail - self.action_row_width()).max(0.0) / 2.0);
                if !self.collapsed && has_extras {
                    if widgets::secondary_button(
                        ui,
                        &tr(
                            self.lang,
                            if self.show_extra {
                                "overview.less"
                            } else {
                                "overview.more"
                            },
                            &[],
                        ),
                        &self.theme,
                    )
                    .clicked()
                    {
                        self.show_extra = !self.show_extra;
                    }
                }
                self.integrity_buttons(ui);
                self.theme_control(ui);
                self.lang_control(ui);
                self.about_button(ui);
                self.collapse_button(ui);
            });
            ui.add_space(20.0);
        });
    }

    /// Fixed estimate of the action row width for centering (buttons are
    /// fixed-size; the expanded theme/lang rows measure separately).
    fn action_row_width(&self) -> f32 {
        // More(128, sometimes) + 2 icon shells(36) + theme(36) + lang(36) +
        // about(36) + collapse(36) + gaps.
        let more = if !self.collapsed
            && self
                .info
                .as_ref()
                .map(|i| !i.extra.is_empty())
                .unwrap_or(false)
        {
            136.0
        } else {
            0.0
        };
        more + 36.0 * 5.0 + 8.0 * 6.0
    }

    fn info_grids(&mut self, ui: &mut egui::Ui, info: &ArchiveInfo) {
        let lang = self.lang;
        let tx = |k: &str| crate::i18n::t(lang, k, &[]);
        let container = vec![
            (
                tx("overview.meta.container"),
                info.container_format.clone().unwrap_or("—".into()),
            ),
            (
                tx("overview.meta.method"),
                info.method.clone().unwrap_or("—".into()),
            ),
            (
                tx("overview.meta.solidBlocks"),
                format!(
                    "{} · {}",
                    info.solid.as_deref().unwrap_or("—"),
                    info.blocks.as_deref().unwrap_or("—")
                ),
            ),
            (
                tx("overview.meta.headers"),
                info.headers_size
                    .map(|b| fmt::format_size(b as i128))
                    .unwrap_or("—".into()),
            ),
            (
                tx("overview.meta.physicalSize"),
                info.physical_size
                    .map(|b| fmt::format_size(b as i128))
                    .unwrap_or("—".into()),
            ),
            (
                tx("overview.meta.onDisk"),
                info.container_size
                    .map(|b| fmt::format_size(b as i128))
                    .unwrap_or("—".into()),
            ),
            (
                tx("overview.meta.modified"),
                fmt::format_epoch(info.container_modified, lang),
            ),
            (
                tx("overview.meta.hostOs"),
                if info.host_os.is_empty() {
                    "—".into()
                } else {
                    info.host_os.join(", ")
                },
            ),
        ];
        meta_grid(ui, container, &self.theme);
        ui.add_space(20.0);
        let ratio = if info.total_unpacked > 0 {
            tr(
                lang,
                "overview.meta.ratioOf",
                &[("pct", &format!("{:.1}", info.compression_ratio * 100.0))],
            )
        } else {
            "—".into()
        };
        let content = vec![
            (
                tx("overview.meta.files"),
                fmt::format_count(info.file_count as u64, lang),
            ),
            (
                tx("overview.meta.folders"),
                fmt::format_count(info.folder_count as u64, lang),
            ),
            (
                tx("overview.meta.nesting"),
                if info.max_depth > 0 {
                    format!("{}", info.max_depth)
                } else {
                    "—".into()
                },
            ),
            (
                tx("overview.meta.unpacked"),
                fmt::format_size(info.total_unpacked as i128),
            ),
            (
                tx("overview.meta.packed"),
                fmt::format_size(info.total_packed as i128),
            ),
            (tx("overview.meta.ratio"), ratio),
            (
                tx("overview.meta.algorithms"),
                if info.methods.is_empty() {
                    tx("overview.meta.storeNone")
                } else {
                    info.methods.join(" · ")
                },
            ),
            (
                tx("overview.meta.passwordScheme"),
                info.encryption_scheme.clone(),
            ),
        ];
        meta_grid(ui, content, &self.theme);
        if self.show_extra && !info.extra.is_empty() {
            ui.add_space(20.0);
            let cells: Vec<(String, String)> = info
                .extra
                .iter()
                .map(|(k, v)| {
                    (
                        k.clone(),
                        if v.is_empty() {
                            "—".into()
                        } else {
                            v.clone()
                        },
                    )
                })
                .collect();
            egui::ScrollArea::vertical()
                .max_height(160.0)
                .auto_shrink([false, true])
                .show(ui, |ui| {
                    meta_grid(ui, cells, &self.theme);
                });
        }
    }

    /// Icon-only Test + Checksum shells (18px glyphs in h-9 shells).
    fn integrity_buttons(&mut self, ui: &mut egui::Ui) {
        let t = self.theme;
        // Test (shield mark).
        widgets::bar_frame(&t).show(ui, |ui| {
            ui.set_width(28.0);
            let r = widgets::shell_icon_button(ui, &t);
            widgets::paint_shield(ui.painter(), r.rect, t.muted);
            if r.clicked() {
                self.test_open = true;
                self.test_start();
            }
            let _ = r.labelled_by(ui.id());
        });
        widgets::bar_frame(&t).show(ui, |ui| {
            ui.set_width(28.0);
            let r = widgets::shell_icon_button(ui, &t);
            // Hash mark drawn as two crossing pairs.
            let c = r.rect.center();
            let p = ui.painter();
            let s = egui::Stroke::new(1.6, t.muted);
            p.line_segment([c + egui::vec2(-5.0, -6.0), c + egui::vec2(-3.0, 6.0)], s);
            p.line_segment([c + egui::vec2(3.0, -6.0), c + egui::vec2(5.0, 6.0)], s);
            p.line_segment([c + egui::vec2(-7.0, -2.0), c + egui::vec2(7.0, -2.0)], s);
            p.line_segment([c + egui::vec2(-7.0, 3.0), c + egui::vec2(7.0, 3.0)], s);
            if r.clicked() {
                self.checksum_open = true;
            }
        });
        let _ = t;
    }

    /// Theme control: icon at rest, Light/System/Dark + 8 accents expanded.
    fn theme_control(&mut self, ui: &mut egui::Ui) {
        if !self.theme_open {
            let t = self.theme;
            widgets::bar_frame(&t).show(ui, |ui| {
                ui.set_width(28.0);
                let r = widgets::shell_icon_button(ui, &t);
                // Sun / moon / monitor mark for the current choice.
                let c = r.rect.center();
                let p = ui.painter();
                match self.theme_choice {
                    ThemeChoice::Light => {
                        let s = egui::Stroke::new(1.6, t.muted);
                        p.circle_stroke(c, 4.0, s);
                        for k in 0..8 {
                            let a = k as f32 * std::f32::consts::PI / 4.0;
                            let d = egui::vec2(a.cos(), a.sin());
                            p.line_segment([c + d * 6.0, c + d * 8.5], s);
                        }
                    }
                    ThemeChoice::Dark => {
                        p.circle_filled(c, 6.0, t.muted);
                        p.circle_filled(c + egui::vec2(2.5, -2.0), 5.0, t.bar_bg);
                    }
                    ThemeChoice::System => {
                        let s = egui::Stroke::new(1.6, t.muted);
                        let r = egui::Rect::from_center_size(c, egui::vec2(13.0, 9.0));
                        p.rect_stroke(r, 1.5, s, egui::StrokeKind::Inside);
                        p.line_segment([c + egui::vec2(0.0, 4.5), c + egui::vec2(0.0, 7.0)], s);
                    }
                }
                if r.clicked() {
                    self.theme_open = true;
                }
            });
            return;
        }
        // Expanded: segmented choices + accent dots, then minimize on pick.
        let opts = [
            (ThemeChoice::Light, tr(self.lang, "theme.light", &[])),
            (ThemeChoice::System, tr(self.lang, "theme.system", &[])),
            (ThemeChoice::Dark, tr(self.lang, "theme.dark", &[])),
        ];
        ui.horizontal(|ui| {
            ui.spacing_mut().item_spacing = egui::vec2(4.0, 0.0);
            for (choice, label) in opts {
                let on = self.theme_choice == choice;
                let r = ui.add(
                    egui::Button::new(egui::RichText::new(label).size(13.0).color(if on {
                        self.theme.on_primary
                    } else {
                        self.theme.muted
                    }))
                    .fill(if on {
                        self.theme.primary
                    } else {
                        egui::Color32::TRANSPARENT
                    })
                    .stroke(egui::Stroke::NONE)
                    .corner_radius(egui::CornerRadius::same(8))
                    .min_size(egui::vec2(0.0, 28.0)),
                );
                if r.clicked() {
                    self.set_theme(choice);
                    self.theme_open = false;
                }
            }
            for accent in ACCENTS {
                let on = self.accent == accent;
                let (r, resp) =
                    ui.allocate_exact_size(egui::vec2(20.0, 28.0), egui::Sense::click());
                let p = ui.painter_at(r);
                p.circle_filled(r.center(), 7.0, accent.dot(self.dark));
                if on {
                    p.circle_stroke(r.center(), 9.0, egui::Stroke::new(1.5, self.theme.primary));
                }
                if resp.on_hover_text(accent.name()).clicked() {
                    self.set_accent(accent);
                    self.theme_open = false;
                }
            }
        });
    }

    /// Language control: code button at rest, native names expanded.
    fn lang_control(&mut self, ui: &mut egui::Ui) {
        if !self.lang_open {
            let t = self.theme;
            let code = match self.lang {
                crate::i18n::Lang::En => "EN",
                crate::i18n::Lang::Hi => "हिं",
            };
            widgets::bar_frame(&t).show(ui, |ui| {
                ui.set_width(28.0);
                let r = ui.add(
                    egui::Button::new(egui::RichText::new(code).size(12.0).strong().color(t.muted))
                        .fill(egui::Color32::TRANSPARENT)
                        .stroke(egui::Stroke::NONE)
                        .corner_radius(egui::CornerRadius::same(8))
                        .min_size(egui::vec2(28.0, 28.0)),
                );
                if r.clicked() {
                    self.lang_open = true;
                }
            });
            return;
        }
        ui.horizontal(|ui| {
            ui.spacing_mut().item_spacing = egui::vec2(4.0, 0.0);
            for lang in [crate::i18n::Lang::En, crate::i18n::Lang::Hi] {
                let on = self.lang == lang;
                let r = ui.add(
                    egui::Button::new(egui::RichText::new(lang.native()).size(13.0).color(if on {
                        self.theme.on_primary
                    } else {
                        self.theme.muted
                    }))
                    .fill(if on {
                        self.theme.primary
                    } else {
                        egui::Color32::TRANSPARENT
                    })
                    .stroke(egui::Stroke::NONE)
                    .corner_radius(egui::CornerRadius::same(8))
                    .min_size(egui::vec2(0.0, 28.0)),
                );
                if r.clicked() {
                    self.set_lang(lang);
                    self.lang_open = false;
                }
            }
        });
    }

    fn about_button(&mut self, ui: &mut egui::Ui) {
        let t = self.theme;
        widgets::bar_frame(&t).show(ui, |ui| {
            ui.set_width(28.0);
            let r = ui.add(
                egui::Button::new(egui::RichText::new("i").size(15.0).color(t.muted))
                    .fill(egui::Color32::TRANSPARENT)
                    .stroke(egui::Stroke::NONE)
                    .corner_radius(egui::CornerRadius::same(8))
                    .min_size(egui::vec2(28.0, 28.0)),
            );
            if r.clicked() {
                self.about_open = true;
            }
        });
    }

    fn collapse_button(&mut self, ui: &mut egui::Ui) {
        let r = ui.add(
            egui::Button::new("")
                .fill(self.theme.surface)
                .stroke(egui::Stroke::new(1.0, self.theme.border))
                .corner_radius(egui::CornerRadius::same(9))
                .min_size(egui::vec2(36.0, 36.0)),
        );
        let c = r.rect.center();
        let s = egui::Stroke::new(1.8, self.theme.muted);
        let p = ui.painter();
        if self.collapsed {
            // ▼
            p.line_segment([c + egui::vec2(-5.0, -2.5), c + egui::vec2(0.0, 2.5)], s);
            p.line_segment([c + egui::vec2(0.0, 2.5), c + egui::vec2(5.0, -2.5)], s);
        } else {
            // ▲
            p.line_segment([c + egui::vec2(-5.0, 2.5), c + egui::vec2(0.0, -2.5)], s);
            p.line_segment([c + egui::vec2(0.0, -2.5), c + egui::vec2(5.0, 2.5)], s);
        }
        if r.clicked() {
            self.set_collapsed(!self.collapsed);
            if self.collapsed {
                self.show_extra = false;
            }
        }
    }
}
