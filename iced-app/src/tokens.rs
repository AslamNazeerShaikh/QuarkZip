//! Design tokens — the same ReferenceUi system as the egui app.
//!
//! Warm neutrals, 8px grid, radius ladder, medium-weight type. Surfaces
//! carry alpha (the window runs transparent) — sidebar most translucent,
//! cards near-opaque so text stays crisp.

use iced::{theme::Palette, Color, Theme};

/// Sidebar surface: #F5F4F1, most translucent.
pub const SIDEBAR: Color = Color::from_rgba8(245, 244, 241, 0.84);
/// Main content surface: #F7F6F3.
pub const CONTENT: Color = Color::from_rgba8(247, 246, 243, 0.92);
/// Cards / inputs / drawers: white, near-opaque.
pub const CARD: Color = Color::from_rgba8(255, 255, 255, 0.96);
/// Flat dim behind drawer/modal (~18% black, never heavy blur).
pub const DIM: Color = Color::from_rgba8(0, 0, 0, 0.18);

pub const TEXT: Color = Color::from_rgb8(23, 23, 23);
pub const SECONDARY: Color = Color::from_rgb8(102, 102, 102);
pub const MUTED: Color = Color::from_rgb8(138, 138, 138);
pub const BORDER: Color = Color::from_rgb8(221, 221, 216);
pub const SOFT_FILL: Color = Color::from_rgb8(240, 239, 236);
/// Active nav fill: soft neutral, never a color block.
pub const NAV_ACTIVE: Color = Color::from_rgba8(236, 235, 232, 0.86);

pub const CTA_GREEN: Color = Color::from_rgb8(20, 122, 90);
pub const CTA_GREEN_DIM: Color = Color::from_rgb8(126, 164, 148);
pub const LIGHT_GREEN: Color = Color::from_rgb8(231, 245, 237);
pub const DARK_GREEN_TEXT: Color = Color::from_rgb8(43, 125, 90);
pub const DANGER: Color = Color::from_rgb8(169, 68, 68);
pub const INFO_BLUE: Color = Color::from_rgb8(61, 115, 217);
pub const LIGHT_BLUE: Color = Color::from_rgb8(237, 243, 255);
pub const WARN_ORANGE: Color = Color::from_rgb8(217, 122, 24);
pub const LIGHT_ORANGE: Color = Color::from_rgb8(255, 243, 228);
pub const LIGHT_AMBER: Color = Color::from_rgb8(254, 240, 213);
pub const WHITE: Color = Color::WHITE;

pub fn theme() -> Theme {
    Theme::custom(
        "QuarkZip",
        Palette {
            background: CONTENT,
            text: TEXT,
            primary: CTA_GREEN,
            success: DARK_GREEN_TEXT,
            warning: WARN_ORANGE,
            danger: DANGER,
        },
    )
}
