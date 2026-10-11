//! All eight dialogs ported from `src/components/*.tsx`: frosted veil,
//! centered card, icon disc, inert backdrop (buttons or Esc only).

use crate::{engine, fmt, i18n::t as tr, theme::QzTheme, widgets};
use eframe::egui;

fn title_row(ui: &mut egui::Ui, title: &str, t: &QzTheme) {
    ui.vertical_centered(|ui| {
        ui.label(egui::RichText::new(title).size(16.0).strong().color(t.text));
    });
}

fn stat_row(ui: &mut egui::Ui, label: &str, value: &str, t: &QzTheme) {
    ui.horizontal(|ui| {
        widgets::micro_label(ui, label, t);
        ui.add_space(16.0);
        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            ui.label(egui::RichText::new(value).size(14.0).color(t.text));
        });
    });
}

impl crate::app::QuarkApp {
    fn esc_pressed(&self, ctx: &egui::Context) -> bool {
        ctx.input(|i| i.key_pressed(egui::Key::Escape))
    }

    // ——— Load (opening progress) ———

    pub fn load_dialog(&mut self, ctx: &egui::Context) {
        if !self.loading() {
            return;
        }
        let opening = self.opening.clone().unwrap_or_default();
        let phase_listing = matches!(self.load_phase, crate::app::LoadPhase::Listing);
        let entries = self.load_entries;
        let elapsed = self.load_start.elapsed().as_secs_f64();
        let now = ctx.input(|i| i.time);
        widgets::veil(ctx, &self.theme);
        let t = self.theme;
        let lang = self.lang;
        widgets::dialog_card(ctx, "qz-load", &t, |ui| {
            widgets::dialog_icon(ui, t.primary_soft, |p, r| {
                widgets::paint_folder(p, r, t.primary)
            });
            ui.add_space(12.0);
            title_row(ui, &tr(lang, "loading.title", &[]), &t);
            ui.vertical_centered(|ui| {
                ui.label(
                    egui::RichText::new(tr(
                        lang,
                        if phase_listing {
                            "loading.listing"
                        } else {
                            "loading.details"
                        },
                        &[],
                    ))
                    .size(13.0)
                    .color(t.muted),
                );
                ui.add(
                    egui::Label::new(
                        egui::RichText::new(opening.clone())
                            .size(12.0)
                            .color(t.faint),
                    )
                    .truncate(),
                );
            });
            ui.add_space(16.0);
            widgets::indeterminate_bar(ui, &t, now);
            ui.add_space(16.0);
            stat_row(
                ui,
                &tr(lang, "loading.entries", &[]),
                &fmt::format_count(entries, lang),
                &t,
            );
            stat_row(ui, &tr(lang, "loading.dataRead", &[]), "—", &t);
            stat_row(
                ui,
                &tr(lang, "loading.elapsed", &[]),
                &format!("{} s", elapsed.floor() as u64),
                &t,
            );
            stat_row(ui, &tr(lang, "loading.rate", &[]), "—", &t);
            ui.add_space(20.0);
            ui.vertical_centered(|ui| {
                if widgets::secondary_button(ui, &tr(lang, "common.cancel", &[]), &t).clicked() {
                    self.cancel_loading();
                }
            });
        });
        ctx.request_repaint();
    }

    // ——— Extract confirm ———

    pub fn extract_dialog(&mut self, ctx: &egui::Context) {
        let Some(mode) = self.confirming else {
            return;
        };
        if self.esc_pressed(ctx) {
            self.confirming = None;
            return;
        }
        // Reset per opening is done by callers (set_confirming).
        let total = self.store.as_ref().map(|s| s.total()).unwrap_or(0);
        let selected_n = self.selected.len();
        let title = match mode {
            crate::app::ExtractMode::All => tr(self.lang, "extract.titleAll", &[]),
            crate::app::ExtractMode::Empty => tr(self.lang, "extract.titleEmpty", &[]),
            crate::app::ExtractMode::Selected => tr(self.lang, "extract.titleSelected", &[]),
        };
        let desc = match mode {
            crate::app::ExtractMode::All => tr(
                self.lang,
                "extract.allFiles",
                &[("total", &fmt::format_count(total as u64, self.lang))],
            ),
            crate::app::ExtractMode::Empty => tr(
                self.lang,
                "extract.emptyMessage",
                &[("total", &fmt::format_count(total as u64, self.lang))],
            ),
            crate::app::ExtractMode::Selected => tr(
                self.lang,
                "extract.someFiles",
                &[
                    ("selected", &fmt::format_count(selected_n as u64, self.lang)),
                    ("total", &fmt::format_count(total as u64, self.lang)),
                ],
            ),
        };
        // Subfolder validation (APFS rules via the shared Rust mirror).
        let syntax_err: Option<&str> = if self.ex_create_folder {
            match crate::archive::validate_folder_name(&self.ex_name) {
                Ok(()) => None,
                Err("empty") => Some("empty"),
                Err("too_long") => Some("too_long"),
                Err("reserved") => Some("reserved"),
                _ => Some("invalid_chars"),
            }
        } else {
            None
        };
        let name_limit = if self.ex_stamp.is_some() {
            255 - 20
        } else {
            255
        };
        let budget_err = self.ex_create_folder
            && syntax_err.is_none()
            && self.ex_stamp.is_some()
            && self.ex_name.len() > name_limit;
        let preview: Option<String> =
            if self.ex_create_folder && syntax_err.is_none() && !budget_err {
                let base = if self.ex_name.is_empty() {
                    "extracted".to_string()
                } else {
                    self.ex_name.clone()
                };
                Some(match &self.ex_stamp {
                    Some(s) => format!("{base}_{s}"),
                    None => base,
                })
            } else {
                None
            };
        // Uniqueness probe (one metadata call per settled name).
        if let Some(name) = preview.clone() {
            let probe = format!("{}/{}", self.dest.trim_end_matches('/'), name);
            if self.ex_last_probe.as_deref() != Some(&probe) {
                self.ex_last_probe = Some(probe.clone());
                self.ex_exists = Some(std::path::Path::new(&probe).exists());
            }
        } else {
            self.ex_exists = None;
        }
        let error_key: Option<&str> = if self.ex_create_folder {
            if let Some(e) = syntax_err {
                Some(e)
            } else if budget_err {
                Some("stamp_too_long")
            } else if self.ex_exists == Some(true) {
                Some("exists")
            } else {
                None
            }
        } else {
            None
        };
        let blocked = self.ex_create_folder && error_key.is_some();
        let final_dest = match &preview {
            Some(name) => format!("{}/{}", self.dest.trim_end_matches('/'), name),
            None => self.dest.clone(),
        };
        widgets::veil(ctx, &self.theme);
        let mut confirm: Option<String> = None;
        let mut cancel = false;
        let t = self.theme;
        let lang = self.lang;
        widgets::dialog_card(ctx, "qz-extract", &t, |ui| {
            let bg = match mode {
                crate::app::ExtractMode::Selected => t.primary_soft,
                crate::app::ExtractMode::All => t.info_soft,
                crate::app::ExtractMode::Empty => t.warning_soft,
            };
            widgets::dialog_icon(ui, bg, |p, r| match mode {
                crate::app::ExtractMode::Selected => widgets::paint_check(p, r, t.primary),
                crate::app::ExtractMode::All => widgets::paint_download(p, r, t.info),
                crate::app::ExtractMode::Empty => {
                    let c = r.center();
                    let s = egui::Stroke::new(2.5, t.warning);
                    p.line_segment([c + egui::vec2(0.0, -6.0), c + egui::vec2(0.0, 3.0)], s);
                    p.circle_filled(c + egui::vec2(0.0, 6.0), 1.6, t.warning);
                }
            });
            ui.add_space(12.0);
            title_row(ui, &title, &t);
            ui.vertical_centered(|ui| {
                ui.label(egui::RichText::new(desc).size(13.0).color(t.muted));
                ui.add_space(8.0);
                ui.add(
                    egui::Label::new(
                        egui::RichText::new(final_dest.clone())
                            .size(13.0)
                            .color(t.text),
                    )
                    .truncate(),
                );
            });
            // Subfolder section.
            ui.add_space(16.0);
            ui.separator();
            ui.add_space(12.0);
            ui.horizontal(|ui| {
                let avail = ui.available_width();
                ui.add_space((avail - 260.0).max(0.0) / 2.0);
                let label = tr(lang, "extract.folderToggle", &[]);
                let (r, _) = ui.allocate_exact_size(egui::vec2(20.0, 20.0), egui::Sense::click());
                let p = ui.painter_at(r);
                let brect = egui::Rect::from_center_size(r.center(), egui::vec2(16.0, 16.0));
                if self.ex_create_folder {
                    p.rect_filled(brect, 5.0, t.primary);
                    widgets::paint_check(&p, brect, t.on_primary);
                } else {
                    p.rect_stroke(
                        brect,
                        5.0,
                        egui::Stroke::new(1.0, t.border),
                        egui::StrokeKind::Inside,
                    );
                }
                let mut on = self.ex_create_folder;
                ui.checkbox(&mut on, label);
                self.ex_create_folder = on;
            });
            if self.ex_create_folder {
                ui.add_space(10.0);
                ui.vertical_centered(|ui| {
                    widgets::micro_label(ui, &tr(lang, "extract.folderLabel", &[]), &t);
                });
                ui.add_space(4.0);
                widgets::text_input(
                    ui,
                    &mut self.ex_name,
                    &tr(lang, "extract.folderPlaceholder", &[]),
                    &t,
                    ui.available_width(),
                );
                ui.add_space(8.0);
                let used = self.ex_name.len() + if self.ex_stamp.is_some() { 20 } else { 0 };
                ui.horizontal(|ui| {
                    let avail = ui.available_width();
                    ui.add_space((avail - 300.0).max(0.0) / 2.0);
                    ui.label(
                        egui::RichText::new(tr(
                            lang,
                            "extract.folderLimit",
                            &[
                                ("used", &used.to_string()),
                                ("limit", &name_limit.to_string()),
                            ],
                        ))
                        .size(12.0)
                        .color(t.faint),
                    );
                    let mut stamped = self.ex_stamp.is_some();
                    ui.checkbox(&mut stamped, tr(lang, "extract.appendDate", &[]));
                    if stamped != self.ex_stamp.is_some() {
                        self.ex_stamp = if stamped { Some(mint_stamp()) } else { None };
                    }
                });
                if let Some(name) = preview.clone() {
                    ui.add_space(10.0);
                    egui::Frame {
                        fill: t.surface,
                        stroke: egui::Stroke::new(1.0, t.border),
                        corner_radius: egui::CornerRadius::same(9),
                        inner_margin: egui::Margin::symmetric(12, 8),
                        ..Default::default()
                    }
                    .show(ui, |ui| {
                        ui.set_width(ui.available_width());
                        ui.vertical_centered(|ui| {
                            widgets::micro_label(
                                ui,
                                &tr(lang, "extract.finalFolder", &[("dest", &self.dest)]),
                                &t,
                            );
                            ui.add(
                                egui::Label::new(
                                    egui::RichText::new(name).size(13.0).color(t.text),
                                )
                                .truncate(),
                            );
                        });
                    });
                }
                if let Some(key) = error_key {
                    ui.add_space(6.0);
                    let msg = match key {
                        "empty" => tr(lang, "extract.folderErrorEmpty", &[]),
                        "too_long" => tr(lang, "extract.folderErrorTooLong", &[]),
                        "stamp_too_long" => tr(
                            lang,
                            "extract.folderErrorTooLongStamp",
                            &[("limit", &name_limit.to_string())],
                        ),
                        "reserved" => tr(lang, "extract.folderErrorReserved", &[]),
                        "invalid_chars" => tr(lang, "extract.folderErrorInvalidChars", &[]),
                        "exists" => tr(lang, "extract.folderErrorExists", &[]),
                        _ => tr(lang, "extract.folderErrorInvalidUnicode", &[]),
                    };
                    ui.vertical_centered(|ui| {
                        ui.label(egui::RichText::new(msg).size(12.0).color(t.danger));
                    });
                }
            }
            ui.add_space(20.0);
            ui.horizontal(|ui| {
                let avail = ui.available_width();
                ui.add_space((avail - 220.0).max(0.0) / 2.0);
                if widgets::warning_button(ui, &tr(lang, "common.cancel", &[]), &t).clicked() {
                    cancel = true;
                }
                let confirm_label = if mode == crate::app::ExtractMode::Empty {
                    tr(lang, "app.extractAll", &[])
                } else {
                    tr(lang, "common.proceed", &[])
                };
                ui.add_enabled_ui(!blocked, |ui| {
                    if widgets::primary_button(ui, &confirm_label, &t).clicked() {
                        confirm = Some(final_dest.clone());
                    }
                });
            });
        });
        if cancel {
            self.confirming = None;
        }
        if let Some(dest) = confirm {
            let mode = self.confirming.unwrap_or(crate::app::ExtractMode::All);
            self.confirming = None;
            self.pending_extract = Some((mode, dest.clone()));
            self.start_extract(mode, &dest, None);
        }
    }

    // ——— Done ———

    pub fn done_dialog(&mut self, ctx: &egui::Context) {
        let Some(result) = self.done_info.clone() else {
            return;
        };
        if self.esc_pressed(ctx) {
            self.done_info = None;
            return;
        }
        widgets::veil(ctx, &self.theme);
        let mut ok = false;
        let mut reveal = false;
        let t = self.theme;
        let lang = self.lang;
        widgets::dialog_card(ctx, "qz-done", &t, |ui| {
            if result.ok {
                widgets::dialog_icon(ui, t.success_soft, |p, r| {
                    widgets::paint_check(p, r, t.success)
                });
                ui.add_space(12.0);
                title_row(ui, &tr(lang, "done.successTitle", &[]), &t);
                ui.vertical_centered(|ui| {
                    ui.label(
                        egui::RichText::new(tr(
                            lang,
                            "done.successFiles",
                            &[("count", &fmt::format_count(result.file_count as u64, lang))],
                        ))
                        .size(13.0)
                        .color(t.muted),
                    );
                    ui.add_space(8.0);
                    ui.add(
                        egui::Label::new(
                            egui::RichText::new(result.dest.clone())
                                .size(13.0)
                                .color(t.text),
                        )
                        .truncate(),
                    );
                });
            } else {
                widgets::dialog_icon(ui, t.danger_soft, |p, r| {
                    widgets::paint_cross(p, r, t.danger)
                });
                ui.add_space(12.0);
                title_row(ui, &tr(lang, "done.failTitle", &[]), &t);
                ui.vertical_centered(|ui| {
                    ui.add(
                        egui::Label::new(
                            egui::RichText::new(result.message.clone())
                                .size(13.0)
                                .color(t.muted),
                        )
                        .truncate(),
                    );
                    ui.add_space(8.0);
                    ui.add(
                        egui::Label::new(
                            egui::RichText::new(result.dest.clone())
                                .size(13.0)
                                .color(t.text),
                        )
                        .truncate(),
                    );
                });
            }
            ui.add_space(20.0);
            ui.horizontal(|ui| {
                let avail = ui.available_width();
                ui.add_space((avail - 220.0).max(0.0) / 2.0);
                if result.ok
                    && widgets::secondary_button(ui, &tr(lang, "done.revealInFinder", &[]), &t)
                        .clicked()
                {
                    reveal = true;
                }
                if widgets::primary_button(ui, &tr(lang, "common.ok", &[]), &t).clicked() {
                    ok = true;
                }
            });
        });
        if reveal {
            engine::reveal_in_dir(&result.dest);
        }
        if ok {
            self.done_info = None;
        }
    }

    // ——— About ———

    pub fn about_dialog(&mut self, ctx: &egui::Context) {
        if !self.about_open {
            return;
        }
        if self.esc_pressed(ctx) {
            self.about_open = false;
            return;
        }
        widgets::veil(ctx, &self.theme);
        let info = engine::app_info();
        let mut ok = false;
        let mut open_link = false;
        let t = self.theme;
        let lang = self.lang;
        widgets::dialog_card(ctx, "qz-about", &t, |ui| {
            widgets::dialog_icon(ui, t.primary_soft, |p, r| {
                let c = r.center();
                p.line_segment(
                    [c + egui::vec2(0.0, -6.0), c + egui::vec2(0.0, 2.0)],
                    egui::Stroke::new(2.5, t.primary),
                );
                p.circle_filled(c + egui::vec2(0.0, 6.0), 1.8, t.primary);
            });
            ui.add_space(12.0);
            title_row(ui, &tr(lang, "about.title", &[("app", "QuarkZip")]), &t);
            ui.add_space(12.0);
            for (label, value) in [
                (tr(lang, "about.appName", &[]), "QuarkZip".to_string()),
                (tr(lang, "about.version", &[]), info.version.to_string()),
                (
                    tr(lang, "about.releaseDate", &[]),
                    info.release_date.to_string(),
                ),
                (tr(lang, "about.commitId", &[]), info.commit_id.to_string()),
                (tr(lang, "about.os", &[]), info.os.clone()),
                (tr(lang, "about.arch", &[]), info.arch.clone()),
            ] {
                ui.horizontal(|ui| {
                    widgets::micro_label(ui, &label, &t);
                    ui.add_space(16.0);
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        ui.add(
                            egui::Label::new(egui::RichText::new(value).size(13.0).color(t.text))
                                .truncate(),
                        );
                    });
                });
                ui.add_space(6.0);
            }
            ui.add_space(8.0);
            ui.vertical_centered(|ui| {
                ui.label(
                    egui::RichText::new(tr(lang, "about.licenseA", &[("app", "QuarkZip")]))
                        .size(12.0)
                        .color(t.muted),
                );
                if ui.link(tr(lang, "about.licenseLink", &[])).clicked() {
                    open_link = true;
                }
                ui.label(
                    egui::RichText::new(tr(lang, "about.licenseB", &[]))
                        .size(12.0)
                        .color(t.muted),
                );
                ui.add_space(12.0);
                ui.label(
                    egui::RichText::new(tr(lang, "about.madeWith", &[]))
                        .size(13.0)
                        .color(t.text),
                );
            });
            ui.add_space(16.0);
            ui.vertical_centered(|ui| {
                if widgets::primary_button(ui, &tr(lang, "common.ok", &[]), &t).clicked() {
                    ok = true;
                }
            });
        });
        if open_link {
            let _ = std::process::Command::new("open")
                .arg("https://www.7-zip.org/")
                .spawn();
        }
        if ok {
            self.about_open = false;
        }
    }

    // ——— Test ———

    pub fn test_dialog(&mut self, ctx: &egui::Context) {
        if !self.test_open {
            return;
        }
        // Esc only once finished (mirrors the running-disabled OK).
        if self.test_done.is_some() && self.esc_pressed(ctx) {
            self.test_open = false;
            self.test_done = None;
            return;
        }
        widgets::veil(ctx, &self.theme);
        let running = self.test_done.is_none();
        let mut ok = false;
        let t = self.theme;
        let lang = self.lang;
        let archive = self
            .store
            .as_ref()
            .map(|s| s.path.clone())
            .unwrap_or_default();
        widgets::dialog_card(ctx, "qz-test", &t, |ui| {
            let (bg, ok_flag): (egui::Color32, Option<bool>) = match &self.test_done {
                None => (t.primary_soft, None),
                Some(Ok(_)) => (t.success_soft, Some(true)),
                Some(Err(_)) => (t.danger_soft, Some(false)),
            };
            widgets::dialog_icon(ui, bg, |p, r| match ok_flag {
                None => widgets::paint_shield(p, r, t.primary),
                Some(true) => widgets::paint_check(p, r, t.success),
                Some(false) => widgets::paint_cross(p, r, t.danger),
            });
            ui.add_space(12.0);
            title_row(ui, &tr(lang, "test.title", &[]), &t);
            ui.vertical_centered(|ui| match &self.test_done {
                None => {
                    ui.add(
                        egui::Label::new(
                            egui::RichText::new(tr(lang, "test.testing", &[("name", &archive)]))
                                .size(13.0)
                                .color(t.muted),
                        )
                        .truncate(),
                    );
                }
                Some(Ok(_)) => {
                    ui.label(
                        egui::RichText::new(tr(lang, "test.pass", &[]))
                            .size(13.0)
                            .color(t.muted),
                    );
                }
                Some(Err(msg)) => {
                    ui.add(
                        egui::Label::new(
                            egui::RichText::new(msg.clone()).size(13.0).color(t.muted),
                        )
                        .truncate(),
                    );
                }
            });
            if running {
                ui.add_space(16.0);
                widgets::progress_bar(
                    ui,
                    self.test_pct as f32 / 100.0,
                    &format!("{}%", self.test_pct),
                    &t,
                );
            }
            ui.add_space(20.0);
            ui.vertical_centered(|ui| {
                ui.add_enabled_ui(!running, |ui| {
                    if widgets::primary_button(ui, &tr(lang, "common.ok", &[]), &t).clicked() {
                        ok = true;
                    }
                });
            });
        });
        if ok {
            self.test_open = false;
            self.test_done = None;
        }
        ctx.request_repaint();
    }

    // ——— Checksum ———

    pub fn checksum_dialog(&mut self, ctx: &egui::Context) {
        if !self.checksum_open {
            return;
        }
        let running = matches!(self.cs_phase, crate::app::CheckPhase::Running(_));
        if !running && self.esc_pressed(ctx) {
            self.close_checksum();
            return;
        }
        widgets::veil(ctx, &self.theme);
        let t = self.theme;
        let lang = self.lang;
        let archive = self
            .store
            .as_ref()
            .map(|s| s.path.clone())
            .unwrap_or_default();
        let mut start = false;
        let mut cancel = false;
        let mut close = false;
        widgets::dialog_card(ctx, "qz-checksum", &t, |ui| {
            widgets::dialog_icon(ui, t.primary_soft, |p, r| {
                let c = r.center();
                let s = egui::Stroke::new(2.0, t.primary);
                p.line_segment([c + egui::vec2(-5.0, -6.0), c + egui::vec2(-3.0, 6.0)], s);
                p.line_segment([c + egui::vec2(3.0, -6.0), c + egui::vec2(5.0, 6.0)], s);
                p.line_segment([c + egui::vec2(-7.0, -2.0), c + egui::vec2(7.0, -2.0)], s);
                p.line_segment([c + egui::vec2(-7.0, 3.0), c + egui::vec2(7.0, 3.0)], s);
            });
            ui.add_space(12.0);
            title_row(ui, &tr(lang, "checksum.title", &[]), &t);
            ui.vertical_centered(|ui| {
                ui.add(
                    egui::Label::new(
                        egui::RichText::new(archive.clone())
                            .size(13.0)
                            .color(t.muted),
                    )
                    .truncate(),
                );
            });
            ui.add_space(16.0);
            widgets::micro_label(ui, &tr(lang, "checksum.algorithm", &[]), &t);
            ui.add_space(4.0);
            egui::ComboBox::from_label("")
                .selected_text(self.cs_algo.label())
                .width(ui.available_width())
                .show_ui(ui, |ui| {
                    for algo in engine::ChecksumAlgo::all() {
                        ui.selectable_value(&mut self.cs_algo, algo, algo.label());
                    }
                });
            ui.add_space(12.0);
            widgets::micro_label(ui, &tr(lang, "checksum.expected", &[]), &t);
            ui.add_space(4.0);
            ui.add_enabled_ui(!running, |ui| {
                widgets::text_input(
                    ui,
                    &mut self.cs_expected,
                    &tr(lang, "checksum.expectedPlaceholder", &[]),
                    &t,
                    ui.available_width(),
                );
            });
            match &self.cs_phase {
                crate::app::CheckPhase::Running(pct) => {
                    ui.add_space(16.0);
                    widgets::progress_bar(
                        ui,
                        *pct as f32 / 100.0,
                        &format!("{} {pct}%", tr(lang, "checksum.calculating", &[])),
                        &t,
                    );
                }
                crate::app::CheckPhase::Done(digest) => {
                    ui.add_space(16.0);
                    egui::Frame {
                        fill: t.surface2,
                        stroke: egui::Stroke::new(1.0, t.border),
                        corner_radius: egui::CornerRadius::same(10),
                        inner_margin: egui::Margin::symmetric(12, 8),
                        ..Default::default()
                    }
                    .show(ui, |ui| {
                        ui.set_width(ui.available_width());
                        widgets::micro_label(
                            ui,
                            &tr(lang, "checksum.computed", &[("algo", self.cs_algo.label())]),
                            &t,
                        );
                        ui.add(
                            egui::Label::new(
                                egui::RichText::new(digest.clone()).size(12.0).color(t.text),
                            )
                            .truncate(),
                        );
                        let trimmed = self.cs_expected.trim();
                        if !trimmed.is_empty() {
                            let norm = |s: &str| {
                                s.to_lowercase()
                                    .chars()
                                    .filter(|c| !c.is_whitespace())
                                    .collect::<String>()
                            };
                            let matched = norm(digest) == norm(trimmed);
                            ui.add_space(8.0);
                            widgets::pill(
                                ui,
                                &tr(
                                    lang,
                                    if matched {
                                        "checksum.match"
                                    } else {
                                        "checksum.mismatch"
                                    },
                                    &[],
                                ),
                                if matched { t.success } else { t.danger },
                                if matched {
                                    t.success_soft
                                } else {
                                    t.danger_soft
                                },
                                if matched { t.success } else { t.danger },
                            );
                        }
                    });
                }
                crate::app::CheckPhase::Cancelled => {
                    ui.add_space(16.0);
                    ui.vertical_centered(|ui| {
                        ui.label(
                            egui::RichText::new(tr(lang, "checksum.cancelled", &[]))
                                .size(13.0)
                                .color(t.warning),
                        );
                    });
                }
                crate::app::CheckPhase::Error(msg) => {
                    ui.add_space(16.0);
                    ui.vertical_centered(|ui| {
                        ui.add(
                            egui::Label::new(
                                egui::RichText::new(msg.clone()).size(13.0).color(t.danger),
                            )
                            .truncate(),
                        );
                    });
                }
                crate::app::CheckPhase::Idle => {}
            }
            ui.add_space(20.0);
            ui.horizontal(|ui| {
                let avail = ui.available_width();
                ui.add_space((avail - 220.0).max(0.0) / 2.0);
                if running {
                    if widgets::secondary_button(ui, &tr(lang, "common.cancel", &[]), &t).clicked()
                    {
                        cancel = true;
                    }
                } else if widgets::primary_button(ui, &tr(lang, "checksum.calculate", &[]), &t)
                    .clicked()
                {
                    start = true;
                }
                if widgets::secondary_button(ui, &tr(lang, "checksum.close", &[]), &t).clicked() {
                    close = true;
                }
            });
        });
        if start {
            self.start_checksum();
        }
        if cancel {
            self.cancel_checksum();
        }
        if close {
            self.close_checksum();
        }
        ctx.request_repaint();
    }

    // ——— Password gate ———

    pub fn password_dialog(&mut self, ctx: &egui::Context) {
        if !self.pw_open {
            return;
        }
        let checking = matches!(self.pw_phase, crate::app::PwPhase::Checking(_));
        if !checking && self.esc_pressed(ctx) {
            self.close_password_gate();
            return;
        }
        widgets::veil(ctx, &self.theme);
        let verified = matches!(self.pw_phase, crate::app::PwPhase::Verified);
        let mut check = false;
        let mut accept = false;
        let mut cancel = false;
        let t = self.theme;
        let lang = self.lang;
        let accept_label = self.pw_accept_label();
        let archive = self.pw_path.clone().unwrap_or_default();
        widgets::dialog_card(ctx, "qz-password", &t, |ui| {
            let bg = match &self.pw_phase {
                crate::app::PwPhase::Verified => t.success_soft,
                crate::app::PwPhase::Wrong | crate::app::PwPhase::Error(_) => t.danger_soft,
                _ => t.primary_soft,
            };
            widgets::dialog_icon(ui, bg, |p, r| match &self.pw_phase {
                crate::app::PwPhase::Verified => widgets::paint_check(p, r, t.success),
                crate::app::PwPhase::Wrong | crate::app::PwPhase::Error(_) => {
                    widgets::paint_cross(p, r, t.danger)
                }
                _ => widgets::paint_lock(p, r, t.primary),
            });
            ui.add_space(12.0);
            title_row(ui, &tr(lang, "password.title", &[]), &t);
            ui.vertical_centered(|ui| {
                ui.add(
                    egui::Label::new(
                        egui::RichText::new(if verified {
                            tr(lang, "password.verified", &[])
                        } else {
                            archive.clone()
                        })
                        .size(13.0)
                        .color(t.muted),
                    )
                    .truncate(),
                );
            });
            if !verified {
                ui.add_space(16.0);
                widgets::micro_label(ui, &tr(lang, "password.label", &[]), &t);
                ui.add_space(4.0);
                ui.horizontal(|ui| {
                    let locked = checking || verified;
                    ui.add_enabled_ui(!locked, |ui| {
                        let resp = ui.add_sized(
                            egui::vec2((ui.available_width() - 36.0).max(80.0), 36.0),
                            egui::TextEdit::singleline(&mut self.pw_text)
                                .password(!self.pw_show)
                                .hint_text(
                                    egui::RichText::new(tr(lang, "password.placeholder", &[]))
                                        .size(13.0)
                                        .color(t.faint),
                                )
                                .margin(egui::Margin::symmetric(12, 8)),
                        );
                        if resp.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter)) {
                            check = true;
                        }
                    });
                    let show_label = if self.pw_show {
                        tr(lang, "password.hide", &[])
                    } else {
                        tr(lang, "password.show", &[])
                    };
                    ui.add_enabled_ui(!locked, |ui| {
                        if ui
                            .add(
                                egui::Button::new(
                                    egui::RichText::new(show_label).size(12.0).color(t.muted),
                                )
                                .frame(false),
                            )
                            .clicked()
                        {
                            self.pw_show = !self.pw_show;
                        }
                    });
                });
                match &self.pw_phase {
                    crate::app::PwPhase::Wrong => {
                        ui.add_space(8.0);
                        ui.vertical_centered(|ui| {
                            ui.label(
                                egui::RichText::new(tr(lang, "password.wrong", &[]))
                                    .size(13.0)
                                    .color(t.danger),
                            );
                        });
                    }
                    crate::app::PwPhase::Error(msg) => {
                        ui.add_space(8.0);
                        ui.vertical_centered(|ui| {
                            ui.add(
                                egui::Label::new(
                                    egui::RichText::new(msg.clone()).size(13.0).color(t.danger),
                                )
                                .truncate(),
                            );
                        });
                    }
                    crate::app::PwPhase::Checking(pct) => {
                        ui.add_space(12.0);
                        widgets::progress_bar(
                            ui,
                            *pct as f32 / 100.0,
                            &format!("{} {pct}%", tr(lang, "password.checking", &[])),
                            &t,
                        );
                    }
                    _ => {}
                }
            }
            ui.add_space(20.0);
            ui.horizontal(|ui| {
                let avail = ui.available_width();
                ui.add_space((avail - 220.0).max(0.0) / 2.0);
                if verified {
                    if widgets::primary_button(ui, &accept_label, &t).clicked() {
                        accept = true;
                    }
                } else {
                    ui.add_enabled_ui(!self.pw_text.is_empty() && !checking, |ui| {
                        if widgets::primary_button(ui, &tr(lang, "password.check", &[]), &t)
                            .clicked()
                        {
                            check = true;
                        }
                    });
                }
                ui.add_enabled_ui(!checking, |ui| {
                    if widgets::secondary_button(ui, &tr(lang, "common.cancel", &[]), &t).clicked()
                    {
                        cancel = true;
                    }
                });
            });
        });
        if check {
            self.check_password();
        }
        if accept {
            let path = self.pw_path.clone().unwrap_or_default();
            let pw = self.pw_text.clone();
            self.accept_password(path, pw);
        }
        if cancel {
            self.close_password_gate();
        }
        ctx.request_repaint();
    }

    // ——— Permission ———

    pub fn permission_dialog(&mut self, ctx: &egui::Context) {
        let Some((mode, path)) = self.permission.clone() else {
            return;
        };
        if self.esc_pressed(ctx) {
            self.permission = None;
            return;
        }
        widgets::veil(ctx, &self.theme);
        let mut cancel = false;
        let mut choose = false;
        let mut settings = false;
        let t = self.theme;
        let lang = self.lang;
        widgets::dialog_card(ctx, "qz-permission", &t, |ui| {
            widgets::dialog_icon(ui, t.warning_soft, |p, r| {
                widgets::paint_shield(p, r, t.warning)
            });
            ui.add_space(12.0);
            title_row(ui, &tr(lang, "permission.title", &[]), &t);
            ui.vertical_centered(|ui| {
                ui.label(
                    egui::RichText::new(tr(lang, "permission.message", &[("path", &path)]))
                        .size(13.0)
                        .color(t.muted),
                );
                ui.add_space(8.0);
                ui.add(
                    egui::Label::new(egui::RichText::new(path.clone()).size(13.0).color(t.text))
                        .truncate(),
                );
                ui.add_space(4.0);
                ui.label(
                    egui::RichText::new(tr(lang, "permission.hint", &[]))
                        .size(12.0)
                        .color(t.faint),
                );
            });
            ui.add_space(20.0);
            ui.horizontal(|ui| {
                let avail = ui.available_width();
                ui.add_space((avail - 330.0).max(0.0) / 2.0);
                if widgets::warning_button(ui, &tr(lang, "common.cancel", &[]), &t).clicked() {
                    cancel = true;
                }
                if mode == crate::app::PermMode::Extract
                    && widgets::secondary_button(ui, &tr(lang, "permission.chooseFolder", &[]), &t)
                        .clicked()
                {
                    choose = true;
                }
                if widgets::primary_button(ui, &tr(lang, "permission.openSettings", &[]), &t)
                    .clicked()
                {
                    settings = true;
                }
            });
        });
        if cancel {
            self.permission = None;
        }
        if settings {
            engine::open_privacy_settings();
        }
        if choose {
            self.permission = None;
            if let Some(dir) = engine::pick_folder() {
                self.dest = dir;
                self.done_info = None;
            }
        }
    }
}

/// Filesystem-safe local stamp (`2026-10-08_14-30-05`): the `date`
/// one-shot gives true local time; UTC math is the fallback.
pub fn mint_stamp() -> String {
    if let Ok(out) = std::process::Command::new("date")
        .arg("+%Y-%m-%d_%H-%M-%S")
        .output()
    {
        let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if s.len() == 19 {
            return s;
        }
    }
    // UTC fallback (same shape, same sort order).
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let days = now / 86_400;
    let tod = now % 86_400;
    let z = days as i64 + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };
    format!(
        "{year:04}-{m:02}-{d:02}_{:02}-{:02}-{:02}",
        tod / 3_600,
        (tod % 3_600) / 60,
        tod % 60
    )
}
