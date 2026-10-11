//! QuarkZip design tokens in Rust: native macOS semantic palette,
//! light/dark × 8 accents, ported 1:1 from `src/index.css`.
//! Components take a `&QzTheme` — never raw hex, never CSS vars.

use eframe::egui;

pub const ACCENTS: [Accent; 8] = [
    Accent::Blue,
    Accent::Purple,
    Accent::Pink,
    Accent::Red,
    Accent::Orange,
    Accent::Yellow,
    Accent::Green,
    Accent::Graphite,
];

#[derive(Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum ThemeChoice {
    Light,
    Dark,
    #[default]
    System,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum Accent {
    #[default]
    Blue,
    Purple,
    Pink,
    Red,
    Orange,
    Yellow,
    Green,
    Graphite,
}

impl Accent {
    pub fn name(self) -> &'static str {
        match self {
            Accent::Blue => "Blue",
            Accent::Purple => "Purple",
            Accent::Pink => "Pink",
            Accent::Red => "Red",
            Accent::Orange => "Orange",
            Accent::Yellow => "Yellow",
            Accent::Green => "Green",
            Accent::Graphite => "Graphite",
        }
    }
    /// Swatch dot color (the raw system hue per index.css).
    pub fn dot(self, dark: bool) -> egui::Color32 {
        use egui::Color32 as C;
        match (self, dark) {
            (Accent::Blue, false) => C::from_rgb(0, 122, 255),
            (Accent::Blue, true) => C::from_rgb(10, 132, 255),
            (Accent::Purple, false) => C::from_rgb(94, 92, 230),
            (Accent::Purple, true) => C::from_rgb(125, 122, 255),
            (Accent::Pink, false) => C::from_rgb(255, 45, 85),
            (Accent::Pink, true) => C::from_rgb(255, 55, 95),
            (Accent::Red, false) => C::from_rgb(255, 59, 48),
            (Accent::Red, true) => C::from_rgb(255, 69, 58),
            (Accent::Orange, false) => C::from_rgb(255, 149, 0),
            (Accent::Orange, true) => C::from_rgb(255, 159, 10),
            (Accent::Yellow, false) => C::from_rgb(156, 122, 0),
            (Accent::Yellow, true) => C::from_rgb(255, 214, 10),
            (Accent::Green, false) => C::from_rgb(36, 138, 61),
            (Accent::Green, true) => C::from_rgb(48, 209, 88),
            (Accent::Graphite, false) => C::from_rgb(110, 110, 115),
            (Accent::Graphite, true) => C::from_rgb(152, 152, 159),
        }
    }
}

#[derive(Clone, Copy, Debug)]
#[allow(dead_code)] // Role set is intentionally larger than current usage.
pub struct QzTheme {
    pub dark: bool,
    pub bg: egui::Color32,
    pub surface: egui::Color32,
    pub surface2: egui::Color32,
    pub border: egui::Color32,
    pub text: egui::Color32,
    pub muted: egui::Color32,
    pub faint: egui::Color32,
    pub accent: egui::Color32,
    pub primary: egui::Color32,
    pub primary_hover: egui::Color32,
    pub primary_soft: egui::Color32,
    pub on_primary: egui::Color32,
    pub extract: egui::Color32,
    pub open: egui::Color32,
    pub open_soft: egui::Color32,
    pub success: egui::Color32,
    pub success_soft: egui::Color32,
    pub info: egui::Color32,
    pub info_dot: egui::Color32,
    pub info_soft: egui::Color32,
    pub warning: egui::Color32,
    pub warning_dot: egui::Color32,
    pub warning_soft: egui::Color32,
    pub danger: egui::Color32,
    pub danger_soft: egui::Color32,
    pub bar_bg: egui::Color32,
    pub frame_bg: egui::Color32,
    pub glass_text: egui::Color32,
    pub glass_muted: egui::Color32,
}

/// (accent, primary, hover, soft, on_primary) per accent, light then dark.
fn accent_ramp(
    accent: Accent,
    dark: bool,
) -> (
    egui::Color32,
    egui::Color32,
    egui::Color32,
    egui::Color32,
    egui::Color32,
) {
    use egui::Color32 as C;
    let w = C::WHITE;
    let b = C::BLACK;
    match (accent, dark) {
        (Accent::Blue, false) => (
            C::from_rgb(0, 122, 255),
            C::from_rgb(0, 112, 235),
            C::from_rgb(0, 95, 199),
            C::from_rgb(219, 235, 252),
            w,
        ),
        (Accent::Blue, true) => (
            C::from_rgb(10, 132, 255),
            C::from_rgb(10, 132, 255),
            C::from_rgb(0, 114, 229),
            C::from_rgb(36, 53, 70),
            w,
        ),
        (Accent::Purple, false) => (
            C::from_rgb(94, 92, 230),
            C::from_rgb(94, 92, 230),
            C::from_rgb(63, 61, 225),
            C::from_rgb(232, 232, 252),
            w,
        ),
        (Accent::Purple, true) => (
            C::from_rgb(125, 122, 255),
            C::from_rgb(125, 122, 255),
            C::from_rgb(118, 118, 255),
            C::from_rgb(52, 51, 70),
            w,
        ),
        (Accent::Pink, false) => (
            C::from_rgb(255, 45, 85),
            C::from_rgb(234, 0, 45),
            C::from_rgb(198, 0, 38),
            C::from_rgb(252, 219, 226),
            w,
        ),
        (Accent::Pink, true) => (
            C::from_rgb(255, 55, 95),
            C::from_rgb(255, 55, 95),
            C::from_rgb(255, 19, 66),
            C::from_rgb(70, 42, 48),
            w,
        ),
        (Accent::Red, false) => (
            C::from_rgb(255, 59, 48),
            C::from_rgb(237, 13, 0),
            C::from_rgb(201, 11, 0),
            C::from_rgb(252, 221, 219),
            w,
        ),
        (Accent::Red, true) => (
            C::from_rgb(255, 69, 58),
            C::from_rgb(255, 69, 58),
            C::from_rgb(255, 35, 22),
            C::from_rgb(70, 44, 43),
            w,
        ),
        (Accent::Orange, false) => (
            C::from_rgb(255, 149, 0),
            C::from_rgb(179, 98, 0),
            C::from_rgb(143, 78, 0),
            C::from_rgb(244, 233, 219),
            w,
        ),
        (Accent::Orange, true) => (
            C::from_rgb(255, 159, 10),
            C::from_rgb(255, 159, 10),
            C::from_rgb(229, 139, 0),
            C::from_rgb(70, 57, 36),
            w,
        ),
        (Accent::Yellow, false) => (
            C::from_rgb(156, 122, 0),
            C::from_rgb(156, 122, 0),
            C::from_rgb(168, 135, 0),
            C::from_rgb(241, 236, 219),
            b,
        ),
        (Accent::Yellow, true) => (
            C::from_rgb(255, 214, 10),
            C::from_rgb(255, 214, 10),
            C::from_rgb(229, 191, 0),
            C::from_rgb(70, 64, 36),
            b,
        ),
        (Accent::Green, false) => (
            C::from_rgb(36, 138, 61),
            C::from_rgb(35, 134, 59),
            C::from_rgb(28, 106, 47),
            C::from_rgb(224, 238, 228),
            w,
        ),
        (Accent::Green, true) => (
            C::from_rgb(48, 209, 88),
            C::from_rgb(48, 209, 88),
            C::from_rgb(40, 181, 75),
            C::from_rgb(41, 64, 47),
            w,
        ),
        (Accent::Graphite, false) => (
            C::from_rgb(110, 110, 115),
            C::from_rgb(110, 110, 115),
            C::from_rgb(93, 93, 97),
            C::from_rgb(235, 235, 235),
            w,
        ),
        (Accent::Graphite, true) => (
            C::from_rgb(152, 152, 159),
            C::from_rgb(152, 152, 159),
            C::from_rgb(134, 134, 142),
            C::from_rgb(56, 56, 57),
            w,
        ),
    }
}

pub fn theme_for(dark: bool, accent: Accent) -> QzTheme {
    use egui::Color32 as C;
    let (ac, pr, ho, so, on) = accent_ramp(accent, dark);
    if !dark {
        QzTheme {
            dark: false,
            bg: C::from_rgb(236, 236, 236),
            surface: C::WHITE,
            surface2: C::from_rgb(245, 245, 247),
            border: C::from_rgb(198, 198, 200),
            text: C::BLACK,
            muted: C::from_rgb(60, 60, 67),
            faint: C::from_rgb(110, 110, 115),
            accent: ac,
            primary: pr,
            primary_hover: ho,
            primary_soft: so,
            on_primary: on,
            extract: C::from_rgb(31, 122, 51),
            open: C::from_rgb(255, 200, 0),
            open_soft: C::from_rgb(243, 236, 217),
            success: C::from_rgb(31, 122, 51),
            success_soft: C::from_rgb(229, 242, 231),
            info: C::from_rgb(11, 91, 211),
            info_dot: C::from_rgb(11, 91, 211),
            info_soft: C::from_rgb(232, 240, 254),
            warning: C::from_rgb(138, 77, 0),
            warning_dot: C::from_rgb(179, 98, 0),
            warning_soft: C::from_rgb(255, 241, 221),
            danger: C::from_rgb(201, 42, 34),
            danger_soft: C::from_rgb(253, 236, 235),
            bar_bg: C::from_rgba_unmultiplied_const(236, 236, 236, 184),
            frame_bg: C::from_rgba_unmultiplied_const(236, 236, 236, 31),
            glass_text: C::BLACK,
            glass_muted: C::from_rgb(60, 60, 67),
        }
    } else {
        QzTheme {
            dark: true,
            bg: C::from_rgb(30, 30, 30),
            surface: C::from_rgb(40, 40, 40),
            surface2: C::from_rgb(50, 50, 50),
            border: C::from_rgb(74, 74, 74),
            text: C::WHITE,
            muted: C::from_rgb(235, 235, 245),
            faint: C::from_rgb(152, 152, 159),
            accent: ac,
            primary: pr,
            primary_hover: ho,
            primary_soft: so,
            on_primary: on,
            extract: C::from_rgb(76, 195, 138),
            open: C::from_rgb(255, 214, 10),
            open_soft: C::from_rgb(56, 51, 31),
            success: C::from_rgb(76, 195, 138),
            success_soft: C::from_rgb(20, 41, 31),
            info: C::from_rgb(130, 170, 255),
            info_dot: C::from_rgb(130, 170, 255),
            info_soft: C::from_rgb(22, 35, 61),
            warning: C::from_rgb(232, 163, 61),
            warning_dot: C::from_rgb(232, 163, 61),
            warning_soft: C::from_rgb(51, 39, 15),
            danger: C::from_rgb(255, 105, 97),
            danger_soft: C::from_rgb(58, 31, 30),
            bar_bg: C::from_rgba_unmultiplied_const(30, 30, 30, 184),
            frame_bg: C::from_rgba_unmultiplied_const(30, 30, 30, 51),
            glass_text: C::BLACK,
            glass_muted: C::from_rgb(60, 60, 67),
        }
    }
}

pub fn resolve(choice: ThemeChoice, system_dark: bool) -> bool {
    match choice {
        ThemeChoice::Light => false,
        ThemeChoice::Dark => true,
        ThemeChoice::System => system_dark,
    }
}

/// Base egui visuals for the theme: panel fills + widget strokes.
/// Per-widget fills stay explicit at usage sites (cards, shells, pills).
pub fn visuals(t: &QzTheme) -> egui::Visuals {
    let mut v = if t.dark {
        egui::Visuals::dark()
    } else {
        egui::Visuals::light()
    };
    v.panel_fill = t.bg;
    v.window_fill = t.surface;
    v.faint_bg_color = t.surface2;
    v.extreme_bg_color = t.surface;
    v.widgets.noninteractive.bg_stroke = egui::Stroke::new(1.0, t.border);
    v.widgets.inactive.bg_fill = t.surface;
    v.widgets.inactive.bg_stroke = egui::Stroke::new(1.0, t.border);
    v.widgets.inactive.corner_radius = egui::CornerRadius::same(9);
    v.widgets.hovered.bg_stroke = egui::Stroke::new(1.0, t.muted);
    v.widgets.hovered.corner_radius = egui::CornerRadius::same(9);
    v.widgets.active.bg_stroke = egui::Stroke::new(1.0, t.text);
    v.widgets.active.corner_radius = egui::CornerRadius::same(9);
    v.selection.bg_fill = t.primary_soft;
    v.selection.stroke = egui::Stroke::new(1.0, t.primary);
    v.hyperlink_color = t.info;
    v.window_stroke = egui::Stroke::new(1.0, t.border);
    v
}
