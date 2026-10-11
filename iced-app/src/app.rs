//! QuarkZip iced shell — same compact CRM screens as the egui app, in Elm
//! architecture (state + messages + pure view), for side-by-side comparison.

use crate::{data, tokens};
use iced::{
    widget::{
        button, checkbox, column, container, mouse_area, pick_list, row, scrollable, text,
        text_input, Space, Stack,
    },
    Alignment, Background, Border, Color, Element,
    Length::*,
    Padding, Shadow, Task, Theme,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Page {
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

#[derive(Debug, Clone)]
pub enum Message {
    Page(Page),
    Search(String),
    TableSearch(String),
    Tab(usize),
    VanFilter(String),
    JobSelected(&'static str),
    CloseOverlays,
    OpenNewJob,
    OpenNewCustomer,
    DrawerNote(String),
    NjCustomer(String),
    NjDate(String),
    NjStart(String),
    NjDuration(String),
    NjVan(usize),
    NjCrew(usize),
    NjItem(usize, String),
    NjQty(usize, String),
    NjUnit(usize, String),
    NjAddLine,
    NjRemoveLine(usize),
    NjNotesCrew(String),
    NjNotesOffice(String),
    NcType(usize),
    NcFirst(String),
    NcLast(String),
    NcMobile(String),
    NcAlt(String),
    NcEmail(String),
    NcFound(String),
    NcTag(usize),
    NcNotes(String),
    NcAddr(String),
    BizName(String),
    Tagline(String),
    Owner(String),
    BizPhone(String),
    BizEmail(String),
    Website(String),
    BizAddr(String),
    Terms(String),
    InvoiceFooter(String),
    VanName(usize, String),
    VanReg(usize, String),
    VanActive(usize, bool),
    CrewName(usize, String),
    CrewPhone(usize, String),
    CrewVan(usize, String),
    CrewActive(usize, bool),
}

pub struct App {
    page: Page,
    search: String,
    table_search: String,
    job_tab: usize,
    van_filter: String,
    selected_id: Option<&'static str>,
    show_new_job: bool,
    show_new_customer: bool,
    drawer_note: String,
    nj_customer: String,
    nj_property: String,
    nj_date: String,
    nj_start: String,
    nj_duration: String,
    nj_van: usize,
    nj_crew: usize,
    nj_lines: Vec<(String, String, String)>,
    nj_notes_crew: String,
    nj_notes_office: String,
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
    crew_van: [String; 2],
    crew_active: [bool; 2],
}

impl Default for App {
    fn default() -> Self {
        Self {
            page: Page::Today,
            search: String::new(),
            table_search: String::new(),
            job_tab: 2,
            van_filter: "All vans".to_string(),
            selected_id: None,
            show_new_job: false,
            show_new_customer: false,
            drawer_note: String::new(),
            nj_customer: "Bishopston Nursery".to_string(),
            nj_property: "71 Kings Drive, BS7 4GD".to_string(),
            nj_date: "05/09/2026".to_string(),
            nj_start: "08:30 am".to_string(),
            nj_duration: "4h".to_string(),
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
            crew_van: ["Van 1".to_string(), "Van 2".to_string()],
            crew_active: [true, true],
        }
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

impl App {
    pub fn update(state: &mut App, message: Message) -> Task<Message> {
        match message {
            Message::Page(p) => state.page = p,
            Message::Search(s) => state.search = s,
            Message::TableSearch(s) => state.table_search = s,
            Message::Tab(i) => state.job_tab = i,
            Message::VanFilter(v) => state.van_filter = v,
            Message::JobSelected(id) => state.selected_id = Some(id),
            Message::CloseOverlays => {
                state.selected_id = None;
                state.show_new_job = false;
                state.show_new_customer = false;
            }
            Message::OpenNewJob => state.show_new_job = true,
            Message::OpenNewCustomer => state.show_new_customer = true,
            Message::DrawerNote(s) => state.drawer_note = s,
            Message::NjCustomer(s) => state.nj_customer = s,
            Message::NjDate(s) => state.nj_date = s,
            Message::NjStart(s) => state.nj_start = s,
            Message::NjDuration(s) => state.nj_duration = s,
            Message::NjVan(i) => state.nj_van = i,
            Message::NjCrew(i) => state.nj_crew = i,
            Message::NjItem(i, s) => {
                if let Some(line) = state.nj_lines.get_mut(i) {
                    line.0 = s;
                }
            }
            Message::NjQty(i, s) => {
                if let Some(line) = state.nj_lines.get_mut(i) {
                    line.1 = s;
                }
            }
            Message::NjUnit(i, s) => {
                if let Some(line) = state.nj_lines.get_mut(i) {
                    line.2 = s;
                }
            }
            Message::NjAddLine => {
                state
                    .nj_lines
                    .push((String::new(), String::new(), String::new()))
            }
            Message::NjRemoveLine(i) => {
                if i < state.nj_lines.len() {
                    state.nj_lines.remove(i);
                }
            }
            Message::NjNotesCrew(s) => state.nj_notes_crew = s,
            Message::NjNotesOffice(s) => state.nj_notes_office = s,
            Message::NcType(i) => state.nc_type = i,
            Message::NcFirst(s) => state.nc_first = s,
            Message::NcLast(s) => state.nc_last = s,
            Message::NcMobile(s) => state.nc_mobile = s,
            Message::NcAlt(s) => state.nc_alt = s,
            Message::NcEmail(s) => state.nc_email = s,
            Message::NcFound(s) => state.nc_found = s,
            Message::NcTag(i) => state.nc_tags[i] = !state.nc_tags[i],
            Message::NcNotes(s) => state.nc_notes = s,
            Message::NcAddr(s) => state.nc_addr = s,
            Message::BizName(s) => state.biz_name = s,
            Message::Tagline(s) => state.tagline = s,
            Message::Owner(s) => state.owner = s,
            Message::BizPhone(s) => state.biz_phone = s,
            Message::BizEmail(s) => state.biz_email = s,
            Message::Website(s) => state.website = s,
            Message::BizAddr(s) => state.biz_addr = s,
            Message::Terms(s) => state.terms = s,
            Message::InvoiceFooter(s) => state.invoice_footer = s,
            Message::VanName(i, s) => state.van_names[i] = s,
            Message::VanReg(i, s) => state.van_regs[i] = s,
            Message::VanActive(i, b) => state.van_active[i] = b,
            Message::CrewName(i, s) => state.crew_names[i] = s,
            Message::CrewPhone(i, s) => state.crew_phones[i] = s,
            Message::CrewVan(i, s) => state.crew_van[i] = s,
            Message::CrewActive(i, b) => state.crew_active[i] = b,
        }
        Task::none()
    }

    pub fn view(state: &App) -> Element<'_, Message> {
        let main = row![sidebar(state), content(state)]
            .spacing(0)
            .width(Fill)
            .height(Fill);
        let mut layers: Vec<Element<Message>> = vec![main.into()];
        let overlay_open =
            state.selected_id.is_some() || state.show_new_job || state.show_new_customer;
        if overlay_open {
            layers.push(dim_layer());
        }
        if let Some(id) = state.selected_id {
            if let Some(job) = lookup_job(id) {
                layers.push(drawer(state, job));
            }
        }
        if state.show_new_job {
            layers.push(job_modal(state));
        }
        if state.show_new_customer {
            layers.push(customer_modal(state));
        }
        Stack::from_vec(layers).width(Fill).height(Fill).into()
    }
}

// ——— shared styles ———

fn no_border() -> Border {
    Border {
        color: Color::TRANSPARENT,
        width: 0.0,
        radius: 0.0.into(),
    }
}

fn thin_border() -> Border {
    Border {
        color: tokens::BORDER,
        width: 1.0,
        radius: 9.0.into(),
    }
}

fn card_style() -> container::Style {
    container::Style {
        text_color: None,
        background: Some(Background::Color(tokens::CARD)),
        border: Border {
            color: tokens::BORDER,
            width: 1.0,
            radius: 12.0.into(),
        },
        shadow: Shadow::default(),
        snap: true,
    }
}

fn input_style() -> impl Fn(&Theme, text_input::Status) -> text_input::Style {
    |_theme: &Theme, _status| text_input::Style {
        background: Background::Color(tokens::CARD),
        border: thin_border(),
        icon: tokens::MUTED,
        placeholder: tokens::MUTED,
        value: tokens::TEXT,
        selection: tokens::LIGHT_GREEN,
    }
}

fn primary_style() -> impl Fn(&Theme, button::Status) -> button::Style {
    |_theme: &Theme, _status| button::Style {
        background: Some(Background::Color(tokens::CTA_GREEN)),
        text_color: tokens::WHITE,
        border: Border {
            color: Color::TRANSPARENT,
            width: 0.0,
            radius: 9.0.into(),
        },
        shadow: Shadow::default(),
        snap: true,
    }
}

fn outline_style() -> impl Fn(&Theme, button::Status) -> button::Style {
    |_theme: &Theme, _status| button::Style {
        background: Some(Background::Color(tokens::CARD)),
        text_color: tokens::TEXT,
        border: Border {
            color: tokens::BORDER,
            width: 1.0,
            radius: 9.0.into(),
        },
        shadow: Shadow::default(),
        snap: true,
    }
}

fn ghost_style() -> impl Fn(&Theme, button::Status) -> button::Style {
    |_theme: &Theme, _status| button::Style {
        background: None,
        text_color: tokens::TEXT,
        border: no_border(),
        shadow: Shadow::default(),
        snap: true,
    }
}

fn nav_style(active: bool) -> impl Fn(&Theme, button::Status) -> button::Style {
    move |_theme: &Theme, _status| button::Style {
        background: Some(Background::Color(if active {
            tokens::NAV_ACTIVE
        } else {
            Color::TRANSPARENT
        })),
        text_color: tokens::TEXT,
        border: Border {
            color: Color::TRANSPARENT,
            width: 0.0,
            radius: 8.0.into(),
        },
        shadow: Shadow::default(),
        snap: true,
    }
}

fn dim_style() -> container::Style {
    container::Style {
        text_color: None,
        background: Some(Background::Color(tokens::DIM)),
        border: no_border(),
        shadow: Shadow::default(),
        snap: true,
    }
}

fn divider() -> Element<'static, Message> {
    container(Space::new().width(Fill).height(Fixed(1.0)))
        .style(|_theme: &Theme| container::Style {
            text_color: None,
            background: Some(Background::Color(tokens::BORDER)),
            border: no_border(),
            shadow: Shadow::default(),
            snap: true,
        })
        .into()
}

// ——— shared widgets ———

fn title_text(s: &str) -> Element<'_, Message> {
    text(s).size(26).color(tokens::TEXT).into()
}

fn sub_text(s: &str) -> Element<'_, Message> {
    text(s).size(13).color(tokens::SECONDARY).into()
}

fn section_label(s: &str) -> Element<'_, Message> {
    text(s.to_uppercase()).size(12).color(tokens::MUTED).into()
}

fn micro_head(s: &'static str) -> iced::widget::Text<'static> {
    text(s).size(11).color(tokens::MUTED)
}

/// Status pill: dot + text, color + text (never color alone).
fn pill(status: data::Status) -> Element<'static, Message> {
    container(
        row![
            container(Space::new().width(Fixed(7.0)).height(Fixed(7.0))).style(
                move |_theme: &Theme| container::Style {
                    text_color: None,
                    background: Some(Background::Color(status.dot())),
                    border: Border {
                        color: Color::TRANSPARENT,
                        width: 0.0,
                        radius: 4.0.into(),
                    },
                    shadow: Shadow::default(),
                    snap: true,
                }
            ),
            text(status.label()).size(12).color(status.fg()),
        ]
        .spacing(6)
        .align_y(Alignment::Center),
    )
    .padding(Padding {
        top: 6.0,
        right: 10.0,
        bottom: 6.0,
        left: 10.0,
    })
    .style(move |_theme: &Theme| container::Style {
        text_color: None,
        background: Some(Background::Color(status.bg())),
        border: Border {
            color: Color::TRANSPARENT,
            width: 0.0,
            radius: 12.0.into(),
        },
        shadow: Shadow::default(),
        snap: true,
    })
    .into()
}

/// 32px circular initials avatar on a deterministic muted background.
fn avatar(initials: String, bg: Color) -> Element<'static, Message> {
    container(text(initials).size(12).color(tokens::WHITE))
        .center_x(Fixed(32.0))
        .center_y(Fixed(32.0))
        .style(move |_theme: &Theme| container::Style {
            text_color: None,
            background: Some(Background::Color(bg)),
            border: Border {
                color: Color::TRANSPARENT,
                width: 0.0,
                radius: 16.0.into(),
            },
            shadow: Shadow::default(),
            snap: true,
        })
        .into()
}

/// Numbered stop circle, tinted by van color.
fn stop_circle(n: u32, bg: Color, fg: Color) -> Element<'static, Message> {
    container(text(n.to_string()).size(13).color(fg))
        .center_x(Fixed(28.0))
        .center_y(Fixed(28.0))
        .style(move |_theme: &Theme| container::Style {
            text_color: None,
            background: Some(Background::Color(bg)),
            border: Border {
                color: Color::TRANSPARENT,
                width: 0.0,
                radius: 14.0.into(),
            },
            shadow: Shadow::default(),
            snap: true,
        })
        .into()
}

fn primary_btn(label: &'static str, msg: Message) -> Element<'static, Message> {
    button(text(label).size(14).color(tokens::WHITE))
        .on_press(msg)
        .padding(10)
        .style(primary_style())
        .into()
}

fn outline_btn(label: &'static str, msg: Option<Message>) -> Element<'static, Message> {
    let mut b = button(text(label).size(14).color(tokens::TEXT))
        .padding(10)
        .style(outline_style());
    if let Some(m) = msg {
        b = b.on_press(m);
    }
    b.into()
}

fn search_input<'a>(
    value: &'a str,
    hint: &'static str,
    msg: fn(String) -> Message,
) -> Element<'a, Message> {
    text_input(hint, value)
        .on_input(msg)
        .padding(10)
        .width(Fill)
        .style(input_style())
        .into()
}

fn field<'a>(
    label: &'static str,
    input: impl Into<Element<'a, Message>>,
) -> iced::widget::Column<'a, Message> {
    column![text(label).size(13).color(tokens::TEXT), input.into(),].spacing(8)
}

const VAN_OPTS: [&str; 2] = ["Van 1", "Van 2"];
const CREW_OPTS: [&str; 3] = ["Marcus", "Priya", "Jake"];
const CUST_OPTS: [&str; 2] = ["Residential", "Commercial"];

/// Segmented single-select (N≤3): joined soft container, white segment.
fn segmented<'a>(
    options: &'a [&'static str],
    selected: usize,
    to_msg: fn(usize) -> Message,
) -> Element<'a, Message> {
    let mut r = row![].spacing(4);
    for (i, opt) in options.iter().enumerate() {
        let on = i == selected;
        r = r.push(
            button(text(*opt).size(14).color(tokens::TEXT))
                .on_press(to_msg(i))
                .padding(8)
                .style(
                    move |_theme: &Theme, _status: button::Status| button::Style {
                        background: Some(Background::Color(if on {
                            tokens::CARD
                        } else {
                            Color::TRANSPARENT
                        })),
                        text_color: tokens::TEXT,
                        border: if on {
                            Border {
                                color: tokens::BORDER,
                                width: 1.0,
                                radius: 6.0.into(),
                            }
                        } else {
                            no_border()
                        },
                        shadow: Shadow::default(),
                        snap: true,
                    },
                ),
        );
    }
    container(r)
        .padding(4)
        .style(|_theme: &Theme| container::Style {
            text_color: None,
            background: Some(Background::Color(tokens::SOFT_FILL)),
            border: Border {
                color: Color::TRANSPARENT,
                width: 0.0,
                radius: 8.0.into(),
            },
            shadow: Shadow::default(),
            snap: true,
        })
        .into()
}

/// Horizontal 4-node status stepper: Booked — In progress — Done — Paid.
fn stepper(current: usize) -> Element<'static, Message> {
    const STEPS: [&str; 4] = ["Booked", "In progress", "Done", "Paid"];
    let mut r = row![].spacing(8).align_y(Alignment::Center);
    for (i, step) in STEPS.iter().enumerate() {
        let done = i < current;
        let here = i == current;
        let node = if done {
            container(Space::new().width(Fixed(20.0)).height(Fixed(20.0))).style(
                |_theme: &Theme| container::Style {
                    text_color: None,
                    background: Some(Background::Color(tokens::CTA_GREEN)),
                    border: Border {
                        color: Color::TRANSPARENT,
                        width: 0.0,
                        radius: 10.0.into(),
                    },
                    shadow: Shadow::default(),
                    snap: true,
                },
            )
        } else if here {
            container(
                container(Space::new().width(Fixed(6.0)).height(Fixed(6.0))).style(
                    |_theme: &Theme| container::Style {
                        text_color: None,
                        background: Some(Background::Color(tokens::CTA_GREEN)),
                        border: Border {
                            color: Color::TRANSPARENT,
                            width: 0.0,
                            radius: 3.0.into(),
                        },
                        shadow: Shadow::default(),
                        snap: true,
                    },
                ),
            )
            .center_x(Fixed(20.0))
            .center_y(Fixed(20.0))
            .style(|_theme: &Theme| container::Style {
                text_color: None,
                background: Some(Background::Color(tokens::LIGHT_GREEN)),
                border: Border {
                    color: tokens::CTA_GREEN,
                    width: 2.0,
                    radius: 10.0.into(),
                },
                shadow: Shadow::default(),
                snap: true,
            })
        } else {
            container(Space::new().width(Fixed(20.0)).height(Fixed(20.0))).style(
                |_theme: &Theme| container::Style {
                    text_color: None,
                    background: None,
                    border: Border {
                        color: tokens::BORDER,
                        width: 1.0,
                        radius: 10.0.into(),
                    },
                    shadow: Shadow::default(),
                    snap: true,
                },
            )
        };
        r = r.push(node);
        r = r.push(text(*step).size(14).color(if done || here {
            tokens::TEXT
        } else {
            tokens::MUTED
        }));
        if i < STEPS.len() - 1 {
            r = r.push(text("──").size(10).color(if done {
                tokens::CTA_GREEN
            } else {
                tokens::BORDER
            }));
        }
    }
    r.into()
}

// ——— AppShell ———

fn sidebar(state: &App) -> Element<'_, Message> {
    let nav = [
        (Page::Today, None, None),
        (Page::Calendar, None, None),
        (Page::Jobs, None, None),
        (Page::Customers, None, None),
        (Page::Quotes, Some("8"), None),
        (Page::Invoices, None, Some("12")),
    ];
    let mut items = column![].spacing(2);
    for (page, quiet, alert) in nav {
        items = items.push(nav_item(state.page == page, page, quiet, alert));
    }
    container(
        column![
            // Brand block.
            row![
                container(text("B").size(18).color(tokens::WHITE))
                    .center_x(Fixed(36.0))
                    .center_y(Fixed(36.0))
                    .style(|_theme: &Theme| container::Style {
                        text_color: None,
                        background: Some(Background::Color(tokens::CTA_GREEN)),
                        border: Border {
                            color: Color::TRANSPARENT,
                            width: 0.0,
                            radius: 10.0.into(),
                        },
                        shadow: Shadow::default(),
                        snap: true,
                    }),
                column![
                    text("Brightway Carpet Care").size(15).color(tokens::TEXT),
                    text("CRM").size(12).color(tokens::MUTED),
                ]
                .spacing(2),
            ]
            .spacing(12)
            .align_y(Alignment::Center),
            search_input(&state.search, "Search  ·  Cmd K", Message::Search),
            items,
            section_label("BUSINESS"),
            nav_item(state.page == Page::Settings, Page::Settings, None, None),
            Space::new().height(Fill),
            text("2 vans · 3 cleaners")
                .size(13)
                .color(tokens::SECONDARY),
            text("Saturday 5 September").size(13).color(tokens::MUTED),
        ]
        .spacing(16)
        .width(Fill),
    )
    .width(Fixed(300.0))
    .height(Fill)
    .padding(18)
    .style(|_theme: &Theme| container::Style {
        text_color: None,
        background: Some(Background::Color(tokens::SIDEBAR)),
        border: no_border(),
        shadow: Shadow::default(),
        snap: true,
    })
    .into()
}

fn nav_item(
    active: bool,
    page: Page,
    quiet: Option<&'static str>,
    alert: Option<&'static str>,
) -> Element<'static, Message> {
    let mut inner =
        row![text(page.title()).size(14).color(tokens::TEXT)].align_y(Alignment::Center);
    if let Some(n) = alert {
        inner = inner.push(Space::new().width(Fill));
        inner = inner.push(
            container(text(n).size(12).color(tokens::WHITE))
                .padding(Padding {
                    top: 4.0,
                    right: 8.0,
                    bottom: 4.0,
                    left: 8.0,
                })
                .style(|_theme: &Theme| container::Style {
                    text_color: None,
                    background: Some(Background::Color(tokens::DANGER)),
                    border: Border {
                        color: Color::TRANSPARENT,
                        width: 0.0,
                        radius: 10.0.into(),
                    },
                    shadow: Shadow::default(),
                    snap: true,
                }),
        );
    } else if let Some(n) = quiet {
        inner = inner.push(Space::new().width(Fill));
        inner = inner.push(text(n).size(13).color(tokens::MUTED));
    }
    button(inner.width(Fill))
        .on_press(Message::Page(page))
        .padding(10)
        .width(Fill)
        .style(nav_style(active))
        .into()
}

fn content(state: &App) -> Element<'_, Message> {
    let page = match state.page {
        Page::Today => page_today(),
        Page::Jobs => page_jobs(state),
        Page::Settings => page_settings(state),
        Page::Customers => page_placeholder(
            "Customers",
            "12 customers · 3 commercial",
            "No customers match this view yet.",
            "Customer list arrives with the model layer.",
            "New customer",
            Some(Message::OpenNewCustomer),
        ),
        Page::Calendar => page_placeholder(
            "Calendar",
            "September 2026 · 33 jobs booked",
            "Nothing scheduled in this view yet.",
            "The week grid arrives with the model layer.",
            "New job",
            Some(Message::OpenNewJob),
        ),
        Page::Quotes => page_placeholder(
            "Quotes",
            "8 quotes · £1,134.60",
            "No quotes match this view yet.",
            "Quote cards arrive with the model layer.",
            "New quote",
            Some(Message::OpenNewJob),
        ),
        Page::Invoices => page_placeholder(
            "Invoices",
            "33 invoices · £6,258.80",
            "No invoices match this view yet.",
            "Invoice rows arrive with the model layer.",
            "New invoice",
            Some(Message::OpenNewJob),
        ),
    };
    container(page)
        .padding(32)
        .width(Fill)
        .height(Fill)
        .style(|_theme: &Theme| container::Style {
            text_color: None,
            background: Some(Background::Color(tokens::CONTENT)),
            border: no_border(),
            shadow: Shadow::default(),
            snap: true,
        })
        .into()
}

fn header_row<'a>(
    title: &'static str,
    sub: &'static str,
    actions: Vec<Element<'a, Message>>,
) -> Element<'a, Message> {
    let mut r = row![
        column![title_text(title), sub_text(sub),].spacing(4),
        Space::new().width(Fill),
    ]
    .spacing(8)
    .align_y(Alignment::Center);
    for a in actions {
        r = r.push(a);
    }
    r.into()
}

// ——— Today dashboard ———

fn page_today() -> Element<'static, Message> {
    let mut kpis = row![].spacing(12);
    for kpi in data::kpis() {
        kpis = kpis.push(
            container(
                column![
                    text(kpi.label).size(13).color(tokens::SECONDARY),
                    text(kpi.value).size(26).color(if kpi.alert {
                        tokens::DANGER
                    } else {
                        tokens::TEXT
                    }),
                    text(kpi.sub).size(13).color(tokens::MUTED),
                ]
                .spacing(5)
                .width(Fill),
            )
            .padding(20)
            .width(FillPortion(1))
            .style(|_theme: &Theme| card_style()),
        );
    }
    let mut sched = column![].spacing(12);
    for section in data::schedule() {
        sched = sched.push(van_section(section));
    }
    column![
        header_row(
            "Today",
            "Saturday 5 September 2026 · 4 jobs · 3 done",
            vec![
                outline_btn("<", Some(Message::Tab(0))),
                outline_btn(">", Some(Message::Tab(0))),
                outline_btn("Today", Some(Message::Tab(1))),
                outline_btn("Week", None),
                primary_btn("+ New job", Message::OpenNewJob),
            ],
        ),
        kpis,
        row![
            sched.width(FillPortion(65)),
            container(route_map()).width(FillPortion(35)),
        ]
        .spacing(16)
        .height(Fill),
    ]
    .spacing(20)
    .into()
}

fn van_section(section: data::VanSection) -> Element<'static, Message> {
    let mut col = column![
        // Van header.
        row![
            container(
                text(match section.van {
                    data::Van::One => "1",
                    data::Van::Two => "2",
                })
                .size(14)
                .color(tokens::WHITE)
            )
            .center_x(Fixed(32.0))
            .center_y(Fixed(32.0))
            .style(move |_theme: &Theme| container::Style {
                text_color: None,
                background: Some(Background::Color(section.van.color())),
                border: Border {
                    color: Color::TRANSPARENT,
                    width: 0.0,
                    radius: 8.0.into(),
                },
                shadow: Shadow::default(),
                snap: true,
            }),
            column![
                row![
                    text(section.van.name()).size(15).color(tokens::TEXT),
                    text(section.van.reg()).size(13).color(tokens::MUTED),
                ]
                .spacing(8)
                .align_y(Alignment::Center),
                text(section.van.crew()).size(13).color(tokens::SECONDARY),
            ]
            .spacing(2),
            Space::new().width(Fill),
            text(section.time_range).size(13).color(tokens::SECONDARY),
            text(section.stops).size(13).color(tokens::SECONDARY),
            text(section.total).size(14).color(tokens::TEXT),
        ]
        .spacing(12)
        .align_y(Alignment::Center),
        divider(),
    ]
    .spacing(8);
    for job in section.jobs {
        col = col.push(job_row(job));
    }
    container(col)
        .padding(20)
        .style(|_theme: &Theme| card_style())
        .into()
}

fn job_row(job: data::Job) -> Element<'static, Message> {
    let mut action: Element<Message> = Space::new().width(Fixed(0.0)).into();
    match job.status {
        data::Status::Done => {
            action = outline_btn("Paid", Some(Message::JobSelected(job.id)));
        }
        data::Status::InProgress => {
            action = primary_btn("Done", Message::JobSelected(job.id));
        }
        _ => {}
    }
    let note = if job.note.is_empty() {
        job.total.to_string()
    } else {
        format!("{} · {}", job.total, job.note)
    };
    mouse_area(
        row![
            column![
                text(job.time).size(14).color(tokens::TEXT),
                text(job.duration).size(12).color(tokens::MUTED),
            ]
            .spacing(2)
            .width(Fixed(80.0)),
            stop_circle(job.stop, job.van.tint(), job.van.color()),
            column![
                text(job.customer).size(14).color(tokens::TEXT),
                text(job.address).size(13).color(tokens::SECONDARY),
                text(note).size(13).color(tokens::MUTED),
            ]
            .spacing(2)
            .width(Fill),
            row![pill(job.status), action,]
                .spacing(8)
                .align_y(Alignment::Center),
        ]
        .spacing(12)
        .align_y(Alignment::Center)
        .width(Fill),
    )
    .on_press(Message::JobSelected(job.id))
    .into()
}

fn route_map() -> Element<'static, Message> {
    container(
        column![
            row![
                text("Route map").size(14).color(tokens::TEXT),
                Space::new().width(Fill),
                van_legend(data::Van::One),
                van_legend(data::Van::Two),
            ]
            .spacing(12)
            .align_y(Alignment::Center),
            container(text("Map placeholder").size(13).color(tokens::MUTED))
                .center_x(Fill)
                .center_y(Fixed(320.0))
                .width(Fill)
                .style(|_theme: &Theme| container::Style {
                    text_color: None,
                    background: Some(Background::Color(tokens::SOFT_FILL)),
                    border: Border {
                        color: Color::TRANSPARENT,
                        width: 0.0,
                        radius: 8.0.into(),
                    },
                    shadow: Shadow::default(),
                    snap: true,
                }),
        ]
        .spacing(12),
    )
    .padding(20)
    .style(|_theme: &Theme| card_style())
    .into()
}

fn van_legend(van: data::Van) -> Element<'static, Message> {
    row![
        container(Space::new().width(Fixed(8.0)).height(Fixed(8.0))).style(
            move |_theme: &Theme| {
                container::Style {
                    text_color: None,
                    background: Some(Background::Color(van.color())),
                    border: Border {
                        color: Color::TRANSPARENT,
                        width: 0.0,
                        radius: 4.0.into(),
                    },
                    shadow: Shadow::default(),
                    snap: true,
                }
            }
        ),
        text(van.name()).size(12).color(tokens::SECONDARY),
    ]
    .spacing(6)
    .align_y(Alignment::Center)
    .into()
}

// ——— Jobs table page ———

fn page_jobs(state: &App) -> Element<'_, Message> {
    let mut tabs = row![].spacing(4);
    for (i, tab) in TABS.iter().enumerate() {
        let on = state.job_tab == i;
        tabs = tabs.push(
            button(text(*tab).size(14).color(tokens::TEXT))
                .on_press(Message::Tab(i))
                .padding(8)
                .style(
                    move |_theme: &Theme, _status: button::Status| button::Style {
                        background: Some(Background::Color(if on {
                            tokens::CARD
                        } else {
                            Color::TRANSPARENT
                        })),
                        text_color: tokens::TEXT,
                        border: no_border(),
                        shadow: Shadow::default(),
                        snap: true,
                    },
                ),
        );
    }
    let van_options = vec![
        "All vans".to_string(),
        "Van 1".to_string(),
        "Van 2".to_string(),
    ];
    let mut groups = column![].spacing(4);
    for (group, jobs) in data::table_groups() {
        groups = groups.push(text(group).size(12).color(tokens::MUTED));
        for job in jobs {
            groups = groups.push(table_row(job));
            groups = groups.push(divider());
        }
    }
    column![
        header_row(
            "Jobs",
            "107 jobs · £17,176.20",
            vec![primary_btn("+ New job", Message::OpenNewJob)],
        ),
        container(tabs)
            .padding(4)
            .style(|_theme: &Theme| container::Style {
                text_color: None,
                background: Some(Background::Color(tokens::SOFT_FILL)),
                border: Border {
                    color: Color::TRANSPARENT,
                    width: 0.0,
                    radius: 10.0.into(),
                },
                shadow: Shadow::default(),
                snap: true,
            }),
        row![
            pick_list(
                van_options,
                Some(state.van_filter.clone()),
                Message::VanFilter
            )
            .width(Fixed(150.0))
            .text_size(14),
            search_input(
                &state.table_search,
                "Customer, address, postcode...",
                Message::TableSearch
            ),
        ]
        .spacing(12),
        row![
            micro_head("WHEN").width(FillPortion(15)),
            micro_head("CUSTOMER").width(FillPortion(22)),
            micro_head("ADDRESS").width(FillPortion(25)),
            micro_head("VAN · CREW").width(FillPortion(14)),
            micro_head("STATUS").width(FillPortion(12)),
            container(micro_head("TOTAL"))
                .width(FillPortion(12))
                .align_x(iced::alignment::Horizontal::Right),
        ],
        divider(),
        scrollable(groups.width(Fill)).width(Fill).height(Fill),
    ]
    .spacing(14)
    .into()
}

fn table_row(job: data::Job) -> Element<'static, Message> {
    let area = if job.commercial {
        format!("{} · Commercial", job.area)
    } else {
        job.area.to_string()
    };
    mouse_area(
        row![
            column![
                text(job.time).size(14).color(tokens::TEXT),
                text(job.id).size(12).color(tokens::MUTED),
            ]
            .spacing(2)
            .width(FillPortion(15)),
            row![
                avatar(
                    data::initials(job.customer),
                    data::avatar_color(job.customer)
                ),
                column![
                    text(job.customer).size(14).color(tokens::TEXT),
                    text(job.phone).size(13).color(tokens::SECONDARY),
                ]
                .spacing(2),
            ]
            .spacing(10)
            .align_y(Alignment::Center)
            .width(FillPortion(22)),
            column![
                text(job.address).size(14).color(tokens::TEXT),
                text(area).size(13).color(tokens::SECONDARY),
            ]
            .spacing(2)
            .width(FillPortion(25)),
            column![
                row![
                    container(Space::new().width(Fixed(8.0)).height(Fixed(8.0))).style(
                        move |_theme: &Theme| container::Style {
                            text_color: None,
                            background: Some(Background::Color(job.van.color())),
                            border: Border {
                                color: Color::TRANSPARENT,
                                width: 0.0,
                                radius: 4.0.into(),
                            },
                            shadow: Shadow::default(),
                            snap: true,
                        }
                    ),
                    text(job.van.name()).size(14).color(tokens::TEXT),
                ]
                .spacing(6)
                .align_y(Alignment::Center),
                text(job.crew).size(13).color(tokens::SECONDARY),
            ]
            .spacing(2)
            .width(FillPortion(14)),
            container(pill(job.status)).width(FillPortion(12)),
            container(text(job.total).size(14).color(tokens::TEXT))
                .width(FillPortion(12))
                .align_x(iced::alignment::Horizontal::Right),
        ]
        .spacing(0)
        .align_y(Alignment::Center)
        .width(Fill),
    )
    .on_press(Message::JobSelected(job.id))
    .into()
}

// ——— overlays ———

fn dim_layer() -> Element<'static, Message> {
    mouse_area(container(Space::new().width(Fill).height(Fill)).style(|_theme: &Theme| dim_style()))
        .on_press(Message::CloseOverlays)
        .into()
}

fn drawer<'a>(state: &'a App, job: data::Job) -> Element<'a, Message> {
    let step = match job.status {
        data::Status::Booked => 0,
        data::Status::InProgress => 1,
        data::Status::Done => 2,
        data::Status::Paid => 4,
    };
    let body = column![
        // Header.
        row![
            avatar(
                data::initials(job.customer),
                data::avatar_color(job.customer)
            ),
            column![
                row![
                    text(job.customer).size(18).color(tokens::TEXT),
                    pill(job.status),
                ]
                .spacing(10)
                .align_y(Alignment::Center),
                text(format!(
                    "{} · Saturday 5 September 2026 · {}",
                    job.id, job.time
                ))
                .size(13)
                .color(tokens::SECONDARY),
            ]
            .spacing(2)
            .width(Fill),
            button(text("×").size(16).color(tokens::SECONDARY))
                .on_press(Message::CloseOverlays)
                .padding(6)
                .style(ghost_style()),
        ]
        .spacing(12)
        .align_y(Alignment::Center),
        stepper(step),
        row![
            primary_btn("Record payment", Message::CloseOverlays),
            outline_btn("Edit", Some(Message::OpenNewJob)),
            Space::new().width(Fill),
            button(text("Cancel job").size(14).color(tokens::TEXT))
                .padding(10)
                .style(ghost_style()),
        ]
        .spacing(12)
        .align_y(Alignment::Center),
        // ADDRESS + CREW card.
        container(
            row![
                column![
                    section_label("ADDRESS"),
                    text(job.address).size(15).color(tokens::TEXT),
                    text(job.area).size(13).color(tokens::SECONDARY),
                    kv("Access", job.note),
                    kv("Parking", "Loading bay"),
                ]
                .spacing(6)
                .width(FillPortion(1)),
                column![
                    section_label("CREW"),
                    text(format!("{}  {}", job.van.name(), job.van.reg()))
                        .size(14)
                        .color(tokens::TEXT),
                    text(job.crew).size(14).color(tokens::TEXT),
                    text(format!("{} allowed", job.duration))
                        .size(13)
                        .color(tokens::SECONDARY),
                ]
                .spacing(6)
                .width(FillPortion(1)),
            ]
            .spacing(16),
        )
        .padding(20)
        .style(|_theme: &Theme| card_style()),
        drawer_section(
            "CONTACT",
            text(job.phone).size(14).color(tokens::TEXT).into()
        ),
        drawer_section(
            "WORK",
            text("Office carpet · per room")
                .size(14)
                .color(tokens::TEXT)
                .into()
        ),
        drawer_section(
            "INV-2234",
            row![
                pill(job.status),
                text(job.total).size(14).color(tokens::TEXT),
            ]
            .spacing(10)
            .align_y(Alignment::Center)
            .into()
        ),
        drawer_section(
            "ACTIVITY",
            column![
                search_input(&state.drawer_note, "Add a note...", Message::DrawerNote),
                text("Booked 25 Aug, 08:30").size(12).color(tokens::MUTED),
                container(text(job.total).size(16).color(tokens::TEXT))
                    .width(Fill)
                    .align_x(iced::alignment::Horizontal::Right),
            ]
            .spacing(8)
            .into()
        ),
    ]
    .spacing(14)
    .width(Fill);
    container(scrollable(body).width(Fill).height(Fill))
        .width(Fixed(560.0))
        .height(Fill)
        .padding(24)
        .style(|_theme: &Theme| container::Style {
            text_color: None,
            background: Some(Background::Color(tokens::CARD)),
            border: Border {
                color: tokens::BORDER,
                width: 1.0,
                radius: iced::border::Radius {
                    top_left: 16.0,
                    top_right: 0.0,
                    bottom_right: 0.0,
                    bottom_left: 16.0,
                },
            },
            shadow: Shadow::default(),
            snap: true,
        })
        .into()
}

fn kv<'a>(label: &'static str, value: &'a str) -> Element<'a, Message> {
    row![
        text(label).size(13).color(tokens::MUTED),
        text(value).size(13).color(tokens::TEXT),
    ]
    .spacing(6)
    .into()
}

fn drawer_section<'a>(title: &'static str, body: Element<'a, Message>) -> Element<'a, Message> {
    column![section_label(title), body, divider(),]
        .spacing(8)
        .into()
}

fn modal_shell<'a>(title: &'static str, body: Element<'a, Message>) -> Element<'a, Message> {
    container(
        container(
            column![
                row![
                    text(title).size(18).color(tokens::TEXT),
                    Space::new().width(Fill),
                    button(text("×").size(16).color(tokens::SECONDARY))
                        .on_press(Message::CloseOverlays)
                        .padding(6)
                        .style(ghost_style()),
                ]
                .align_y(Alignment::Center),
                divider(),
                scrollable(body).height(Fixed(480.0)),
            ]
            .spacing(12)
            .width(Fixed(852.0)),
        )
        .padding(24)
        .width(Fixed(900.0))
        .style(|_theme: &Theme| card_style()),
    )
    .width(Fill)
    .height(Fill)
    .center_x(Fill)
    .center_y(Fill)
    .into()
}

fn modal_footer(total: Option<&'static str>) -> Element<'static, Message> {
    let mut r = row![].spacing(8).align_y(Alignment::Center);
    if let Some(t) = total {
        r = r.push(text("Total").size(13).color(tokens::SECONDARY));
        r = r.push(text(t).size(15).color(tokens::TEXT));
    }
    r = r.push(Space::new().width(Fill));
    r = r.push(outline_btn("Cancel", Some(Message::CloseOverlays)));
    r = r.push(primary_btn("Save", Message::CloseOverlays));
    column![divider(), r,].spacing(12).into()
}

fn job_modal(state: &App) -> Element<'_, Message> {
    let mut lines = column![micro_head("ITEM")].spacing(8);
    for (i, line) in state.nj_lines.iter().enumerate() {
        lines = lines.push(
            row![
                text_input("", &line.0)
                    .on_input(move |s| Message::NjItem(i, s))
                    .padding(10)
                    .width(Fixed(232.0))
                    .style(input_style()),
                text_input("", &line.1)
                    .on_input(move |s| Message::NjQty(i, s))
                    .padding(10)
                    .width(Fixed(80.0))
                    .style(input_style()),
                text_input("", &line.2)
                    .on_input(move |s| Message::NjUnit(i, s))
                    .padding(10)
                    .width(Fixed(80.0))
                    .style(input_style()),
                button(text("×").size(14).color(tokens::SECONDARY))
                    .on_press(Message::NjRemoveLine(i))
                    .padding(6)
                    .style(ghost_style()),
            ]
            .spacing(8)
            .align_y(Alignment::Center),
        );
    }
    let durations = vec![
        "2h".to_string(),
        "3h".to_string(),
        "4h".to_string(),
        "6h".to_string(),
    ];
    let body = column![
        field(
            "Customer",
            text_input("", &state.nj_customer)
                .on_input(Message::NjCustomer)
                .padding(10)
                .width(Fill)
                .style(input_style())
        ),
        column![
            text("Property").size(13).color(tokens::TEXT),
            text(&state.nj_property).size(14).color(tokens::TEXT),
        ]
        .spacing(4),
        row![
            field(
                "Date",
                text_input("", &state.nj_date)
                    .on_input(Message::NjDate)
                    .padding(10)
                    .width(Fill)
                    .style(input_style())
            )
            .width(FillPortion(1)),
            field(
                "Start",
                text_input("", &state.nj_start)
                    .on_input(Message::NjStart)
                    .padding(10)
                    .width(Fill)
                    .style(input_style())
            )
            .width(FillPortion(1)),
            column![
                text("Duration").size(13).color(tokens::TEXT),
                pick_list(
                    durations,
                    Some(state.nj_duration.clone()),
                    Message::NjDuration
                )
                .width(Fill)
                .text_size(14),
            ]
            .spacing(8)
            .width(FillPortion(1)),
        ]
        .spacing(12),
        column![
            text("Van").size(13).color(tokens::TEXT),
            segmented(&VAN_OPTS, state.nj_van, Message::NjVan),
        ]
        .spacing(8),
        column![
            text("Crew").size(13).color(tokens::TEXT),
            segmented(&CREW_OPTS, state.nj_crew, Message::NjCrew),
        ]
        .spacing(8),
        column![section_label("WORK"), lines,].spacing(8),
        outline_btn("+ Add service", Some(Message::NjAddLine)),
        row![
            field(
                "Notes for the crew",
                text_input("", &state.nj_notes_crew)
                    .on_input(Message::NjNotesCrew)
                    .padding(10)
                    .width(Fill)
                    .style(input_style())
            )
            .width(FillPortion(1)),
            field(
                "Office notes",
                text_input("", &state.nj_notes_office)
                    .on_input(Message::NjNotesOffice)
                    .padding(10)
                    .width(Fill)
                    .style(input_style())
            )
            .width(FillPortion(1)),
        ]
        .spacing(12),
        modal_footer(Some("£477.40 · 4h")),
    ]
    .spacing(12)
    .width(Fill);
    modal_shell("Edit job", body.into())
}

fn customer_modal(state: &App) -> Element<'_, Message> {
    let mut tags = row![].spacing(8);
    for (i, name) in TAG_NAMES.iter().enumerate() {
        let on = state.nc_tags[i];
        tags = tags.push(
            button(text(*name).size(13).color(if on {
                tokens::DARK_GREEN_TEXT
            } else {
                tokens::TEXT
            }))
            .on_press(Message::NcTag(i))
            .padding(8)
            .style(
                move |_theme: &Theme, _status: button::Status| button::Style {
                    background: Some(Background::Color(if on {
                        tokens::LIGHT_GREEN
                    } else {
                        Color::TRANSPARENT
                    })),
                    text_color: tokens::TEXT,
                    border: Border {
                        color: tokens::BORDER,
                        width: 1.0,
                        radius: 12.0.into(),
                    },
                    shadow: Shadow::default(),
                    snap: true,
                },
            ),
        );
    }
    let body = column![
        column![
            text("Customer type").size(13).color(tokens::TEXT),
            segmented(&CUST_OPTS, state.nc_type, Message::NcType),
        ]
        .spacing(8),
        row![
            field(
                "First name",
                text_input("", &state.nc_first)
                    .on_input(Message::NcFirst)
                    .padding(10)
                    .width(Fill)
                    .style(input_style())
            )
            .width(FillPortion(1)),
            field(
                "Last name",
                text_input("", &state.nc_last)
                    .on_input(Message::NcLast)
                    .padding(10)
                    .width(Fill)
                    .style(input_style())
            )
            .width(FillPortion(1)),
        ]
        .spacing(12),
        row![
            field(
                "Mobile / phone",
                text_input("", &state.nc_mobile)
                    .on_input(Message::NcMobile)
                    .padding(10)
                    .width(Fill)
                    .style(input_style())
            )
            .width(FillPortion(1)),
            field(
                "Alternative phone",
                text_input("", &state.nc_alt)
                    .on_input(Message::NcAlt)
                    .padding(10)
                    .width(Fill)
                    .style(input_style())
            )
            .width(FillPortion(1)),
        ]
        .spacing(12),
        row![
            field(
                "Email",
                text_input("", &state.nc_email)
                    .on_input(Message::NcEmail)
                    .padding(10)
                    .width(Fill)
                    .style(input_style())
            )
            .width(FillPortion(1)),
            field(
                "How did they find us?",
                text_input("", &state.nc_found)
                    .on_input(Message::NcFound)
                    .padding(10)
                    .width(Fill)
                    .style(input_style())
            )
            .width(FillPortion(1)),
        ]
        .spacing(12),
        column![text("Tags").size(13).color(tokens::TEXT), tags,].spacing(8),
        field(
            "Notes",
            text_input("", &state.nc_notes)
                .on_input(Message::NcNotes)
                .padding(10)
                .width(Fill)
                .style(input_style())
        ),
        section_label("PROPERTY ADDRESS"),
        field(
            "Address line 1",
            text_input("", &state.nc_addr)
                .on_input(Message::NcAddr)
                .padding(10)
                .width(Fill)
                .style(input_style())
        ),
        modal_footer(None),
    ]
    .spacing(12)
    .width(Fill);
    modal_shell("New customer", body.into())
}

// ——— Settings ———

fn page_settings(state: &App) -> Element<'_, Message> {
    column![
        header_row(
            "Settings",
            "Business details, vans, crew and price list",
            vec![button(text("Save changes").size(14).color(tokens::WHITE))
                .padding(10)
                .style(|_theme: &Theme, _status: button::Status| button::Style {
                    background: Some(Background::Color(tokens::CTA_GREEN_DIM)),
                    text_color: tokens::WHITE,
                    border: Border {
                        color: Color::TRANSPARENT,
                        width: 0.0,
                        radius: 9.0.into(),
                    },
                    shadow: Shadow::default(),
                    snap: true,
                })
                .into()],
        ),
        scrollable(
            row![
                column![
                    container(
                        column![
                            text("Business").size(15).color(tokens::TEXT),
                            field(
                                "Business name",
                                text_input("", &state.biz_name)
                                    .on_input(Message::BizName)
                                    .padding(10)
                                    .width(Fill)
                                    .style(input_style())
                            ),
                            field(
                                "Tagline",
                                text_input("", &state.tagline)
                                    .on_input(Message::Tagline)
                                    .padding(10)
                                    .width(Fill)
                                    .style(input_style())
                            ),
                            row![
                                field(
                                    "Owner",
                                    text_input("", &state.owner)
                                        .on_input(Message::Owner)
                                        .padding(10)
                                        .width(Fill)
                                        .style(input_style())
                                )
                                .width(FillPortion(1)),
                                field(
                                    "Phone",
                                    text_input("", &state.biz_phone)
                                        .on_input(Message::BizPhone)
                                        .padding(10)
                                        .width(Fill)
                                        .style(input_style())
                                )
                                .width(FillPortion(1)),
                            ]
                            .spacing(12),
                            row![
                                field(
                                    "Email",
                                    text_input("", &state.biz_email)
                                        .on_input(Message::BizEmail)
                                        .padding(10)
                                        .width(Fill)
                                        .style(input_style())
                                )
                                .width(FillPortion(1)),
                                field(
                                    "Website",
                                    text_input("", &state.website)
                                        .on_input(Message::Website)
                                        .padding(10)
                                        .width(Fill)
                                        .style(input_style())
                                )
                                .width(FillPortion(1)),
                            ]
                            .spacing(12),
                            field(
                                "Address",
                                text_input("", &state.biz_addr)
                                    .on_input(Message::BizAddr)
                                    .padding(10)
                                    .width(Fill)
                                    .style(input_style())
                            ),
                        ]
                        .spacing(10)
                        .width(Fill),
                    )
                    .padding(20)
                    .style(|_theme: &Theme| card_style()),
                    container(
                        column![
                            text("Invoicing").size(15).color(tokens::TEXT),
                            field(
                                "Payment terms (days)",
                                text_input("", &state.terms)
                                    .on_input(Message::Terms)
                                    .padding(10)
                                    .width(Fill)
                                    .style(input_style())
                            ),
                            field(
                                "Invoice footer",
                                text_input("", &state.invoice_footer)
                                    .on_input(Message::InvoiceFooter)
                                    .padding(10)
                                    .width(Fill)
                                    .style(input_style())
                            ),
                        ]
                        .spacing(10)
                        .width(Fill),
                    )
                    .padding(20)
                    .style(|_theme: &Theme| card_style()),
                ]
                .spacing(12)
                .width(FillPortion(1)),
                column![
                    container(vans_card(state))
                        .padding(20)
                        .style(|_theme: &Theme| card_style()),
                    container(cleaners_card(state))
                        .padding(20)
                        .style(|_theme: &Theme| card_style()),
                ]
                .spacing(12)
                .width(FillPortion(1)),
            ]
            .spacing(12)
            .width(Fill),
        )
        .width(Fill)
        .height(Fill),
    ]
    .spacing(16)
    .into()
}

fn vans_card(state: &App) -> Element<'_, Message> {
    let mut col = column![text("Vans").size(15).color(tokens::TEXT),].spacing(10);
    for i in 0..2 {
        col = col.push(
            row![
                container(Space::new().width(Fixed(28.0)).height(Fixed(28.0))).style(
                    move |_theme: &Theme| container::Style {
                        text_color: None,
                        background: Some(Background::Color(if i == 0 {
                            tokens::INFO_BLUE
                        } else {
                            tokens::WARN_ORANGE
                        })),
                        border: Border {
                            color: tokens::BORDER,
                            width: 1.0,
                            radius: 6.0.into(),
                        },
                        shadow: Shadow::default(),
                        snap: true,
                    }
                ),
                text_input("", &state.van_names[i])
                    .on_input(move |s| Message::VanName(i, s))
                    .padding(10)
                    .width(Fixed(130.0))
                    .style(input_style()),
                text_input("", &state.van_regs[i])
                    .on_input(move |s| Message::VanReg(i, s))
                    .padding(10)
                    .width(Fixed(100.0))
                    .style(input_style()),
                checkbox(state.van_active[i])
                    .label("Active")
                    .on_toggle(move |b| Message::VanActive(i, b)),
                outline_btn("Save", None),
            ]
            .spacing(8)
            .align_y(Alignment::Center),
        );
    }
    col = col.push(outline_btn("+ Add van", None));
    col.width(Fill).into()
}

fn cleaners_card(state: &App) -> Element<'_, Message> {
    let mut col = column![text("Cleaners").size(15).color(tokens::TEXT),].spacing(10);
    for i in 0..2 {
        col = col.push(
            row![
                text_input("", &state.crew_names[i])
                    .on_input(move |s| Message::CrewName(i, s))
                    .padding(10)
                    .width(Fixed(130.0))
                    .style(input_style()),
                text_input("", &state.crew_phones[i])
                    .on_input(move |s| Message::CrewPhone(i, s))
                    .padding(10)
                    .width(Fixed(110.0))
                    .style(input_style()),
                pick_list(
                    vec!["Van 1".to_string(), "Van 2".to_string()],
                    Some(state.crew_van[i].clone()),
                    move |s| Message::CrewVan(i, s),
                )
                .width(Fixed(90.0))
                .text_size(14),
                checkbox(state.crew_active[i])
                    .label("Active")
                    .on_toggle(move |b| Message::CrewActive(i, b)),
                outline_btn("Save", None),
            ]
            .spacing(8)
            .align_y(Alignment::Center),
        );
    }
    col = col.push(outline_btn("+ Add cleaner", None));
    col.width(Fill).into()
}

// ——— placeholder pages ———

fn page_placeholder(
    title: &'static str,
    sub: &'static str,
    empty_title: &'static str,
    empty_hint: &'static str,
    action: &'static str,
    msg: Option<Message>,
) -> Element<'static, Message> {
    column![
        header_row(title, sub, vec![]),
        container(
            column![
                container(Space::new().width(Fixed(48.0)).height(Fixed(48.0))).style(
                    |_theme: &Theme| container::Style {
                        text_color: None,
                        background: None,
                        border: Border {
                            color: tokens::BORDER,
                            width: 1.0,
                            radius: 24.0.into(),
                        },
                        shadow: Shadow::default(),
                        snap: true,
                    }
                ),
                text(empty_title).size(14).color(tokens::SECONDARY),
                text(empty_hint).size(13).color(tokens::MUTED),
                outline_btn(action, msg),
            ]
            .spacing(10)
            .align_x(Alignment::Center)
            .width(Fill),
        )
        .width(Fill)
        .height(Fill)
        .center_x(Fill)
        .center_y(Fill),
    ]
    .spacing(16)
    .into()
}
