//! Reusable primitives — every screen composes these, no one-off styles.
//!
//! Names mirror `UiPrompt.md` §COMPONENT ARCHITECTURE:
//! StatusPill, Avatar, SegmentedControl, SearchField, SummaryCard,
//! Button, IconButton, Tag, TextArea (via [`multiline`]), FormField.

use crate::data::Kpi;
use crate::tokens;
use eframe::egui;

/// Page title + quiet meta sub-line (middle-dot separators per spec §10).
pub fn page_header(ui: &mut egui::Ui, title: &str, sub: &str) {
    ui.label(
        egui::RichText::new(title)
            .size(tokens::T_TITLE)
            .strong()
            .color(tokens::TEXT),
    );
    ui.add_space(4.0);
    ui.label(
        egui::RichText::new(sub)
            .size(tokens::T_SECONDARY)
            .color(tokens::SECONDARY),
    );
}

/// 11–12px uppercase letter-spaced section label. (egui has no tracking,
/// so casing alone carries the style.)
pub fn section_label(ui: &mut egui::Ui, text: &str) {
    ui.label(
        egui::RichText::new(text.to_uppercase())
            .size(tokens::T_META)
            .strong()
            .color(tokens::MUTED),
    );
}

/// Status pill: 999px radius, 6px dot + text, color + text (never color alone).
pub fn pill(
    ui: &mut egui::Ui,
    dot: egui::Color32,
    bg: egui::Color32,
    fg: egui::Color32,
    text: &str,
) {
    egui::Frame {
        fill: bg,
        corner_radius: egui::CornerRadius::same(12),
        inner_margin: egui::Margin::symmetric(10, 6),
        ..Default::default()
    }
    .show(ui, |ui| {
        ui.horizontal(|ui| {
            ui.spacing_mut().item_spacing = egui::vec2(6.0, 0.0);
            // Painted dot (bundled fonts have no reliable ● glyph).
            let (dot_rect, _) =
                ui.allocate_exact_size(egui::vec2(10.0, 10.0), egui::Sense::hover());
            ui.painter().circle_filled(dot_rect.center(), 3.5, dot);
            ui.label(
                egui::RichText::new(text)
                    .size(tokens::T_PILL)
                    .strong()
                    .color(fg),
            );
        });
    });
}

/// 32px circular initials avatar on a deterministic muted background.
pub fn avatar(ui: &mut egui::Ui, initials: &str, bg: egui::Color32) {
    egui::Frame {
        fill: bg,
        corner_radius: egui::CornerRadius::same(tokens::R_AVATAR),
        ..Default::default()
    }
    .show(ui, |ui| {
        ui.allocate_ui_with_layout(
            egui::vec2(32.0, 32.0),
            egui::Layout::centered_and_justified(egui::Direction::TopDown),
            |ui| {
                ui.label(
                    egui::RichText::new(initials)
                        .size(tokens::T_PILL)
                        .strong()
                        .color(tokens::WHITE),
                );
            },
        );
    });
}

/// Sidebar nav row: soft neutral fill when active, never a color block.
/// Quiet gray count or a red money pill on the right.
pub fn nav_item(
    ui: &mut egui::Ui,
    active: bool,
    label: &str,
    quiet_count: Option<&str>,
    alert_count: Option<&str>,
) -> egui::Response {
    let btn = egui::Button::new(
        egui::RichText::new(label)
            .size(tokens::T_BODY)
            .color(tokens::TEXT)
            .strong(),
    )
    .fill(if active {
        tokens::NAV_ACTIVE
    } else {
        tokens::TRANSPARENT
    })
    .stroke(egui::Stroke::NONE)
    .corner_radius(egui::CornerRadius::same(tokens::R_NAV))
    .min_size(egui::vec2(0.0, tokens::NAV_H))
    .frame(true);
    ui.horizontal(|ui| {
        ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
        let badge_w = if alert_count.is_some() { 36.0 } else { 0.0 };
        let resp = ui.add_sized(
            egui::vec2((ui.available_width() - badge_w).max(80.0), tokens::NAV_H),
            btn,
        );
        if let Some(n) = alert_count {
            egui::Frame {
                fill: tokens::DANGER,
                corner_radius: egui::CornerRadius::same(10),
                inner_margin: egui::Margin::symmetric(8, 4),
                ..Default::default()
            }
            .show(ui, |ui| {
                ui.label(
                    egui::RichText::new(n)
                        .size(tokens::T_PILL)
                        .strong()
                        .color(tokens::WHITE),
                );
            });
        } else if let Some(n) = quiet_count {
            ui.label(
                egui::RichText::new(n)
                    .size(tokens::T_SECONDARY)
                    .color(tokens::MUTED),
            );
        }
        resp
    })
    .inner
}

/// Solid green primary CTA (h38–42, 8–10px radius, medium white label).
pub fn primary_button(ui: &mut egui::Ui, text: &str) -> egui::Response {
    ui.add(
        egui::Button::new(
            egui::RichText::new(text)
                .size(tokens::T_BODY)
                .color(tokens::WHITE)
                .strong(),
        )
        .fill(tokens::CTA_GREEN)
        .stroke(egui::Stroke::NONE)
        .corner_radius(egui::CornerRadius::same(tokens::R_INPUT))
        .min_size(egui::vec2(0.0, tokens::BTN_H)),
    )
}

/// White secondary button with a 1px warm border.
pub fn outline_button(ui: &mut egui::Ui, text: &str) -> egui::Response {
    ui.add(
        egui::Button::new(
            egui::RichText::new(text)
                .size(tokens::T_BODY)
                .color(tokens::TEXT)
                .strong(),
        )
        .fill(tokens::CARD)
        .stroke(tokens::border())
        .corner_radius(egui::CornerRadius::same(tokens::R_INPUT))
        .min_size(egui::vec2(0.0, tokens::BTN_H)),
    )
}

/// Quiet destructive / tertiary action: text only, never a red button.
pub fn text_button(ui: &mut egui::Ui, text: &str) -> egui::Response {
    ui.add(
        egui::Button::new(
            egui::RichText::new(text)
                .size(tokens::T_BODY)
                .color(tokens::TEXT),
        )
        .fill(tokens::TRANSPARENT)
        .stroke(egui::Stroke::NONE)
        .frame(false)
        .min_size(egui::vec2(0.0, tokens::BTN_H)),
    )
}

/// Full-width 40px search input with hint text.
pub fn search_field(ui: &mut egui::Ui, text: &mut String, hint: &str) {
    ui.add_sized(
        egui::vec2(ui.available_width(), tokens::NAV_H),
        egui::TextEdit::singleline(text)
            .hint_text(
                egui::RichText::new(hint)
                    .size(tokens::T_BODY)
                    .color(tokens::MUTED),
            )
            .margin(egui::Margin::symmetric(12, 8)),
    );
}

/// 42px labeled input (label above, 8px gap per spec §9.10).
pub fn field(ui: &mut egui::Ui, label: &str, text: &mut String, hint: &str) {
    ui.label(
        egui::RichText::new(label)
            .size(tokens::T_SECONDARY)
            .strong()
            .color(tokens::TEXT),
    );
    ui.add_space(8.0);
    ui.add_sized(
        egui::vec2(ui.available_width(), tokens::INPUT_H),
        egui::TextEdit::singleline(text)
            .hint_text(
                egui::RichText::new(hint)
                    .size(tokens::T_BODY)
                    .color(tokens::MUTED),
            )
            .margin(egui::Margin::symmetric(12, 8)),
    );
}

/// Multi-line notes area (~90px, same chrome as inputs).
pub fn multiline(ui: &mut egui::Ui, text: &mut String, hint: &str) {
    ui.add_sized(
        egui::vec2(ui.available_width(), 90.0),
        egui::TextEdit::multiline(text)
            .hint_text(
                egui::RichText::new(hint)
                    .size(tokens::T_BODY)
                    .color(tokens::MUTED),
            )
            .margin(egui::Margin::symmetric(12, 8)),
    );
}

/// KPI summary card: label / big value / sub-line, no icons or charts.
pub fn kpi_card(ui: &mut egui::Ui, kpi: &Kpi) {
    egui::Frame {
        fill: tokens::CARD,
        stroke: tokens::border(),
        corner_radius: egui::CornerRadius::same(tokens::R_CARD),
        inner_margin: egui::Margin::same(20),
        ..Default::default()
    }
    .show(ui, |ui| {
        ui.set_width(ui.available_width());
        ui.label(
            egui::RichText::new(kpi.label)
                .size(tokens::T_SECONDARY)
                .color(tokens::SECONDARY),
        );
        ui.add_space(6.0);
        ui.label(
            egui::RichText::new(kpi.value)
                .size(tokens::T_KPI)
                .strong()
                .color(if kpi.alert {
                    tokens::DANGER
                } else {
                    tokens::TEXT
                }),
        );
        ui.add_space(4.0);
        ui.label(
            egui::RichText::new(kpi.sub)
                .size(tokens::T_SECONDARY)
                .color(tokens::MUTED),
        );
    });
}

/// Segmented single-select (van / crew / customer type): joined soft
/// container, selected segment white. N≤3 only — longer lists use ComboBox.
pub fn segmented(ui: &mut egui::Ui, options: &[&str], selected: &mut usize) {
    egui::Frame {
        fill: tokens::SOFT_FILL,
        corner_radius: egui::CornerRadius::same(tokens::R_NAV),
        inner_margin: egui::Margin::same(4),
        ..Default::default()
    }
    .show(ui, |ui| {
        ui.horizontal(|ui| {
            ui.spacing_mut().item_spacing = egui::vec2(4.0, 0.0);
            for (i, opt) in options.iter().enumerate() {
                let on = *selected == i;
                if ui
                    .add(
                        egui::Button::new(
                            egui::RichText::new(*opt)
                                .size(tokens::T_BODY)
                                .color(tokens::TEXT)
                                .strong(),
                        )
                        .fill(if on {
                            tokens::WHITE
                        } else {
                            tokens::TRANSPARENT
                        })
                        .stroke(if on {
                            tokens::border()
                        } else {
                            egui::Stroke::NONE
                        })
                        .corner_radius(egui::CornerRadius::same(6))
                        .min_size(egui::vec2(0.0, 32.0)),
                    )
                    .clicked()
                {
                    *selected = i;
                }
            }
        });
    });
}

/// Toggle pill tag (multi-select, default off).
pub fn tag(ui: &mut egui::Ui, text: &str, on: bool) -> egui::Response {
    ui.add(
        egui::Button::new(
            egui::RichText::new(text)
                .size(tokens::T_SECONDARY)
                .color(if on {
                    tokens::DARK_GREEN_TEXT
                } else {
                    tokens::TEXT
                })
                .strong(),
        )
        .fill(if on {
            tokens::LIGHT_GREEN
        } else {
            tokens::TRANSPARENT
        })
        .stroke(tokens::border())
        .corner_radius(egui::CornerRadius::same(tokens::R_PILL))
        .min_size(egui::vec2(0.0, 30.0)),
    )
}

/// Numbered stop circle, tinted by van color.
pub fn stop_circle(ui: &mut egui::Ui, n: u32, bg: egui::Color32, fg: egui::Color32) {
    egui::Frame {
        fill: bg,
        corner_radius: egui::CornerRadius::same(14),
        ..Default::default()
    }
    .show(ui, |ui| {
        ui.allocate_ui_with_layout(
            egui::vec2(28.0, 28.0),
            egui::Layout::centered_and_justified(egui::Direction::TopDown),
            |ui| {
                ui.label(
                    egui::RichText::new(n.to_string())
                        .size(tokens::T_SECONDARY)
                        .strong()
                        .color(fg),
                );
            },
        );
    });
}

/// Horizontal 4-node status stepper: Booked — In progress — Done — Paid.
pub fn stepper(ui: &mut egui::Ui, current: usize) {
    const STEPS: [&str; 4] = ["Booked", "In progress", "Done", "Paid"];
    ui.horizontal(|ui| {
        ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
        for (i, step) in STEPS.iter().enumerate() {
            let done = i < current;
            let here = i == current;
            // Geometric nodes (no ✓/●/○ glyphs in bundled fonts).
            if done {
                egui::Frame {
                    fill: tokens::CTA_GREEN,
                    corner_radius: egui::CornerRadius::same(10),
                    ..Default::default()
                }
                .show(ui, |ui| {
                    ui.allocate_ui_with_layout(
                        egui::vec2(20.0, 20.0),
                        egui::Layout::centered_and_justified(egui::Direction::TopDown),
                        |_| {},
                    );
                });
            } else if here {
                egui::Frame {
                    fill: tokens::LIGHT_GREEN,
                    stroke: egui::Stroke::new(2.0, tokens::CTA_GREEN),
                    corner_radius: egui::CornerRadius::same(10),
                    ..Default::default()
                }
                .show(ui, |ui| {
                    ui.allocate_ui_with_layout(
                        egui::vec2(20.0, 20.0),
                        egui::Layout::centered_and_justified(egui::Direction::TopDown),
                        |ui| {
                            let (r, _) =
                                ui.allocate_exact_size(egui::vec2(8.0, 8.0), egui::Sense::hover());
                            ui.painter()
                                .circle_filled(r.center(), 3.0, tokens::CTA_GREEN);
                        },
                    );
                });
            } else {
                egui::Frame {
                    fill: tokens::TRANSPARENT,
                    stroke: tokens::border(),
                    corner_radius: egui::CornerRadius::same(10),
                    ..Default::default()
                }
                .show(ui, |ui| {
                    ui.allocate_ui_with_layout(
                        egui::vec2(20.0, 20.0),
                        egui::Layout::centered_and_justified(egui::Direction::TopDown),
                        |_| {},
                    );
                });
            }
            ui.label(
                egui::RichText::new(*step)
                    .size(tokens::T_BODY)
                    .strong()
                    .color(if done || here {
                        tokens::TEXT
                    } else {
                        tokens::MUTED
                    }),
            );
            if i < STEPS.len() - 1 {
                ui.label(egui::RichText::new("──").size(10.0).color(if done {
                    tokens::CTA_GREEN
                } else {
                    tokens::BORDER
                }));
            }
        }
    });
}

/// Empty state per spec §13: centered icon + gray text + outline action.
pub fn empty_state(ui: &mut egui::Ui, title: &str, hint: &str, action: &str) -> egui::Response {
    ui.vertical_centered(|ui| {
        ui.add_space(60.0);
        egui::Frame {
            fill: tokens::TRANSPARENT,
            stroke: tokens::border(),
            corner_radius: egui::CornerRadius::same(24),
            ..Default::default()
        }
        .show(ui, |ui| {
            ui.allocate_ui_with_layout(
                egui::vec2(48.0, 48.0),
                egui::Layout::centered_and_justified(egui::Direction::TopDown),
                |_| {},
            );
        });
        ui.add_space(8.0);
        ui.label(
            egui::RichText::new(title)
                .size(tokens::T_BODY)
                .strong()
                .color(tokens::SECONDARY),
        );
        ui.add_space(4.0);
        ui.label(
            egui::RichText::new(hint)
                .size(tokens::T_SECONDARY)
                .color(tokens::MUTED),
        );
        ui.add_space(16.0);
        outline_button(ui, action)
    })
    .inner
}
