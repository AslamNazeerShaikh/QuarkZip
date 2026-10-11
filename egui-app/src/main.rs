//! QuarkZip egui entry: transparent macOS viewport, traffic lights kept,
//! content under a clear titlebar strip, translucency via token alphas.
//!
//! Real vibrancy blur (`NSVisualEffectView`) is unreachable from pure egui —
//! the translucency here is alpha compositing over the desktop, strongest on
//! the sidebar, faintest on cards so text stays crisp.

mod app;
mod data;
mod tokens;
mod widgets;

use eframe::egui;

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_title("QuarkZip")
            .with_app_id("com.quarkzip.egui")
            .with_inner_size([1440.0, 900.0])
            .with_min_inner_size([1200.0, 720.0])
            .with_decorations(true)
            .with_transparent(true)
            .with_fullsize_content_view(true)
            .with_title_shown(false)
            .with_titlebar_shown(false)
            .with_titlebar_buttons_shown(true)
            .with_has_shadow(true)
            .with_movable_by_background(true)
            .with_drag_and_drop(true),
        ..Default::default()
    };
    eframe::run_native(
        "QuarkZip",
        options,
        Box::new(|cc| Ok(Box::new(app::CrmApp::new(&cc.egui_ctx)) as Box<dyn eframe::App>)),
    )
}
