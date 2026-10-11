//! QuarkZip iced entry — same CRM shell as the egui app, for comparison.
//!
//! Transparent window + alpha-composited surfaces, like the egui build.

mod app;
mod data;
mod tokens;

use iced::{window, Size, Task};

pub fn main() -> iced::Result {
    iced::application(
        || (app::App::default(), Task::none()),
        app::App::update,
        app::App::view,
    )
    .title("QuarkZip")
    .theme(|_state: &app::App| tokens::theme())
    .window(window::Settings {
        size: Size::new(1440.0, 900.0),
        min_size: Some(Size::new(1200.0, 720.0)),
        ..Default::default()
    })
    .transparent(true)
    .run()
}
