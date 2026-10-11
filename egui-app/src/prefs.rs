//! Persisted prefs (theme choice, accent, language, collapsed card):
//! tiny JSON file under the user config dir. Best-effort throughout —
//! a missing/unwritable file keeps session defaults.

use crate::{
    i18n::Lang,
    theme::{Accent, ThemeChoice},
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct File {
    theme: String,
    accent: String,
    lang: String,
    collapsed: bool,
}

pub struct Prefs {
    pub theme: ThemeChoice,
    pub accent: Accent,
    pub lang: Lang,
    pub collapsed: bool,
}

impl Default for Prefs {
    fn default() -> Self {
        Self {
            theme: ThemeChoice::System,
            accent: Accent::Blue,
            lang: Lang::En,
            collapsed: false,
        }
    }
}

fn path() -> Option<std::path::PathBuf> {
    let home = std::env::var("HOME").ok()?;
    Some(
        std::path::PathBuf::from(home)
            .join(".config")
            .join("quarkzip-egui.json"),
    )
}

fn parse_theme(s: &str) -> ThemeChoice {
    match s {
        "light" => ThemeChoice::Light,
        "dark" => ThemeChoice::Dark,
        _ => ThemeChoice::System,
    }
}

fn parse_accent(s: &str) -> Accent {
    match s {
        "purple" => Accent::Purple,
        "pink" => Accent::Pink,
        "red" => Accent::Red,
        "orange" => Accent::Orange,
        "yellow" => Accent::Yellow,
        "green" => Accent::Green,
        "graphite" => Accent::Graphite,
        _ => Accent::Blue,
    }
}

pub fn load() -> Prefs {
    let Some(p) = path() else {
        return Prefs::default();
    };
    let Ok(text) = std::fs::read_to_string(&p) else {
        return Prefs::default();
    };
    let Ok(f) = serde_json::from_str::<File>(&text) else {
        return Prefs::default();
    };
    Prefs {
        theme: parse_theme(&f.theme),
        accent: parse_accent(&f.accent),
        lang: if f.lang == "hi" { Lang::Hi } else { Lang::En },
        collapsed: f.collapsed,
    }
}

pub fn save(prefs: &Prefs) {
    let Some(p) = path() else { return };
    let theme = match prefs.theme {
        ThemeChoice::Light => "light",
        ThemeChoice::Dark => "dark",
        ThemeChoice::System => "system",
    };
    let accent = match prefs.accent {
        Accent::Blue => "blue",
        Accent::Purple => "purple",
        Accent::Pink => "pink",
        Accent::Red => "red",
        Accent::Orange => "orange",
        Accent::Yellow => "yellow",
        Accent::Green => "green",
        Accent::Graphite => "graphite",
    };
    let f = File {
        theme: theme.to_string(),
        accent: accent.to_string(),
        lang: prefs.lang.code().to_string(),
        collapsed: prefs.collapsed,
    };
    if let Ok(text) = serde_json::to_string(&f) {
        let _ = std::fs::write(&p, text);
    }
}
