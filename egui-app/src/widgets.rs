//! Shared primitives: buttons, cards, pills, progress, skeletons, dialog
//! shell, painted glyphs. One look everywhere (h-9 chrome, 9–10px radii,
//! native arrow cursor, press-scale left to egui's click response).

use crate::theme::QzTheme;
use eframe::egui;

/// Mix `hue` over `base` (the `.qz-tint-*` 14–16% shells).
pub fn tint(base: egui::Color32, hue: egui::Color32, pct: f32) -> egui::Color32 {
    let m = (pct.clamp(0.0, 1.0) * 255.0) as u8;
    egui::Color32::from_rgba_unmultiplied(
        ((hue.r() as u16 * m as u16 + base.r() as u16 * (255 - m as u16)) / 255) as u8,
        ((hue.g() as u16 * m as u16 + base.g() as u16 * (255 - m as u16)) / 255) as u8,
        ((hue.b() as u16 * m as u16 + base.b() as u16 * (255 - m as u16)) / 255) as u8,
        base.a(),
    )
}

pub fn card_frame(t: &QzTheme) -> egui::Frame {
    egui::Frame {
        fill: t.surface,
        stroke: egui::Stroke::new(1.0, t.border),
        corner_radius: egui::CornerRadius::same(13),
        ..Default::default()
    }
}

/// Translucent chrome shell (title strip, footer shells, menus, headers).
pub fn bar_frame(t: &QzTheme) -> egui::Frame {
    egui::Frame {
        fill: t.bar_bg,
        stroke: egui::Stroke::new(1.0, t.border),
        corner_radius: egui::CornerRadius::same(10),
        inner_margin: egui::Margin::same(4),
        ..Default::default()
    }
}

pub fn dialog_frame(t: &QzTheme) -> egui::Frame {
    egui::Frame {
        fill: t.bar_bg,
        stroke: egui::Stroke::new(1.0, t.border),
        corner_radius: egui::CornerRadius::same(16),
        inner_margin: egui::Margin::same(24),
        shadow: egui::Shadow {
            offset: [0, 20],
            blur: 60,
            spread: 0,
            color: if t.dark {
                egui::Color32::from_black_alpha(128)
            } else {
                egui::Color32::from_black_alpha(30)
            },
        },
        ..Default::default()
    }
}

fn btn_base(text: &str, t: &QzTheme) -> egui::RichText {
    egui::RichText::new(text).size(13.0).color(t.text)
}

/// Primary CTA (accent fill, on-primary label, h-9).
pub fn primary_button(ui: &mut egui::Ui, text: &str, t: &QzTheme) -> egui::Response {
    ui.add(
        egui::Button::new(
            egui::RichText::new(text)
                .size(13.0)
                .color(t.on_primary)
                .strong(),
        )
        .fill(t.primary)
        .stroke(egui::Stroke::NONE)
        .corner_radius(egui::CornerRadius::same(9))
        .min_size(egui::vec2(0.0, 36.0)),
    )
}

/// Secondary outline button (h-9).
pub fn secondary_button(ui: &mut egui::Ui, text: &str, t: &QzTheme) -> egui::Response {
    ui.add(
        egui::Button::new(btn_base(text, t).strong())
            .fill(t.surface)
            .stroke(egui::Stroke::new(1.0, t.border))
            .corner_radius(egui::CornerRadius::same(9))
            .min_size(egui::vec2(0.0, 36.0)),
    )
}

/// Success-tinted shell (Extract All): green tint fill, body-text label.
pub fn success_button(ui: &mut egui::Ui, text: &str, t: &QzTheme) -> egui::Response {
    ui.add(
        egui::Button::new(btn_base(text, t).strong())
            .fill(tint(t.bar_bg, t.extract, 0.14))
            .stroke(egui::Stroke::new(1.0, t.border))
            .corner_radius(egui::CornerRadius::same(9))
            .min_size(egui::vec2(0.0, 36.0)),
    )
}

/// Warning-tinted shell (Cancel buttons).
pub fn warning_button(ui: &mut egui::Ui, text: &str, t: &QzTheme) -> egui::Response {
    ui.add(
        egui::Button::new(btn_base(text, t).strong())
            .fill(tint(t.bar_bg, t.warning, 0.14))
            .stroke(egui::Stroke::new(1.0, t.border))
            .corner_radius(egui::CornerRadius::same(9))
            .min_size(egui::vec2(0.0, 36.0)),
    )
}

/// h-9 tinted shell (Open / footer buttons): tinted fill, body label.
pub fn tint_button(
    ui: &mut egui::Ui,
    text: &str,
    t: &QzTheme,
    hue: egui::Color32,
) -> egui::Response {
    ui.add(
        egui::Button::new(btn_base(text, t))
            .fill(tint(t.bar_bg, hue, 0.15))
            .stroke(egui::Stroke::new(1.0, t.border))
            .corner_radius(egui::CornerRadius::same(10))
            .min_size(egui::vec2(0.0, 36.0)),
    )
}

/// 28px icon button inside an h-9 shell (Test/Checksum/Theme/Language/About).
pub fn shell_icon_button(ui: &mut egui::Ui, _t: &QzTheme) -> egui::Response {
    ui.add(
        egui::Button::new("")
            .fill(egui::Color32::TRANSPARENT)
            .stroke(egui::Stroke::NONE)
            .corner_radius(egui::CornerRadius::same(8))
            .min_size(egui::vec2(28.0, 28.0)),
    )
}

/// Square checkbox with drawn check/dash (tri-state, no font glyphs).
pub fn checkbox_box(
    ui: &mut egui::Ui,
    state: crate::selection::NodeState,
    t: &QzTheme,
) -> egui::Response {
    use crate::selection::NodeState as S;
    let (rect, resp) = ui.allocate_exact_size(egui::vec2(20.0, 20.0), egui::Sense::click());
    let box_rect = egui::Rect::from_center_size(rect.center(), egui::vec2(15.0, 15.0));
    let p = ui.painter_at(rect);
    let (fill, stroke) = match state {
        S::Unchecked => (egui::Color32::TRANSPARENT, egui::Stroke::new(1.0, t.border)),
        _ => (t.primary, egui::Stroke::NONE),
    };
    p.rect_filled(box_rect, 4.0, fill);
    p.rect_stroke(box_rect, 4.0, stroke, egui::StrokeKind::Inside);
    let c = box_rect.center();
    match state {
        S::Checked => {
            let s = egui::Stroke::new(2.0, t.on_primary);
            p.line_segment([c + egui::vec2(-4.5, 0.0), c + egui::vec2(-1.0, 3.5)], s);
            p.line_segment([c + egui::vec2(-1.0, 3.5), c + egui::vec2(4.5, -3.5)], s);
        }
        S::Mixed => {
            p.line_segment(
                [c + egui::vec2(-4.0, 0.0), c + egui::vec2(4.0, 0.0)],
                egui::Stroke::new(2.0, t.on_primary),
            );
        }
        S::Unchecked => {}
    }
    if resp.hovered() {
        p.rect_stroke(
            box_rect,
            4.0,
            egui::Stroke::new(1.0, t.muted),
            egui::StrokeKind::Inside,
        );
    }
    resp
}

/// Single-line text input (h-9 chrome).
pub fn text_input(
    ui: &mut egui::Ui,
    value: &mut String,
    hint: &str,
    t: &QzTheme,
    width: f32,
) -> egui::Response {
    ui.add_sized(
        egui::vec2(width, 36.0),
        egui::TextEdit::singleline(value)
            .hint_text(egui::RichText::new(hint).size(13.0).color(t.faint))
            .margin(egui::Margin::symmetric(12, 8)),
    )
}

/// Status pill: dot + 12px semibold text on a tinted rounded fill.
pub fn pill(
    ui: &mut egui::Ui,
    text: &str,
    dot: egui::Color32,
    bg: egui::Color32,
    fg: egui::Color32,
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
            let (r, _) = ui.allocate_exact_size(egui::vec2(10.0, 10.0), egui::Sense::hover());
            ui.painter().circle_filled(r.center(), 3.5, dot);
            ui.label(egui::RichText::new(text).size(12.0).strong().color(fg));
        });
    });
}

/// Micro label: 11px uppercase, letter-spaced feel via casing, faint.
pub fn micro_label(ui: &mut egui::Ui, text: &str, t: &QzTheme) {
    ui.label(
        egui::RichText::new(text.to_uppercase())
            .size(11.0)
            .strong()
            .color(t.faint),
    );
}

/// Determinate progress bar (h-2 track + primary fill + pct caption).
pub fn progress_bar(ui: &mut egui::Ui, frac: f32, caption: &str, t: &QzTheme) {
    let w = ui.available_width();
    let (rect, _) = ui.allocate_exact_size(egui::vec2(w, 8.0), egui::Sense::hover());
    let p = ui.painter_at(rect);
    p.rect_filled(rect, 4.0, t.surface2);
    let fill = egui::Rect::from_min_size(
        rect.min,
        egui::vec2(rect.width() * frac.clamp(0.0, 1.0), 8.0),
    );
    if fill.width() > 0.5 {
        p.rect_filled(fill, 4.0, t.primary);
    }
    ui.add_space(4.0);
    ui.label(egui::RichText::new(caption).size(12.0).color(t.faint));
}

/// Indeterminate bar: a chunk sliding across the track (time-driven;
/// callers repaint while busy).
pub fn indeterminate_bar(ui: &mut egui::Ui, t: &QzTheme, now: f64) {
    let now = now as f32;
    let w = ui.available_width();
    let (rect, _) = ui.allocate_exact_size(egui::vec2(w, 8.0), egui::Sense::hover());
    let p = ui.painter_at(rect);
    p.rect_filled(rect, 4.0, t.surface2);
    let chunk = rect.width() * 0.25;
    let span = rect.width() + chunk;
    let x = rect.min.x - chunk + ((now * span / 1.2) % span);
    p.rect_filled(
        egui::Rect::from_min_size(egui::pos2(x, rect.min.y), egui::vec2(chunk, 8.0)),
        4.0,
        t.primary,
    );
}

/// Skeleton shimmer row: static theme-aware bars (the shimmer animates in
/// the web build; here loading already repaints every frame).
pub fn skeleton_bars(ui: &mut egui::Ui, t: &QzTheme, widths: &[f32]) {
    ui.horizontal(|ui| {
        ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
        for w in widths {
            let (r, _) = ui.allocate_exact_size(egui::vec2(*w, 12.0), egui::Sense::hover());
            ui.painter().rect_filled(r, 6.0, t.surface2);
        }
    });
}

/// Painted check mark (dialog success icons).
pub fn paint_check(p: &egui::Painter, rect: egui::Rect, color: egui::Color32) {
    let c = rect.center();
    let s = egui::Stroke::new(2.5, color);
    p.line_segment([c + egui::vec2(-7.0, 0.5), c + egui::vec2(-1.5, 5.5)], s);
    p.line_segment([c + egui::vec2(-1.5, 5.5), c + egui::vec2(7.0, -5.5)], s);
}

/// Painted cross (dialog failure icons).
pub fn paint_cross(p: &egui::Painter, rect: egui::Rect, color: egui::Color32) {
    let c = rect.center();
    let s = egui::Stroke::new(2.5, color);
    p.line_segment([c + egui::vec2(-5.5, -5.5), c + egui::vec2(5.5, 5.5)], s);
    p.line_segment([c + egui::vec2(-5.5, 5.5), c + egui::vec2(5.5, -5.5)], s);
}

/// Painted download arrow (extract icon).
pub fn paint_download(p: &egui::Painter, rect: egui::Rect, color: egui::Color32) {
    let c = rect.center();
    let s = egui::Stroke::new(2.5, color);
    p.line_segment([c + egui::vec2(0.0, -7.0), c + egui::vec2(0.0, 5.0)], s);
    p.line_segment([c + egui::vec2(-5.0, 0.5), c + egui::vec2(0.0, 5.5)], s);
    p.line_segment([c + egui::vec2(5.0, 0.5), c + egui::vec2(0.0, 5.5)], s);
    p.line_segment([c + egui::vec2(-7.0, 8.0), c + egui::vec2(7.0, 8.0)], s);
}

/// Painted folder mark (load dialog icon).
pub fn paint_folder(p: &egui::Painter, rect: egui::Rect, color: egui::Color32) {
    let r = egui::Rect::from_center_size(rect.center(), egui::vec2(20.0, 14.0));
    let s = egui::Stroke::new(2.0, color);
    p.rect_stroke(r, 2.0, s, egui::StrokeKind::Inside);
    p.line_segment(
        [
            egui::pos2(r.min.x, r.min.y),
            egui::pos2(r.min.x + 7.0, r.min.y - 4.0),
        ],
        s,
    );
    p.line_segment(
        [
            egui::pos2(r.min.x + 7.0, r.min.y - 4.0),
            egui::pos2(r.min.x + 13.0, r.min.y - 4.0),
        ],
        s,
    );
    p.line_segment(
        [
            egui::pos2(r.min.x + 13.0, r.min.y - 4.0),
            egui::pos2(r.min.x + 13.0, r.min.y),
        ],
        s,
    );
}

/// Painted lock (password icon): squared shackle + body.
pub fn paint_lock(p: &egui::Painter, rect: egui::Rect, color: egui::Color32) {
    let c = rect.center();
    let s = egui::Stroke::new(2.0, color);
    let body = egui::Rect::from_center_size(c + egui::vec2(0.0, 4.0), egui::vec2(14.0, 11.0));
    p.rect_stroke(body, 2.0, s, egui::StrokeKind::Inside);
    p.line_segment(
        [
            egui::pos2(c.x - 5.0, body.min.y),
            egui::pos2(c.x - 5.0, c.y - 4.0),
        ],
        s,
    );
    p.line_segment(
        [
            egui::pos2(c.x + 5.0, body.min.y),
            egui::pos2(c.x + 5.0, c.y - 4.0),
        ],
        s,
    );
    p.line_segment(
        [
            egui::pos2(c.x - 5.0, c.y - 4.0),
            egui::pos2(c.x + 5.0, c.y - 4.0),
        ],
        s,
    );
}

/// Painted shield (test/permission icon).
pub fn paint_shield(p: &egui::Painter, rect: egui::Rect, color: egui::Color32) {
    let c = rect.center();
    let s = egui::Stroke::new(2.0, color);
    let pts = [
        c + egui::vec2(-7.0, -6.0),
        c + egui::vec2(7.0, -6.0),
        c + egui::vec2(7.0, 1.0),
        c + egui::vec2(0.0, 8.0),
        c + egui::vec2(-7.0, 1.0),
    ];
    for i in 0..pts.len() {
        p.line_segment([pts[i], pts[(i + 1) % pts.len()]], s);
    }
}

/// Centered dialog icon disc (48px, tinted fill, painted glyph).
pub fn dialog_icon(
    ui: &mut egui::Ui,
    bg: egui::Color32,
    paint: impl FnOnce(&egui::Painter, egui::Rect),
) {
    ui.horizontal(|ui| {
        ui.add_space((ui.available_width() - 48.0).max(0.0) / 2.0);
        let (r, _) = ui.allocate_exact_size(egui::vec2(48.0, 48.0), egui::Sense::hover());
        ui.painter().circle_filled(r.center(), 24.0, bg);
        paint(ui.painter(), r);
    });
}

/// Frosted dialog veil: bright wash over the app in light, dark wash in
/// dark (the blur has no egui equivalent — alpha only, same opacities).
/// Returns early when closed so callers stay flat.
pub fn veil(ctx: &egui::Context, t: &QzTheme) {
    let wash = if t.dark {
        egui::Color32::from_black_alpha(115)
    } else {
        egui::Color32::from_white_alpha(115)
    };
    egui::Area::new(egui::Id::new("qz-veil"))
        .order(egui::Order::Middle)
        .fixed_pos(egui::pos2(0.0, 0.0))
        .show(ctx, |ui| {
            let r = ctx.viewport_rect();
            ui.allocate_rect(r, egui::Sense::click());
            ui.painter().rect_filled(r, 0.0, wash);
        });
}

/// Dialog card window: 448 wide, centered, big soft shadow.
pub fn dialog_card<R>(
    ctx: &egui::Context,
    id: &str,
    t: &QzTheme,
    add_contents: impl FnOnce(&mut egui::Ui) -> R,
) -> R {
    egui::Window::new(id)
        .title_bar(false)
        .resizable(false)
        .collapsible(false)
        .anchor(egui::Align2::CENTER_CENTER, egui::vec2(0.0, 0.0))
        .frame(dialog_frame(t))
        .show(ctx, |ui| {
            ui.set_width(400.0);
            add_contents(ui)
        })
        .and_then(|resp| resp.inner)
        .expect("dialog card")
}
