//! QuarkZip egui entry: the Tauri app's archive manager UI in pure Rust.
//!
//! The 7-Zip engine is shared by path (`archive`, `sevenzip` — the same
//! sources the Tauri backend compiles); only the Tauri command layer is
//! re-expressed as threads + channels in `engine`. Window: 800×675,
//! transparent, traffic lights floating over a 92px title strip.

#[path = "../../src-tauri/src/archive.rs"]
#[allow(dead_code)]
mod archive;
#[path = "../../src-tauri/src/sevenzip.rs"]
#[allow(dead_code)]
mod sevenzip;

mod app;
mod dialogs;
mod engine;
mod file_kind;
mod fmt;
mod i18n;
mod overview;
mod prefs;
mod selection;
mod theme;
mod tree;
mod widgets;

use eframe::egui;

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_title("QuarkZip")
            .with_app_id("com.quarkzip.app")
            .with_inner_size([800.0, 675.0])
            .with_min_inner_size([720.0, 560.0])
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
        Box::new(|cc| Ok(Box::new(app::QuarkApp::new(&cc.egui_ctx)) as Box<dyn eframe::App>)),
    )
}
