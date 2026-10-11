//! Design tokens — one shared system for every component.
//!
//! Source: `CollegeAdmissionManagementSystem/docs/ReferenceUi`
//! (`Reference-UI-Analysis.md` + `UiPrompt.md`): warm-neutral CRM palette,
//! 8px spacing grid, radius ladder, subtle shadows, medium-weight type.
//!
//! macOS layer on top: the viewport runs transparent (`main.rs`), so every
//! surface fill carries an alpha below 255 — the desktop bleeds through
//! faintly (sidebar most, content least). No full-opacity fills anywhere.
//!
//! The set is intentionally larger than current usage: every screen must
//! draw from these tokens, never one-off values.
#![allow(dead_code)]

use eframe::egui;

// ——— Palette (RGB from the reference spec; alpha = translucency) ———

/// Sidebar surface: #F5F4F1, most translucent (desktop shows through).
pub const SIDEBAR: egui::Color32 = egui::Color32::from_rgba_unmultiplied_const(245, 244, 241, 214);
/// Main content surface: #F7F6F3.
pub const CONTENT: egui::Color32 = egui::Color32::from_rgba_unmultiplied_const(247, 246, 243, 234);
/// Cards / inputs / drawers: white, near-opaque so text stays crisp.
pub const CARD: egui::Color32 = egui::Color32::from_rgba_unmultiplied_const(255, 255, 255, 244);
/// Dim overlay behind drawer/modal: flat black ~20% (spec: never heavy blur).
pub const DIM: egui::Color32 = egui::Color32::from_rgba_unmultiplied_const(0, 0, 0, 46);

pub const TEXT: egui::Color32 = egui::Color32::from_rgb(23, 23, 23);
pub const SECONDARY: egui::Color32 = egui::Color32::from_rgb(102, 102, 102);
pub const MUTED: egui::Color32 = egui::Color32::from_rgb(138, 138, 138);
pub const BORDER: egui::Color32 = egui::Color32::from_rgb(221, 221, 216);
pub const DIVIDER: egui::Color32 = egui::Color32::from_rgb(231, 231, 227);
pub const SOFT_FILL: egui::Color32 = egui::Color32::from_rgb(240, 239, 236);
/// Active nav fill: soft neutral, never a color block.
pub const NAV_ACTIVE: egui::Color32 =
    egui::Color32::from_rgba_unmultiplied_const(236, 235, 232, 220);

pub const CTA_GREEN: egui::Color32 = egui::Color32::from_rgb(20, 122, 90);
pub const CTA_GREEN_DIM: egui::Color32 = egui::Color32::from_rgb(126, 164, 148);
pub const LIGHT_GREEN: egui::Color32 = egui::Color32::from_rgb(231, 245, 237);
pub const DARK_GREEN_TEXT: egui::Color32 = egui::Color32::from_rgb(43, 125, 90);
pub const DANGER: egui::Color32 = egui::Color32::from_rgb(169, 68, 68);
pub const LIGHT_DANGER: egui::Color32 = egui::Color32::from_rgb(251, 236, 236);
pub const INFO_BLUE: egui::Color32 = egui::Color32::from_rgb(61, 115, 217);
pub const LIGHT_BLUE: egui::Color32 = egui::Color32::from_rgb(237, 243, 255);
pub const WARN_ORANGE: egui::Color32 = egui::Color32::from_rgb(217, 122, 24);
pub const LIGHT_ORANGE: egui::Color32 = egui::Color32::from_rgb(255, 243, 228);
pub const LIGHT_AMBER: egui::Color32 = egui::Color32::from_rgb(254, 240, 213);

pub const WHITE: egui::Color32 = egui::Color32::from_rgb(255, 255, 255);
pub const TRANSPARENT: egui::Color32 = egui::Color32::TRANSPARENT;

// ——— Spacing (8px grid) ———

pub const SIDEBAR_W: f32 = 300.0;
pub const PAGE_PAD: f32 = 32.0;
/// Top clearance for the traffic-light strip (fullsize content view).
pub const TITLEBAR_PAD: f32 = 30.0;
pub const CARD_PAD: f32 = 20.0;
pub const CARD_GAP: f32 = 12.0;
pub const INPUT_H: f32 = 42.0;
pub const BTN_H: f32 = 40.0;
pub const NAV_H: f32 = 40.0;
pub const ROW_H: f32 = 76.0;
pub const TABLE_ROW_H: f32 = 68.0;

// ——— Radius ladder (never one radius everywhere) ———

pub const R_CARD: u8 = 12;
pub const R_INPUT: u8 = 9;
pub const R_NAV: u8 = 8;
pub const R_MODAL: u8 = 16;
pub const R_PILL: u8 = 12;
pub const R_AVATAR: u8 = 16;

// ——— Type scale (medium-weight, never bold-everything) ———

pub const T_TITLE: f32 = 26.0;
pub const T_SECTION: f32 = 16.0;
pub const T_BODY: f32 = 14.0;
pub const T_SECONDARY: f32 = 13.0;
pub const T_META: f32 = 12.0;
pub const T_PILL: f32 = 12.0;
pub const T_KPI: f32 = 26.0;

/// Base visuals: light theme, subtle strokes, soft popup shadow.
pub fn visuals() -> egui::Visuals {
    let mut v = egui::Visuals::light();
    v.panel_fill = CONTENT;
    v.window_fill = CARD;
    v.faint_bg_color = SOFT_FILL;
    v.extreme_bg_color = CARD;
    v.widgets.noninteractive.bg_stroke = egui::Stroke::new(1.0, BORDER);
    v.widgets.inactive.bg_fill = CARD;
    v.widgets.inactive.bg_stroke = egui::Stroke::new(1.0, BORDER);
    v.widgets.inactive.corner_radius = egui::CornerRadius::same(R_INPUT);
    v.widgets.hovered.bg_stroke = egui::Stroke::new(1.0, SECONDARY);
    v.widgets.hovered.corner_radius = egui::CornerRadius::same(R_INPUT);
    v.widgets.active.bg_stroke = egui::Stroke::new(1.0, TEXT);
    v.widgets.active.corner_radius = egui::CornerRadius::same(R_INPUT);
    v.selection.bg_fill = LIGHT_GREEN;
    v.selection.stroke = egui::Stroke::new(1.0, CTA_GREEN);
    v.window_stroke = egui::Stroke::new(1.0, BORDER);
    v.window_shadow = egui::Shadow {
        offset: [0, 20],
        blur: 60,
        spread: 0,
        color: egui::Color32::from_rgba_unmultiplied_const(0, 0, 0, 30),
    };
    v.popup_shadow = egui::Shadow {
        offset: [-12, 0],
        blur: 40,
        spread: 0,
        color: egui::Color32::from_rgba_unmultiplied_const(0, 0, 0, 20),
    };
    v
}

/// 1px warm border used on every card/input.
pub fn border() -> egui::Stroke {
    egui::Stroke::new(1.0, BORDER)
}
