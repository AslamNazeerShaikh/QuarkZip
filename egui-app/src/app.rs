//! AppShell + pages. One token set, four layout modes (dashboard, table,
//! drawer, modal) per the reference analysis — tabs change the dataset,
//! never the layout.

use crate::{data, tokens, widgets};
use eframe::egui;

#[derive(Clone, Copy, PartialEq, Eq)]
enum Page {
    Today,
    Calendar,
    Jobs,
    Customers,
    Quotes,
    Invoices,
    Settings,
}

impl Page {
    fn title(self) -> &'static str {
        match self {
            Page::Today => "Today",
            Page::Calendar => "Calendar",
            Page::Jobs => "Jobs",
            Page::Customers => "Customers",
            Page::Quotes => "Quotes",
            Page::Invoices => "Invoices",
            Page::Settings => "Settings",
        }
    }
}

const TABS: [&str; 7] = [
    "Upcoming",
    "Today",
    "Open",
    "Awaiting payment",
    "Paid",
    "Cancelled",
    "All",
];

const TAG_NAMES: [&str; 6] = [
    "regular",
    "pets",
    "landlord",
    "VIP",
    "key holder",
    "referrer",
];

pub struct CrmApp {
    page: Page,
    search: String,
    table_search: String,
    job_tab: usize,
    van_filter: usize,
    selected_id: Option<&'static str>,
    show_new_job: bool,
    show_new_customer: bool,
    drawer_note: String,
    // New-job form state.
    nj_customer: String,
    nj_property: String,
    nj_date: String,
    nj_start: String,
    nj_duration: usize,
    nj_van: usize,
    nj_crew: usize,
    nj_lines: Vec<(String, String, String)>,
    nj_notes_crew: String,
    nj_notes_office: String,
    // New-customer form state.
    nc_type: usize,
    nc_first: String,
    nc_last: String,
    nc_mobile: String,
    nc_alt: String,
    nc_email: String,
    nc_found: String,
    nc_tags: [bool; 6],
    nc_notes: String,
    nc_addr: String,
    // Settings state.
    biz_name: String,
    tagline: String,
    owner: String,
    biz_phone: String,
    biz_email: String,
    website: String,
    biz_addr: String,
    terms: String,
    invoice_footer: String,
    van_names: [String; 2],
    van_regs: [String; 2],
    van_active: [bool; 2],
    crew_names: [String; 2],
    crew_phones: [String; 2],
    crew_van: [usize; 2],
    crew_active: [bool; 2],
}

impl CrmApp {
    pub fn new(ctx: &egui::Context) -> Self {
        ctx.set_visuals(tokens::visuals());
        Self {
            page: Page::Today,
            search: String::new(),
            table_search: String::new(),
            job_tab: 2,
            van_filter: 0,
            selected_id: None,
            show_new_job: false,
            show_new_customer: false,
            drawer_note: String::new(),
            nj_customer: "Bishopston Nursery".to_string(),
            nj_property: "71 Kings Drive, BS7 4GD".to_string(),
            nj_date: "05/09/2026".to_string(),
            nj_start: "08:30 am".to_string(),
            nj_duration: 2,
            nj_van: 0,
            nj_crew: 0,
            nj_lines: vec![(
                "Office carpet".to_string(),
                "217".to_string(),
                "2.2".to_string(),
            )],
            nj_notes_crew: String::new(),
            nj_notes_office: String::new(),
            nc_type: 0,
            nc_first: String::new(),
            nc_last: String::new(),
            nc_mobile: String::new(),
            nc_alt: String::new(),
            nc_email: String::new(),
            nc_found: "Google".to_string(),
            nc_tags: [false; 6],
            nc_notes: String::new(),
            nc_addr: "12 Cranbrook Road".to_string(),
            biz_name: "Brightway Carpet Care".to_string(),
            tagline: "Carpet, rug & upholstery cleaning".to_string(),
            owner: "Dean Whitlock".to_string(),
            biz_phone: "0117 496 0214".to_string(),
            biz_email: "hello@brightway.care".to_string(),
            website: "brightway.care".to_string(),
            biz_addr: "Unit 4, Ashton Vale Trading Estate".to_string(),
            terms: "14".to_string(),
            invoice_footer: "Thank you for choosing Brightway. Payment by bank transfer."
                .to_string(),
            van_names: ["Van 1".to_string(), "Van 2".to_string()],
            van_regs: ["WX68 KLP".to_string(), "VX17 HYT".to_string()],
            van_active: [true, true],
            crew_names: ["Marcus Reid".to_string(), "Priya Nair".to_string()],
            crew_phones: ["07700 900341".to_string(), "07700 900118".to_string()],
            crew_van: [0, 1],
            crew_active: [true, true],
        }
    }

    fn lookup_job(id: &str) -> Option<data::Job> {
        for section in data::schedule() {
            for job in section.jobs {
                if job.id == id {
                    return Some(job);
                }
            }
        }
        for (_, jobs) in data::table_groups() {
            for job in jobs {
                if job.id == id {
                    return Some(job);
                }
            }
        }
        None
    }
}

impl eframe::App for CrmApp {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        self.sidebar(ui);
        match self.page {
            Page::Today => self.page_today(ui),
            Page::Jobs => self.page_jobs(ui),
            Page::Settings => self.page_settings(ui),
            Page::Customers => self.page_placeholder(
                ui,
                "Customers",
                "12 customers · 3 commercial",
                "No customers match this view yet.",
                "Customer list arrives with the model layer.",
                "New customer",
                true,
            ),
            Page::Calendar => self.page_placeholder(
                ui,
                "Calendar",
                "September 2026 · 33 jobs booked",
                "Nothing scheduled in this view yet.",
                "The week grid arrives with the model layer.",
                "New job",
                false,
            ),
            Page::Quotes => self.page_placeholder(
                ui,
                "Quotes",
                "8 quotes · £1,134.60",
                "No quotes match this view yet.",
                "Quote cards arrive with the model layer.",
                "New quote",
                false,
            ),
            Page::Invoices => self.page_placeholder(
                ui,
                "Invoices",
                "33 invoices · £6,258.80",
                "No invoices match this view yet.",
                "Invoice rows arrive with the model layer.",
                "New invoice",
                false,
            ),
        }
        // Overlays need a Context (panels take the root `Ui` directly).
        if self.selected_id.is_some() {
            let ctx = ui.ctx().clone();
            let mut open = true;
            dim(&ctx, &mut open);
            if open {
                self.drawer(&ctx);
            } else {
                self.selected_id = None;
            }
        }
        if self.show_new_job {
            let ctx = ui.ctx().clone();
            dim(&ctx, &mut self.show_new_job);
            if self.show_new_job {
                self.modal_new_job(&ctx);
            }
        }
        if self.show_new_customer {
            let ctx = ui.ctx().clone();
            dim(&ctx, &mut self.show_new_customer);
            if self.show_new_customer {
                self.modal_new_customer(&ctx);
            }
        }
    }
}

/// Flat dim overlay behind drawer/modal; click closes. Painted before the
/// overlay window so it sits above panels but below the overlay.
fn dim(ctx: &egui::Context, open: &mut bool) {
    egui::Area::new(egui::Id::new("overlay-dim"))
        .order(egui::Order::Middle)
        .fixed_pos(egui::pos2(0.0, 0.0))
        .show(ctx, |ui| {
            let r = ctx.viewport_rect();
            if ui.allocate_rect(r, egui::Sense::click()).clicked() {
                *open = false;
            }
            ui.painter().rect_filled(r, 0.0, tokens::DIM);
        });
}

// ——— AppShell ———

impl CrmApp {
    fn sidebar(&mut self, ui: &mut egui::Ui) {
        egui::Panel::left("sidebar")
            .exact_size(tokens::SIDEBAR_W)
            .resizable(false)
            .frame(egui::Frame {
                fill: tokens::SIDEBAR,
                inner_margin: egui::Margin::symmetric(18, 16),
                ..Default::default()
            })
            .show(ui, |ui| {
                ui.add_space(tokens::TITLEBAR_PAD);
                // Brand: dark-green rounded square + two-line wordmark.
                ui.horizontal(|ui| {
                    ui.spacing_mut().item_spacing = egui::vec2(12.0, 0.0);
                    egui::Frame {
                        fill: tokens::CTA_GREEN,
                        corner_radius: egui::CornerRadius::same(10),
                        ..Default::default()
                    }
                    .show(ui, |ui| {
                        ui.allocate_ui_with_layout(
                            egui::vec2(36.0, 36.0),
                            egui::Layout::centered_and_justified(egui::Direction::TopDown),
                            |ui| {
                                ui.label(
                                    egui::RichText::new("B")
                                        .size(18.0)
                                        .strong()
                                        .color(tokens::WHITE),
                                );
                            },
                        );
                    });
                    ui.vertical(|ui| {
                        ui.spacing_mut().item_spacing = egui::vec2(2.0, 0.0);
                        ui.label(
                            egui::RichText::new("Brightway Carpet Care")
                                .size(15.0)
                                .strong()
                                .color(tokens::TEXT),
                        );
                        ui.label(
                            egui::RichText::new("CRM")
                                .size(tokens::T_PILL)
                                .color(tokens::MUTED),
                        );
                    });
                });
                ui.add_space(16.0);
                widgets::search_field(ui, &mut self.search, "Search  ·  Cmd K");
                ui.add_space(16.0);
                let nav: [(Page, Option<&str>, Option<&str>); 6] = [
                    (Page::Today, None, None),
                    (Page::Calendar, None, None),
                    (Page::Jobs, None, None),
                    (Page::Customers, None, None),
                    (Page::Quotes, Some("8"), None),
                    (Page::Invoices, None, Some("12")),
                ];
                for (page, quiet, alert) in nav {
                    if widgets::nav_item(ui, self.page == page, page.title(), quiet, alert)
                        .clicked()
                    {
                        self.page = page;
                    }
                    ui.add_space(2.0);
                }
                ui.add_space(24.0);
                widgets::section_label(ui, "Business");
                ui.add_space(8.0);
                if widgets::nav_item(
                    ui,
                    self.page == Page::Settings,
                    Page::Settings.title(),
                    None,
                    None,
                )
                .clicked()
                {
                    self.page = Page::Settings;
                }
                ui.with_layout(egui::Layout::bottom_up(egui::Align::LEFT), |ui| {
                    ui.label(
                        egui::RichText::new("Saturday 5 September")
                            .size(tokens::T_SECONDARY)
                            .color(tokens::MUTED),
                    );
                    ui.label(
                        egui::RichText::new("2 vans · 3 cleaners")
                            .size(tokens::T_SECONDARY)
                            .color(tokens::SECONDARY),
                    );
                });
            });
    }

    fn content_frame<R>(ui: &mut egui::Ui, add_contents: impl FnOnce(&mut egui::Ui) -> R) -> R {
        egui::CentralPanel::default()
            .frame(egui::Frame {
                fill: tokens::CONTENT,
                inner_margin: egui::Margin {
                    left: 32,
                    right: 32,
                    top: 44,
                    bottom: 24,
                },
                ..Default::default()
            })
            .show(ui, add_contents)
            .inner
    }

    fn card_frame(ui: &mut egui::Ui, add_contents: impl FnOnce(&mut egui::Ui)) {
        egui::Frame {
            fill: tokens::CARD,
            stroke: tokens::border(),
            corner_radius: egui::CornerRadius::same(tokens::R_CARD),
            inner_margin: egui::Margin::same(20),
            ..Default::default()
        }
        .show(ui, add_contents);
    }

    /// Title + actions row: quiet meta left, controls right.
    fn header_row(
        ui: &mut egui::Ui,
        title: &str,
        sub: &str,
        add_actions: impl FnOnce(&mut egui::Ui),
    ) {
        ui.horizontal(|ui| {
            ui.vertical(|ui| {
                widgets::page_header(ui, title, sub);
            });
            ui.with_layout(
                egui::Layout::right_to_left(egui::Align::Center),
                add_actions,
            );
        });
    }
}

// ——— Today dashboard ———

impl CrmApp {
    fn page_today(&mut self, ui: &mut egui::Ui) {
        Self::content_frame(ui, |ui| {
            Self::header_row(
                ui,
                "Today",
                "Saturday 5 September 2026 · 4 jobs · 3 done",
                |ui| {
                    ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
                    if widgets::primary_button(ui, "+ New job").clicked() {
                        self.show_new_job = true;
                    }
                    widgets::outline_button(ui, "Week");
                    widgets::outline_button(ui, "Today");
                    ui.add_sized(
                        egui::vec2(36.0, tokens::BTN_H),
                        egui::Button::new(
                            egui::RichText::new(">")
                                .size(tokens::T_BODY)
                                .color(tokens::TEXT),
                        )
                        .fill(tokens::CARD)
                        .stroke(tokens::border())
                        .corner_radius(egui::CornerRadius::same(tokens::R_INPUT)),
                    );
                    ui.add_sized(
                        egui::vec2(36.0, tokens::BTN_H),
                        egui::Button::new(
                            egui::RichText::new("<")
                                .size(tokens::T_BODY)
                                .color(tokens::TEXT),
                        )
                        .fill(tokens::CARD)
                        .stroke(tokens::border())
                        .corner_radius(egui::CornerRadius::same(tokens::R_INPUT)),
                    );
                },
            );
            ui.add_space(20.0);
            // KPI cards: equal widths, 12px gaps.
            let cw = (ui.available_width() - 4.0 * tokens::CARD_GAP) / 5.0;
            ui.horizontal(|ui| {
                ui.spacing_mut().item_spacing = egui::vec2(tokens::CARD_GAP, 0.0);
                for kpi in data::kpis().iter() {
                    ui.allocate_ui(egui::vec2(cw, 0.0), |ui| {
                        widgets::kpi_card(ui, kpi);
                    });
                }
            });
            ui.add_space(16.0);
            // Schedule + route map side panel.
            let map_w = (ui.available_width() * 0.35).clamp(320.0, 520.0);
            let left_w = ui.available_width() - map_w - 16.0;
            ui.horizontal(|ui| {
                ui.spacing_mut().item_spacing = egui::vec2(0.0, 0.0);
                ui.allocate_ui(egui::vec2(left_w, 0.0), |ui| {
                    for section in data::schedule() {
                        self.van_section(ui, &section);
                        ui.add_space(12.0);
                    }
                });
                ui.add_space(16.0);
                ui.allocate_ui(egui::vec2(map_w, 0.0), |ui| {
                    Self::card_frame(ui, |ui| {
                        ui.set_width(map_w - tokens::CARD_PAD * 2.0);
                        ui.horizontal(|ui| {
                            ui.label(
                                egui::RichText::new("Route map")
                                    .size(tokens::T_BODY)
                                    .strong()
                                    .color(tokens::TEXT),
                            );
                            ui.with_layout(
                                egui::Layout::right_to_left(egui::Align::Center),
                                |ui| {
                                    ui.spacing_mut().item_spacing = egui::vec2(12.0, 0.0);
                                    for van in [data::Van::Two, data::Van::One] {
                                        ui.horizontal(|ui| {
                                            ui.spacing_mut().item_spacing = egui::vec2(6.0, 0.0);
                                            let (r, _) = ui.allocate_exact_size(
                                                egui::vec2(8.0, 8.0),
                                                egui::Sense::hover(),
                                            );
                                            ui.painter().circle_filled(
                                                r.center(),
                                                4.0,
                                                van.color(),
                                            );
                                            ui.label(
                                                egui::RichText::new(van.name())
                                                    .size(tokens::T_PILL)
                                                    .color(tokens::SECONDARY),
                                            );
                                        });
                                    }
                                },
                            );
                        });
                        ui.add_space(12.0);
                        egui::Frame {
                            fill: tokens::SOFT_FILL,
                            corner_radius: egui::CornerRadius::same(tokens::R_NAV),
                            ..Default::default()
                        }
                        .show(ui, |ui| {
                            ui.allocate_ui_with_layout(
                                egui::vec2(ui.available_width(), 320.0),
                                egui::Layout::centered_and_justified(egui::Direction::TopDown),
                                |ui| {
                                    ui.label(
                                        egui::RichText::new("Map placeholder")
                                            .size(tokens::T_SECONDARY)
                                            .color(tokens::MUTED),
                                    );
                                },
                            );
                        });
                    });
                });
            });
        });
    }

    fn van_section(&mut self, ui: &mut egui::Ui, section: &data::VanSection) {
        Self::card_frame(ui, |ui| {
            ui.set_width(ui.available_width());
            // Van header: icon + name/reg/crew left, time/stops/total right.
            ui.horizontal(|ui| {
                egui::Frame {
                    fill: section.van.color(),
                    corner_radius: egui::CornerRadius::same(tokens::R_NAV),
                    ..Default::default()
                }
                .show(ui, |ui| {
                    ui.allocate_ui_with_layout(
                        egui::vec2(32.0, 32.0),
                        egui::Layout::centered_and_justified(egui::Direction::TopDown),
                        |ui| {
                            ui.label(
                                egui::RichText::new(match section.van {
                                    data::Van::One => "1",
                                    data::Van::Two => "2",
                                })
                                .size(tokens::T_BODY)
                                .strong()
                                .color(tokens::WHITE),
                            );
                        },
                    );
                });
                ui.vertical(|ui| {
                    ui.spacing_mut().item_spacing = egui::vec2(2.0, 0.0);
                    ui.horizontal(|ui| {
                        ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
                        ui.label(
                            egui::RichText::new(section.van.name())
                                .size(15.0)
                                .strong()
                                .color(tokens::TEXT),
                        );
                        ui.label(
                            egui::RichText::new(section.van.reg())
                                .size(tokens::T_SECONDARY)
                                .color(tokens::MUTED),
                        );
                    });
                    ui.label(
                        egui::RichText::new(section.van.crew())
                            .size(tokens::T_SECONDARY)
                            .color(tokens::SECONDARY),
                    );
                });
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    ui.spacing_mut().item_spacing = egui::vec2(12.0, 0.0);
                    ui.label(
                        egui::RichText::new(section.total)
                            .size(tokens::T_BODY)
                            .strong()
                            .color(tokens::TEXT),
                    );
                    ui.label(
                        egui::RichText::new(section.stops)
                            .size(tokens::T_SECONDARY)
                            .color(tokens::SECONDARY),
                    );
                    ui.label(
                        egui::RichText::new(section.time_range)
                            .size(tokens::T_SECONDARY)
                            .color(tokens::SECONDARY),
                    );
                });
            });
            ui.add_space(8.0);
            ui.separator();
            for job in &section.jobs {
                self.job_row(ui, job);
            }
        });
    }

    /// Clickable 76px job row: time / stop / title+address+amount / pill+action.
    fn job_row(&mut self, ui: &mut egui::Ui, job: &data::Job) {
        let (rect, resp) = ui.allocate_exact_size(
            egui::vec2(ui.available_width(), tokens::ROW_H),
            egui::Sense::click(),
        );
        if resp.hovered() {
            ui.painter().rect_filled(
                rect,
                egui::CornerRadius::same(tokens::R_NAV),
                tokens::SOFT_FILL,
            );
        }
        let mut acted = false;
        ui.scope_builder(egui::UiBuilder::new().max_rect(rect), |ui| {
            ui.horizontal(|ui| {
                ui.spacing_mut().item_spacing = egui::vec2(12.0, 0.0);
                // Time column (fixed 80px).
                ui.allocate_ui(egui::vec2(80.0, tokens::ROW_H), |ui| {
                    ui.vertical(|ui| {
                        ui.add_space(14.0);
                        ui.label(
                            egui::RichText::new(job.time)
                                .size(tokens::T_BODY)
                                .strong()
                                .color(tokens::TEXT),
                        );
                        ui.label(
                            egui::RichText::new(job.duration)
                                .size(tokens::T_PILL)
                                .color(tokens::MUTED),
                        );
                    });
                });
                widgets::stop_circle(ui, job.stop, job.van.tint(), job.van.color());
                // Main: title / address / amount+note.
                ui.allocate_ui(
                    egui::vec2(
                        (rect.width() - 80.0 - 28.0 - 190.0 - 48.0).max(120.0),
                        tokens::ROW_H,
                    ),
                    |ui| {
                        ui.vertical(|ui| {
                            ui.add_space(10.0);
                            ui.spacing_mut().item_spacing = egui::vec2(2.0, 0.0);
                            ui.add(
                                egui::Label::new(
                                    egui::RichText::new(job.customer)
                                        .size(tokens::T_BODY)
                                        .strong()
                                        .color(tokens::TEXT),
                                )
                                .truncate(),
                            );
                            ui.add(
                                egui::Label::new(
                                    egui::RichText::new(job.address)
                                        .size(tokens::T_SECONDARY)
                                        .color(tokens::SECONDARY),
                                )
                                .truncate(),
                            );
                            ui.horizontal(|ui| {
                                ui.spacing_mut().item_spacing = egui::vec2(6.0, 0.0);
                                ui.label(
                                    egui::RichText::new(job.total)
                                        .size(tokens::T_SECONDARY)
                                        .strong()
                                        .color(tokens::TEXT),
                                );
                                if !job.note.is_empty() {
                                    ui.add(
                                        egui::Label::new(
                                            egui::RichText::new("· ".to_string() + job.note)
                                                .size(tokens::T_SECONDARY)
                                                .color(tokens::MUTED),
                                        )
                                        .truncate(),
                                    );
                                }
                            });
                        });
                    },
                );
                // Status pill + contextual action (fixed 190px, right).
                ui.allocate_ui(egui::vec2(190.0, tokens::ROW_H), |ui| {
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
                        match job.status {
                            data::Status::Done => {
                                if widgets::outline_button(ui, "Paid").clicked() {
                                    acted = true;
                                }
                            }
                            data::Status::InProgress => {
                                if widgets::primary_button(ui, "Done").clicked() {
                                    acted = true;
                                }
                            }
                            _ => {}
                        }
                        widgets::pill(
                            ui,
                            job.status.dot(),
                            job.status.bg(),
                            job.status.fg(),
                            job.status.label(),
                        );
                    });
                });
            });
        });
        if resp.clicked() && !acted {
            self.selected_id = Some(job.id);
        }
    }
}

// ——— Jobs table page ———

impl CrmApp {
    fn page_jobs(&mut self, ui: &mut egui::Ui) {
        Self::content_frame(ui, |ui| {
            Self::header_row(ui, "Jobs", "107 jobs · £17,176.20", |ui| {
                if widgets::primary_button(ui, "+ New job").clicked() {
                    self.show_new_job = true;
                }
            });
            ui.add_space(16.0);
            widgets::segmented(ui, &TABS, &mut self.job_tab);
            ui.add_space(12.0);
            // Filter + search toolbar.
            ui.horizontal(|ui| {
                ui.spacing_mut().item_spacing = egui::vec2(12.0, 0.0);
                ui.allocate_ui(egui::vec2(150.0, tokens::BTN_H), |ui| {
                    egui::ComboBox::from_label("")
                        .selected_text(if self.van_filter == 0 {
                            "All vans".to_string()
                        } else {
                            format!("Van {}", self.van_filter)
                        })
                        .width(150.0)
                        .show_ui(ui, |ui| {
                            ui.selectable_value(&mut self.van_filter, 0, "All vans");
                            ui.selectable_value(&mut self.van_filter, 1, "Van 1");
                            ui.selectable_value(&mut self.van_filter, 2, "Van 2");
                        });
                });
                widgets::search_field(ui, &mut self.table_search, "Customer, address, postcode...");
            });
            ui.add_space(12.0);
            let w = ui.available_width();
            let cols = [w * 0.15, w * 0.22, w * 0.25, w * 0.14, w * 0.12, w * 0.12];
            // Column headers: 11px uppercase gray, no verticals.
            ui.horizontal(|ui| {
                ui.spacing_mut().item_spacing = egui::vec2(0.0, 0.0);
                for (i, head) in [
                    "WHEN",
                    "CUSTOMER",
                    "ADDRESS",
                    "VAN · CREW",
                    "STATUS",
                    "TOTAL",
                ]
                .iter()
                .enumerate()
                {
                    ui.allocate_ui(egui::vec2(cols[i], 20.0), |ui| {
                        if i == 5 {
                            ui.with_layout(
                                egui::Layout::right_to_left(egui::Align::Center),
                                |ui| {
                                    ui.label(
                                        egui::RichText::new(*head)
                                            .size(11.0)
                                            .strong()
                                            .color(tokens::MUTED),
                                    );
                                },
                            );
                        } else {
                            ui.label(
                                egui::RichText::new(*head)
                                    .size(11.0)
                                    .strong()
                                    .color(tokens::MUTED),
                            );
                        }
                    });
                }
            });
            ui.add_space(4.0);
            ui.separator();
            egui::ScrollArea::vertical()
                .auto_shrink([false, false])
                .show(ui, |ui| {
                    ui.set_width(w);
                    for (group, jobs) in data::table_groups() {
                        ui.add_space(12.0);
                        ui.label(
                            egui::RichText::new(group)
                                .size(tokens::T_PILL)
                                .strong()
                                .color(tokens::MUTED),
                        );
                        ui.add_space(4.0);
                        for job in &jobs {
                            self.table_row(ui, job, &cols);
                        }
                    }
                });
        });
    }

    fn table_row(&mut self, ui: &mut egui::Ui, job: &data::Job, cols: &[f32; 6]) {
        let (rect, resp) = ui.allocate_exact_size(
            egui::vec2(ui.available_width(), tokens::TABLE_ROW_H),
            egui::Sense::click(),
        );
        if resp.hovered() {
            ui.painter().rect_filled(
                rect,
                egui::CornerRadius::same(tokens::R_NAV),
                tokens::SOFT_FILL,
            );
        }
        ui.scope_builder(egui::UiBuilder::new().max_rect(rect), |ui| {
            ui.horizontal(|ui| {
                ui.spacing_mut().item_spacing = egui::vec2(0.0, 0.0);
                // WHEN
                ui.allocate_ui(egui::vec2(cols[0], tokens::TABLE_ROW_H), |ui| {
                    ui.vertical(|ui| {
                        ui.add_space(14.0);
                        ui.label(
                            egui::RichText::new(job.time)
                                .size(tokens::T_BODY)
                                .strong()
                                .color(tokens::TEXT),
                        );
                        ui.label(
                            egui::RichText::new(job.id)
                                .size(tokens::T_PILL)
                                .color(tokens::MUTED),
                        );
                    });
                });
                // CUSTOMER: avatar + name/phone.
                ui.allocate_ui(egui::vec2(cols[1], tokens::TABLE_ROW_H), |ui| {
                    ui.horizontal(|ui| {
                        ui.spacing_mut().item_spacing = egui::vec2(10.0, 0.0);
                        widgets::avatar(
                            ui,
                            &data::initials(job.customer),
                            data::avatar_color(job.customer),
                        );
                        ui.vertical(|ui| {
                            ui.add_space(12.0);
                            ui.spacing_mut().item_spacing = egui::vec2(2.0, 0.0);
                            ui.add(
                                egui::Label::new(
                                    egui::RichText::new(job.customer)
                                        .size(tokens::T_BODY)
                                        .strong()
                                        .color(tokens::TEXT),
                                )
                                .truncate(),
                            );
                            ui.label(
                                egui::RichText::new(job.phone)
                                    .size(tokens::T_SECONDARY)
                                    .color(tokens::SECONDARY),
                            );
                        });
                    });
                });
                // ADDRESS
                ui.allocate_ui(egui::vec2(cols[2], tokens::TABLE_ROW_H), |ui| {
                    ui.vertical(|ui| {
                        ui.add_space(12.0);
                        ui.spacing_mut().item_spacing = egui::vec2(2.0, 0.0);
                        ui.add(
                            egui::Label::new(
                                egui::RichText::new(job.address)
                                    .size(tokens::T_BODY)
                                    .color(tokens::TEXT),
                            )
                            .truncate(),
                        );
                        ui.label(
                            egui::RichText::new(if job.commercial {
                                format!("{} · Commercial", job.area)
                            } else {
                                job.area.to_string()
                            })
                            .size(tokens::T_SECONDARY)
                            .color(tokens::SECONDARY),
                        );
                    });
                });
                // VAN · CREW
                ui.allocate_ui(egui::vec2(cols[3], tokens::TABLE_ROW_H), |ui| {
                    ui.vertical(|ui| {
                        ui.add_space(12.0);
                        ui.spacing_mut().item_spacing = egui::vec2(2.0, 0.0);
                        ui.horizontal(|ui| {
                            ui.spacing_mut().item_spacing = egui::vec2(6.0, 0.0);
                            let (r, _) =
                                ui.allocate_exact_size(egui::vec2(8.0, 8.0), egui::Sense::hover());
                            ui.painter().circle_filled(r.center(), 4.0, job.van.color());
                            ui.label(
                                egui::RichText::new(job.van.name())
                                    .size(tokens::T_BODY)
                                    .color(tokens::TEXT),
                            );
                        });
                        ui.label(
                            egui::RichText::new(job.crew)
                                .size(tokens::T_SECONDARY)
                                .color(tokens::SECONDARY),
                        );
                    });
                });
                // STATUS
                ui.allocate_ui(egui::vec2(cols[4], tokens::TABLE_ROW_H), |ui| {
                    ui.vertical(|ui| {
                        ui.add_space(20.0);
                        widgets::pill(
                            ui,
                            job.status.dot(),
                            job.status.bg(),
                            job.status.fg(),
                            job.status.label(),
                        );
                    });
                });
                // TOTAL (right-aligned semibold).
                ui.allocate_ui(egui::vec2(cols[5], tokens::TABLE_ROW_H), |ui| {
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::TOP), |ui| {
                        ui.add_space(0.0);
                        ui.vertical(|ui| {
                            ui.add_space(20.0);
                            ui.label(
                                egui::RichText::new(job.total)
                                    .size(tokens::T_BODY)
                                    .strong()
                                    .color(tokens::TEXT),
                            );
                        });
                    });
                });
            });
        });
        ui.separator();
        if resp.clicked() {
            self.selected_id = Some(job.id);
        }
    }
}

// ——— Job detail drawer ———

impl CrmApp {
    fn drawer(&mut self, ctx: &egui::Context) {
        let Some(id) = self.selected_id else { return };
        let Some(job) = Self::lookup_job(id) else {
            self.selected_id = None;
            return;
        };
        let scr = ctx.viewport_rect();
        let w = (scr.width() * 0.46).clamp(480.0, 640.0);
        let step = match job.status {
            data::Status::Booked => 0,
            data::Status::InProgress => 1,
            data::Status::Done => 2,
            data::Status::Paid => 4,
        };
        egui::Window::new("job-drawer")
            .title_bar(false)
            .resizable(false)
            .collapsible(false)
            .fixed_size(egui::vec2(w, scr.height()))
            .anchor(egui::Align2::RIGHT_TOP, egui::vec2(0.0, 0.0))
            .frame(egui::Frame {
                fill: tokens::CARD,
                stroke: tokens::border(),
                corner_radius: egui::CornerRadius {
                    nw: tokens::R_MODAL,
                    ne: 0,
                    sw: tokens::R_MODAL,
                    se: 0,
                },
                inner_margin: egui::Margin::same(24),
                shadow: tokens::visuals().popup_shadow,
                ..Default::default()
            })
            .show(ctx, |ui| {
                egui::ScrollArea::vertical()
                    .auto_shrink([false, false])
                    .show(ui, |ui| {
                        ui.set_width(w - 48.0);
                        // Header: avatar + name + pill + close.
                        ui.horizontal(|ui| {
                            widgets::avatar(
                                ui,
                                &data::initials(job.customer),
                                data::avatar_color(job.customer),
                            );
                            ui.vertical(|ui| {
                                ui.spacing_mut().item_spacing = egui::vec2(2.0, 0.0);
                                ui.horizontal(|ui| {
                                    ui.spacing_mut().item_spacing = egui::vec2(10.0, 0.0);
                                    ui.label(
                                        egui::RichText::new(job.customer)
                                            .size(18.0)
                                            .strong()
                                            .color(tokens::TEXT),
                                    );
                                    widgets::pill(
                                        ui,
                                        job.status.dot(),
                                        job.status.bg(),
                                        job.status.fg(),
                                        job.status.label(),
                                    );
                                });
                                ui.label(
                                    egui::RichText::new(format!(
                                        "{} · Saturday 5 September 2026 · {}",
                                        job.id, job.time
                                    ))
                                    .size(tokens::T_SECONDARY)
                                    .color(tokens::SECONDARY),
                                );
                            });
                            ui.with_layout(egui::Layout::right_to_left(egui::Align::TOP), |ui| {
                                if ui
                                    .add_sized(
                                        egui::vec2(28.0, 28.0),
                                        egui::Button::new(
                                            egui::RichText::new("×")
                                                .size(16.0)
                                                .color(tokens::SECONDARY),
                                        )
                                        .fill(tokens::TRANSPARENT)
                                        .stroke(egui::Stroke::NONE)
                                        .frame(false),
                                    )
                                    .clicked()
                                {
                                    self.selected_id = None;
                                }
                            });
                        });
                        ui.add_space(16.0);
                        widgets::stepper(ui, step);
                        ui.add_space(16.0);
                        ui.horizontal(|ui| {
                            ui.spacing_mut().item_spacing = egui::vec2(12.0, 0.0);
                            if widgets::primary_button(ui, "Record payment").clicked() {}
                            if widgets::outline_button(ui, "Edit").clicked() {
                                self.show_new_job = true;
                            }
                            ui.with_layout(
                                egui::Layout::right_to_left(egui::Align::Center),
                                |ui| {
                                    widgets::text_button(ui, "Cancel job");
                                },
                            );
                        });
                        ui.add_space(16.0);
                        // ADDRESS + CREW side-by-side inside one bordered card.
                        egui::Frame {
                            fill: tokens::CARD,
                            stroke: tokens::border(),
                            corner_radius: egui::CornerRadius::same(tokens::R_CARD),
                            inner_margin: egui::Margin::same(20),
                            ..Default::default()
                        }
                        .show(ui, |ui| {
                            ui.set_width(w - 48.0 - tokens::CARD_PAD * 2.0);
                            ui.horizontal(|ui| {
                                ui.spacing_mut().item_spacing = egui::vec2(16.0, 0.0);
                                ui.allocate_ui(
                                    egui::vec2(
                                        (w - 48.0 - tokens::CARD_PAD * 2.0 - 16.0) / 2.0,
                                        0.0,
                                    ),
                                    |ui| {
                                        widgets::section_label(ui, "Address");
                                        ui.add_space(8.0);
                                        ui.label(
                                            egui::RichText::new(job.address)
                                                .size(15.0)
                                                .strong()
                                                .color(tokens::TEXT),
                                        );
                                        ui.label(
                                            egui::RichText::new(job.area)
                                                .size(tokens::T_SECONDARY)
                                                .color(tokens::SECONDARY),
                                        );
                                        ui.add_space(8.0);
                                        kv(ui, "Access", job.note);
                                        kv(ui, "Parking", "Loading bay");
                                    },
                                );
                                ui.separator();
                                ui.allocate_ui(
                                    egui::vec2(
                                        (w - 48.0 - tokens::CARD_PAD * 2.0 - 16.0) / 2.0,
                                        0.0,
                                    ),
                                    |ui| {
                                        widgets::section_label(ui, "Crew");
                                        ui.add_space(8.0);
                                        ui.horizontal(|ui| {
                                            ui.spacing_mut().item_spacing = egui::vec2(6.0, 0.0);
                                            let (r, _) = ui.allocate_exact_size(
                                                egui::vec2(10.0, 10.0),
                                                egui::Sense::hover(),
                                            );
                                            ui.painter().circle_filled(
                                                r.center(),
                                                5.0,
                                                job.van.color(),
                                            );
                                            ui.label(
                                                egui::RichText::new(format!(
                                                    "{}  {}",
                                                    job.van.name(),
                                                    job.van.reg()
                                                ))
                                                .size(tokens::T_BODY)
                                                .strong()
                                                .color(tokens::TEXT),
                                            );
                                        });
                                        ui.label(
                                            egui::RichText::new(job.crew)
                                                .size(tokens::T_BODY)
                                                .color(tokens::TEXT),
                                        );
                                        ui.label(
                                            egui::RichText::new(format!(
                                                "{} allowed",
                                                job.duration
                                            ))
                                            .size(tokens::T_SECONDARY)
                                            .color(tokens::SECONDARY),
                                        );
                                    },
                                );
                            });
                        });
                        ui.add_space(12.0);
                        drawer_section(ui, "Contact", |ui| {
                            ui.label(
                                egui::RichText::new(job.phone)
                                    .size(tokens::T_BODY)
                                    .color(tokens::TEXT),
                            );
                        });
                        drawer_section(ui, "Work", |ui| {
                            ui.label(
                                egui::RichText::new("Office carpet · per room")
                                    .size(tokens::T_BODY)
                                    .color(tokens::TEXT),
                            );
                        });
                        drawer_section(ui, "INV-2234", |ui| {
                            ui.horizontal(|ui| {
                                ui.spacing_mut().item_spacing = egui::vec2(10.0, 0.0);
                                widgets::pill(
                                    ui,
                                    job.status.dot(),
                                    job.status.bg(),
                                    job.status.fg(),
                                    job.status.label(),
                                );
                                ui.label(
                                    egui::RichText::new(job.total)
                                        .size(tokens::T_BODY)
                                        .strong()
                                        .color(tokens::TEXT),
                                );
                            });
                        });
                        drawer_section(ui, "Activity", |ui| {
                            widgets::search_field(ui, &mut self.drawer_note, "Add a note...");
                            ui.add_space(8.0);
                            ui.label(
                                egui::RichText::new("Booked 25 Aug, 08:30")
                                    .size(tokens::T_PILL)
                                    .color(tokens::MUTED),
                            );
                            ui.add_space(8.0);
                            ui.with_layout(
                                egui::Layout::right_to_left(egui::Align::Center),
                                |ui| {
                                    ui.label(
                                        egui::RichText::new(job.total)
                                            .size(tokens::T_SECTION)
                                            .strong()
                                            .color(tokens::TEXT),
                                    );
                                },
                            );
                        });
                    });
            });
    }
}

fn kv(ui: &mut egui::Ui, label: &str, value: &str) {
    ui.horizontal(|ui| {
        ui.spacing_mut().item_spacing = egui::vec2(6.0, 0.0);
        ui.label(
            egui::RichText::new(label)
                .size(tokens::T_SECONDARY)
                .color(tokens::MUTED),
        );
        ui.label(
            egui::RichText::new(value)
                .size(tokens::T_SECONDARY)
                .color(tokens::TEXT),
        );
    });
}

/// 11px uppercase micro column head (WORK table, Jobs headers reuse inline).
fn micro_head(ui: &mut egui::Ui, text: &str) {
    ui.label(
        egui::RichText::new(text)
            .size(11.0)
            .strong()
            .color(tokens::MUTED),
    );
}

fn drawer_section(ui: &mut egui::Ui, title: &str, add_body: impl FnOnce(&mut egui::Ui)) {
    ui.add_space(4.0);
    widgets::section_label(ui, title);
    ui.add_space(8.0);
    add_body(ui);
    ui.add_space(8.0);
    ui.separator();
}

// ——— Modals (centered, shared shell) ———

impl CrmApp {
    fn modal_shell(
        ctx: &egui::Context,
        id: &str,
        title: &str,
        w: f32,
        h: f32,
        add_body: impl FnOnce(&mut egui::Ui),
    ) -> bool {
        let mut closed = false;
        egui::Window::new(id)
            .title_bar(false)
            .resizable(false)
            .collapsible(false)
            .fixed_size(egui::vec2(w, h))
            .anchor(egui::Align2::CENTER_CENTER, egui::vec2(0.0, 0.0))
            .frame(egui::Frame {
                fill: tokens::CARD,
                stroke: tokens::border(),
                corner_radius: egui::CornerRadius::same(tokens::R_MODAL),
                inner_margin: egui::Margin::same(24),
                shadow: tokens::visuals().window_shadow,
                ..Default::default()
            })
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.label(
                        egui::RichText::new(title)
                            .size(18.0)
                            .strong()
                            .color(tokens::TEXT),
                    );
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        if ui
                            .add(
                                egui::Button::new(
                                    egui::RichText::new("×").size(16.0).color(tokens::SECONDARY),
                                )
                                .fill(tokens::TRANSPARENT)
                                .stroke(egui::Stroke::NONE)
                                .frame(false),
                            )
                            .clicked()
                        {
                            closed = true;
                        }
                    });
                });
                ui.add_space(4.0);
                ui.separator();
                ui.add_space(12.0);
                egui::ScrollArea::vertical()
                    .auto_shrink([false, false])
                    .show(ui, |ui| {
                        ui.set_width(w - 48.0);
                        add_body(ui);
                    });
            });
        closed
    }

    fn modal_new_job(&mut self, ctx: &egui::Context) {
        if Self::modal_shell(ctx, "new-job", "Edit job", 900.0, 640.0, |ui| {
            widgets::field(ui, "Customer", &mut self.nj_customer, "Search customers...");
            ui.add_space(12.0);
            ui.label(
                egui::RichText::new("Property")
                    .size(tokens::T_SECONDARY)
                    .strong()
                    .color(tokens::TEXT),
            );
            ui.add_space(4.0);
            ui.label(
                egui::RichText::new(self.nj_property.clone())
                    .size(tokens::T_BODY)
                    .color(tokens::TEXT),
            );
            ui.add_space(12.0);
            ui.columns(3, |cols| {
                widgets::field(&mut cols[0], "Date", &mut self.nj_date, "DD/MM/YYYY");
                widgets::field(&mut cols[1], "Start", &mut self.nj_start, "08:30 am");
                ui_column_field(&mut cols[2], "Duration", |ui| {
                    egui::ComboBox::from_label("")
                        .selected_text(["2h", "3h", "4h", "6h"][self.nj_duration])
                        .width(200.0)
                        .show_ui(ui, |ui| {
                            for (i, d) in ["2h", "3h", "4h", "6h"].iter().enumerate() {
                                ui.selectable_value(&mut self.nj_duration, i, *d);
                            }
                        });
                });
            });
            ui.add_space(12.0);
            ui.label(
                egui::RichText::new("Van")
                    .size(tokens::T_SECONDARY)
                    .strong()
                    .color(tokens::TEXT),
            );
            ui.add_space(8.0);
            widgets::segmented(ui, &["Van 1", "Van 2"], &mut self.nj_van);
            ui.add_space(12.0);
            ui.label(
                egui::RichText::new("Crew")
                    .size(tokens::T_SECONDARY)
                    .strong()
                    .color(tokens::TEXT),
            );
            ui.add_space(8.0);
            widgets::segmented(ui, &["Marcus", "Priya", "Jake"], &mut self.nj_crew);
            ui.add_space(12.0);
            widgets::section_label(ui, "Work");
            ui.add_space(8.0);
            ui.horizontal(|ui| {
                ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
                ui.allocate_ui(egui::vec2(232.0, 18.0), |ui| {
                    micro_head(ui, "ITEM");
                });
                ui.allocate_ui(egui::vec2(80.0, 18.0), |ui| {
                    micro_head(ui, "QTY");
                });
                ui.allocate_ui(egui::vec2(80.0, 18.0), |ui| {
                    micro_head(ui, "UNIT");
                });
            });
            let mut remove_at: Option<usize> = None;
            for (i, line) in self.nj_lines.iter_mut().enumerate() {
                ui.horizontal(|ui| {
                    ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
                    ui.add_sized(
                        egui::vec2(232.0, tokens::INPUT_H),
                        egui::TextEdit::singleline(&mut line.0),
                    );
                    ui.add_sized(
                        egui::vec2(80.0, tokens::INPUT_H),
                        egui::TextEdit::singleline(&mut line.1),
                    );
                    ui.add_sized(
                        egui::vec2(80.0, tokens::INPUT_H),
                        egui::TextEdit::singleline(&mut line.2),
                    );
                    if ui.add(egui::Button::new("×").frame(false)).clicked() {
                        remove_at = Some(i);
                    }
                });
                ui.add_space(8.0);
            }
            if let Some(i) = remove_at {
                self.nj_lines.remove(i);
            }
            if widgets::outline_button(ui, "+ Add service").clicked() {
                self.nj_lines
                    .push((String::new(), String::new(), String::new()));
            }
            ui.add_space(12.0);
            ui.columns(2, |cols| {
                ui_column_field(&mut cols[0], "Notes for the crew", |ui| {
                    widgets::multiline(
                        ui,
                        &mut self.nj_notes_crew,
                        "What to focus on, what the customer said...",
                    );
                });
                ui_column_field(&mut cols[1], "Office notes", |ui| {
                    widgets::multiline(ui, &mut self.nj_notes_office, "");
                });
            });
            ui.add_space(16.0);
            ui.separator();
            ui.add_space(12.0);
            ui.horizontal(|ui| {
                ui.horizontal(|ui| {
                    ui.spacing_mut().item_spacing = egui::vec2(6.0, 0.0);
                    ui.label(
                        egui::RichText::new("Total")
                            .size(tokens::T_SECONDARY)
                            .color(tokens::SECONDARY),
                    );
                    ui.label(
                        egui::RichText::new("£477.40 · 4h")
                            .size(15.0)
                            .strong()
                            .color(tokens::TEXT),
                    );
                });
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
                    if widgets::primary_button(ui, "Save").clicked() {
                        self.show_new_job = false;
                    }
                    if widgets::outline_button(ui, "Cancel").clicked() {
                        self.show_new_job = false;
                    }
                });
            });
        }) {
            self.show_new_job = false;
        }
    }

    fn modal_new_customer(&mut self, ctx: &egui::Context) {
        if Self::modal_shell(ctx, "new-customer", "New customer", 900.0, 640.0, |ui| {
            ui.label(
                egui::RichText::new("Customer type")
                    .size(tokens::T_SECONDARY)
                    .strong()
                    .color(tokens::TEXT),
            );
            ui.add_space(8.0);
            widgets::segmented(ui, &["Residential", "Commercial"], &mut self.nc_type);
            ui.add_space(12.0);
            ui.columns(2, |cols| {
                widgets::field(&mut cols[0], "First name", &mut self.nc_first, "");
                widgets::field(&mut cols[1], "Last name", &mut self.nc_last, "");
            });
            ui.add_space(12.0);
            ui.columns(2, |cols| {
                widgets::field(&mut cols[0], "Mobile / phone", &mut self.nc_mobile, "07...");
                widgets::field(&mut cols[1], "Alternative phone", &mut self.nc_alt, "");
            });
            ui.add_space(12.0);
            ui.columns(2, |cols| {
                widgets::field(&mut cols[0], "Email", &mut self.nc_email, "");
                widgets::field(
                    &mut cols[1],
                    "How did they find us?",
                    &mut self.nc_found,
                    "",
                );
            });
            ui.add_space(12.0);
            ui.label(
                egui::RichText::new("Tags")
                    .size(tokens::T_SECONDARY)
                    .strong()
                    .color(tokens::TEXT),
            );
            ui.add_space(8.0);
            ui.horizontal_wrapped(|ui| {
                ui.spacing_mut().item_spacing = egui::vec2(8.0, 8.0);
                for (i, name) in TAG_NAMES.iter().enumerate() {
                    if widgets::tag(ui, name, self.nc_tags[i]).clicked() {
                        self.nc_tags[i] = !self.nc_tags[i];
                    }
                }
            });
            ui.add_space(12.0);
            ui.label(
                egui::RichText::new("Notes")
                    .size(tokens::T_SECONDARY)
                    .strong()
                    .color(tokens::TEXT),
            );
            ui.add_space(8.0);
            widgets::multiline(
                ui,
                &mut self.nc_notes,
                "Pets, preferences, anything the crew should know...",
            );
            ui.add_space(12.0);
            widgets::section_label(ui, "Property address");
            ui.add_space(8.0);
            widgets::field(ui, "Address line 1", &mut self.nc_addr, "");
            ui.add_space(16.0);
            ui.separator();
            ui.add_space(12.0);
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
                if widgets::primary_button(ui, "Save").clicked() {
                    self.show_new_customer = false;
                }
                if widgets::outline_button(ui, "Cancel").clicked() {
                    self.show_new_customer = false;
                }
            });
        }) {
            self.show_new_customer = false;
        }
    }
}

/// Label + custom control inside a `columns()` cell (borrows one column).
fn ui_column_field(ui: &mut egui::Ui, label: &str, add_control: impl FnOnce(&mut egui::Ui)) {
    ui.label(
        egui::RichText::new(label)
            .size(tokens::T_SECONDARY)
            .strong()
            .color(tokens::TEXT),
    );
    ui.add_space(8.0);
    add_control(ui);
}

// ——— Settings ———

impl CrmApp {
    fn page_settings(&mut self, ui: &mut egui::Ui) {
        Self::content_frame(ui, |ui| {
            Self::header_row(
                ui,
                "Settings",
                "Business details, vans, crew and price list",
                |ui| {
                    // Muted sage until dirty (spec §9.13 nuance).
                    ui.add(
                        egui::Button::new(
                            egui::RichText::new("Save changes")
                                .size(tokens::T_BODY)
                                .color(tokens::WHITE)
                                .strong(),
                        )
                        .fill(tokens::CTA_GREEN_DIM)
                        .stroke(egui::Stroke::NONE)
                        .corner_radius(egui::CornerRadius::same(tokens::R_INPUT))
                        .min_size(egui::vec2(0.0, tokens::BTN_H)),
                    );
                },
            );
            ui.add_space(16.0);
            egui::ScrollArea::vertical()
                .auto_shrink([false, false])
                .show(ui, |ui| {
                    ui.columns(2, |cols| {
                        // Left: Business + Invoicing stacked.
                        Self::card_frame(&mut cols[0], |ui| {
                            ui.set_width(ui.available_width());
                            settings_title(ui, "Business");
                            widgets::field(ui, "Business name", &mut self.biz_name, "");
                            ui.add_space(8.0);
                            widgets::field(ui, "Tagline", &mut self.tagline, "");
                            ui.add_space(8.0);
                            ui.columns(2, |pair| {
                                widgets::field(&mut pair[0], "Owner", &mut self.owner, "");
                                widgets::field(&mut pair[1], "Phone", &mut self.biz_phone, "");
                            });
                            ui.add_space(8.0);
                            ui.columns(2, |pair| {
                                widgets::field(&mut pair[0], "Email", &mut self.biz_email, "");
                                widgets::field(&mut pair[1], "Website", &mut self.website, "");
                            });
                            ui.add_space(8.0);
                            widgets::field(ui, "Address", &mut self.biz_addr, "");
                        });
                        cols[0].add_space(12.0);
                        Self::card_frame(&mut cols[0], |ui| {
                            ui.set_width(ui.available_width());
                            settings_title(ui, "Invoicing");
                            widgets::field(ui, "Payment terms (days)", &mut self.terms, "");
                            ui.add_space(8.0);
                            ui.label(
                                egui::RichText::new("Invoice footer")
                                    .size(tokens::T_SECONDARY)
                                    .strong()
                                    .color(tokens::TEXT),
                            );
                            ui.add_space(8.0);
                            widgets::multiline(ui, &mut self.invoice_footer, "");
                        });
                        // Right: Vans + Cleaners stacked.
                        Self::card_frame(&mut cols[1], |ui| {
                            ui.set_width(ui.available_width());
                            settings_title(ui, "Vans");
                            for i in 0..2 {
                                self.van_row(ui, i);
                            }
                            if widgets::outline_button(ui, "+ Add van").clicked() {}
                        });
                        cols[1].add_space(12.0);
                        Self::card_frame(&mut cols[1], |ui| {
                            ui.set_width(ui.available_width());
                            settings_title(ui, "Cleaners");
                            for i in 0..2 {
                                self.crew_row(ui, i);
                            }
                            if widgets::outline_button(ui, "+ Add cleaner").clicked() {}
                        });
                    });
                });
        });
    }

    fn van_row(&mut self, ui: &mut egui::Ui, i: usize) {
        ui.horizontal(|ui| {
            ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
            egui::Frame {
                fill: if i == 0 {
                    tokens::INFO_BLUE
                } else {
                    tokens::WARN_ORANGE
                },
                stroke: tokens::border(),
                corner_radius: egui::CornerRadius::same(6),
                ..Default::default()
            }
            .show(ui, |ui| {
                ui.allocate_ui(egui::vec2(28.0, 28.0), |_| {});
            });
            ui.add_sized(
                egui::vec2(130.0, tokens::INPUT_H),
                egui::TextEdit::singleline(&mut self.van_names[i]),
            );
            ui.add_sized(
                egui::vec2(100.0, tokens::INPUT_H),
                egui::TextEdit::singleline(&mut self.van_regs[i]),
            );
            ui.checkbox(&mut self.van_active[i], "Active");
            if widgets::outline_button(ui, "Save").clicked() {}
        });
        ui.add_space(8.0);
    }

    fn crew_row(&mut self, ui: &mut egui::Ui, i: usize) {
        ui.horizontal(|ui| {
            ui.spacing_mut().item_spacing = egui::vec2(8.0, 0.0);
            ui.add_sized(
                egui::vec2(130.0, tokens::INPUT_H),
                egui::TextEdit::singleline(&mut self.crew_names[i]),
            );
            ui.add_sized(
                egui::vec2(110.0, tokens::INPUT_H),
                egui::TextEdit::singleline(&mut self.crew_phones[i]),
            );
            egui::ComboBox::from_label(format!("crew-van-{i}"))
                .selected_text(format!("Van {}", self.crew_van[i] + 1))
                .width(90.0)
                .show_ui(ui, |ui| {
                    ui.selectable_value(&mut self.crew_van[i], 0, "Van 1");
                    ui.selectable_value(&mut self.crew_van[i], 1, "Van 2");
                });
            ui.checkbox(&mut self.crew_active[i], "Active");
            if widgets::outline_button(ui, "Save").clicked() {}
        });
        ui.add_space(8.0);
    }
}

fn settings_title(ui: &mut egui::Ui, title: &str) {
    ui.label(
        egui::RichText::new(title)
            .size(15.0)
            .strong()
            .color(tokens::TEXT),
    );
    ui.add_space(12.0);
}

// ——— Placeholder pages (empty states per spec §13) ———

impl CrmApp {
    #[allow(clippy::too_many_arguments)]
    fn page_placeholder(
        &mut self,
        ui: &mut egui::Ui,
        title: &str,
        sub: &str,
        empty_title: &str,
        empty_hint: &str,
        action: &str,
        wires_modal: bool,
    ) {
        Self::content_frame(ui, |ui| {
            Self::header_row(ui, title, sub, |_| {});
            if widgets::empty_state(ui, empty_title, empty_hint, action).clicked() && wires_modal {
                if title == "Customers" {
                    self.show_new_customer = true;
                } else {
                    self.show_new_job = true;
                }
            }
        });
    }
}
