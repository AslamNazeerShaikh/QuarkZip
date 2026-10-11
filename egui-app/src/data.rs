//! Mock domain data mirroring the reference screenshots.
//!
//! Placeholder content until the real model layer lands (milestone 2).
//! Shapes (`Job`, `Status`, KPI row) follow the analysis doc §3–§4 so real
//! data can drop in without touching any view code.

use crate::tokens;
use eframe::egui;

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Van {
    One,
    Two,
}

impl Van {
    pub fn name(self) -> &'static str {
        match self {
            Van::One => "Van 1",
            Van::Two => "Van 2",
        }
    }
    pub fn reg(self) -> &'static str {
        match self {
            Van::One => "WX68 KLP",
            Van::Two => "VX17 HYT",
        }
    }
    pub fn crew(self) -> &'static str {
        match self {
            Van::One => "Marcus",
            Van::Two => "Priya",
        }
    }
    /// Identity accent — dots/icons/numbers only, never whole cards.
    pub fn color(self) -> egui::Color32 {
        match self {
            Van::One => tokens::INFO_BLUE,
            Van::Two => tokens::WARN_ORANGE,
        }
    }
    pub fn tint(self) -> egui::Color32 {
        match self {
            Van::One => tokens::LIGHT_BLUE,
            Van::Two => tokens::LIGHT_ORANGE,
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Status {
    Booked,
    InProgress,
    Done,
    /// No mock row uses it yet; the drawer stepper match stays exhaustive.
    #[allow(dead_code)]
    Paid,
}

impl Status {
    pub fn label(self) -> &'static str {
        match self {
            Status::Booked => "Booked",
            Status::InProgress => "In progress",
            Status::Done => "Done",
            Status::Paid => "Paid",
        }
    }
    pub fn dot(self) -> egui::Color32 {
        match self {
            Status::Booked => tokens::INFO_BLUE,
            Status::InProgress => tokens::WARN_ORANGE,
            Status::Done => tokens::DARK_GREEN_TEXT,
            Status::Paid => tokens::SECONDARY,
        }
    }
    pub fn bg(self) -> egui::Color32 {
        match self {
            Status::Booked => tokens::LIGHT_BLUE,
            Status::InProgress => tokens::LIGHT_AMBER,
            Status::Done => tokens::LIGHT_GREEN,
            Status::Paid => tokens::SOFT_FILL,
        }
    }
    pub fn fg(self) -> egui::Color32 {
        match self {
            Status::Paid => tokens::SECONDARY,
            s => s.dot(),
        }
    }
}

#[derive(Clone, Copy)]
pub struct Job {
    pub id: &'static str,
    pub customer: &'static str,
    pub phone: &'static str,
    pub address: &'static str,
    pub area: &'static str,
    pub van: Van,
    pub crew: &'static str,
    pub time: &'static str,
    pub duration: &'static str,
    pub status: Status,
    pub total: &'static str,
    pub note: &'static str,
    /// Commercial accounts get a marker in table/address cells (§9.5).
    pub commercial: bool,
    pub stop: u32,
}

pub struct Kpi {
    pub label: &'static str,
    pub value: &'static str,
    pub sub: &'static str,
    pub alert: bool,
}

pub fn kpis() -> [Kpi; 5] {
    [
        Kpi {
            label: "Today's value",
            value: "£847.40",
            sub: "4 jobs across 2 vans",
            alert: false,
        },
        Kpi {
            label: "This week",
            value: "£5,252.00",
            sub: "33 jobs booked",
            alert: false,
        },
        Kpi {
            label: "Awaiting payment",
            value: "£6,258.80",
            sub: "33 invoices",
            alert: false,
        },
        Kpi {
            label: "Overdue",
            value: "£2,616.20",
            sub: "12 invoices past due",
            alert: true,
        },
        Kpi {
            label: "Quotes out",
            value: "£1,134.60",
            sub: "8 waiting on customers",
            alert: false,
        },
    ]
}

pub struct VanSection {
    pub van: Van,
    pub time_range: &'static str,
    pub stops: &'static str,
    pub total: &'static str,
    pub jobs: Vec<Job>,
}

pub fn schedule() -> Vec<VanSection> {
    vec![
        VanSection {
            van: Van::One,
            time_range: "8:30am–2:30pm",
            stops: "2 stops",
            total: "£557.40",
            jobs: vec![
                Job {
                    id: "J-1241",
                    customer: "Bishopston Nursery",
                    phone: "0117 496 0214",
                    address: "71 Kings Drive, BS7 4GD",
                    area: "Bishopston · office",
                    van: Van::One,
                    crew: "Marcus",
                    time: "8:30am",
                    duration: "4h",
                    status: Status::Done,
                    total: "£477.40",
                    note: "Sign in at reception",
                    commercial: true,
                    stop: 1,
                },
                Job {
                    id: "J-1242",
                    customer: "Derek Chapman",
                    phone: "07849 506710",
                    address: "4 Chandos Road, BS6 6PE",
                    area: "Redland · BS6 6PE",
                    van: Van::One,
                    crew: "Marcus",
                    time: "1:15pm",
                    duration: "1h 15m",
                    status: Status::InProgress,
                    total: "£80.00",
                    note: "Key under the mat",
                    commercial: false,
                    stop: 2,
                },
            ],
        },
        VanSection {
            van: Van::Two,
            time_range: "9:00am–1:00pm",
            stops: "2 stops",
            total: "£310.00",
            jobs: vec![
                Job {
                    id: "J-1243",
                    customer: "Joseph Jenkins",
                    phone: "07849 506711",
                    address: "108 Egerton Road, BS7 4LR",
                    area: "Bishopston · BS7 4LR",
                    van: Van::Two,
                    crew: "Priya",
                    time: "9:00am",
                    duration: "2h 30m",
                    status: Status::Booked,
                    total: "£145.00",
                    note: "Two bedrooms + stairs",
                    commercial: false,
                    stop: 1,
                },
                Job {
                    id: "J-1244",
                    customer: "Fiona Foster",
                    phone: "07700 900341",
                    address: "22 Belvedere Road, BS6 5JB",
                    area: "Redland · BS6 5JB",
                    van: Van::Two,
                    crew: "Priya",
                    time: "12:00pm",
                    duration: "1h",
                    status: Status::Booked,
                    total: "£165.00",
                    note: "",
                    commercial: false,
                    stop: 2,
                },
            ],
        },
    ]
}

pub fn table_groups() -> Vec<(&'static str, Vec<Job>)> {
    vec![
        (
            "SATURDAY 26 SEPTEMBER 2026",
            vec![
                Job {
                    id: "J-1348",
                    customer: "Joseph Jenkins",
                    phone: "07849 506710",
                    address: "108 Egerton Road",
                    area: "Bishopston · BS7 4LR",
                    van: Van::One,
                    crew: "Marcus",
                    time: "12:15pm–2:15pm",
                    duration: "",
                    status: Status::Booked,
                    total: "£145.00",
                    note: "",
                    commercial: false,
                    stop: 0,
                },
                Job {
                    id: "J-1346",
                    customer: "Priya Raman",
                    phone: "07700 900118",
                    address: "9 Cornwallis Grove",
                    area: "Clifton · BS8 4LD",
                    van: Van::One,
                    crew: "Marcus",
                    time: "9:00am–11:00am",
                    duration: "",
                    status: Status::Booked,
                    total: "£215.00",
                    note: "",
                    commercial: false,
                    stop: 0,
                },
            ],
        ),
        (
            "FRIDAY 25 SEPTEMBER 2026",
            vec![
                Job {
                    id: "J-1342",
                    customer: "Nadia Shah",
                    phone: "07811 223344",
                    address: "31 Zetland Road",
                    area: "Bishopston · BS6 7AB",
                    van: Van::Two,
                    crew: "Priya",
                    time: "2:00pm–3:30pm",
                    duration: "",
                    status: Status::Booked,
                    total: "£120.00",
                    note: "",
                    commercial: false,
                    stop: 0,
                },
                Job {
                    id: "J-1340",
                    customer: "Fiona Foster",
                    phone: "07700 900341",
                    address: "22 Belvedere Road",
                    area: "Redland · BS6 5JB",
                    van: Van::Two,
                    crew: "Priya & Jake",
                    time: "10:00am–11:00am",
                    duration: "",
                    status: Status::Booked,
                    total: "£70.00",
                    note: "",
                    commercial: false,
                    stop: 0,
                },
            ],
        ),
    ]
}

/// Deterministic muted avatar background from a name (spec §9.12).
pub fn avatar_color(name: &str) -> egui::Color32 {
    const PALETTE: [(u8, u8, u8); 8] = [
        (45, 106, 120), // teal-dark
        (61, 90, 200),  // royal-blue
        (58, 130, 90),  // green
        (128, 128, 70), // olive
        (40, 140, 120), // teal-green
        (70, 120, 190), // blue
        (140, 110, 70), // olive-brown
        (40, 110, 80),  // dark-green
    ];
    let mut h: usize = 0;
    for b in name.bytes() {
        h = h.wrapping_mul(31).wrapping_add(b as usize);
    }
    let (r, g, b) = PALETTE[h % PALETTE.len()];
    egui::Color32::from_rgb(r, g, b)
}

/// "Joseph Jenkins" → "JJ".
pub fn initials(name: &str) -> String {
    name.split_whitespace()
        .filter_map(|w| w.chars().next())
        .take(2)
        .collect::<String>()
        .to_uppercase()
}
