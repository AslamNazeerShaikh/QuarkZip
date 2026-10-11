//! Display formatting ported from `src/lib/format.ts`:
//! IEC sizes (`1.5KiB`), locale-grouped counts, engine `Modified` stamps as
//! local wall time. Hindi uses Devanagari digits + Indian digit grouping.

use crate::i18n::Lang;

pub fn format_size(bytes: i128) -> String {
    if bytes < 0 {
        return "—".to_string();
    }
    const UNITS: [&str; 9] = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
    let mut value = bytes as f64;
    let mut unit = 0;
    while value >= 1024.0 && unit < UNITS.len() - 1 {
        value /= 1024.0;
        unit += 1;
    }
    let rounded = (value * 10.0).round() / 10.0;
    let num = if rounded.fract() == 0.0 {
        format!("{}", rounded as i128)
    } else {
        format!("{rounded}")
    };
    format!("{num}{}", UNITS[unit])
}

const DEVANAGARI: [char; 10] = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

fn localize_digits(s: &str, lang: Lang) -> String {
    if lang == Lang::En {
        return s.to_string();
    }
    s.chars()
        .map(|c| {
            if c.is_ascii_digit() {
                DEVANAGARI[c as usize - '0' as usize]
            } else {
                c
            }
        })
        .collect()
}

/// Western grouping (en) vs Indian grouping (hi): last group of 3, then
/// pairs (`100000` → `10,000` / `१,००,०००`).
pub fn format_count(value: u64, lang: Lang) -> String {
    let digits: Vec<char> = value.to_string().chars().collect();
    let mut out = String::new();
    let n = digits.len();
    for (i, d) in digits.iter().enumerate() {
        let from_right = n - 1 - i;
        out.push(*d);
        if from_right > 0 {
            let boundary = if lang == Lang::Hi {
                from_right == 3 || (from_right > 3 && (from_right - 3) % 2 == 0)
            } else {
                from_right % 3 == 0
            };
            if boundary {
                out.push(',');
            }
        }
    }
    localize_digits(&out, lang)
}

const MONTHS_EN: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_HI: [&str; 12] = [
    "जन॰",
    "फ़र॰",
    "मार्च",
    "अप्रैल",
    "मई",
    "जून",
    "जुल॰",
    "अग॰",
    "सित॰",
    "अक्टू॰",
    "नव॰",
    "दिस॰",
];

fn is_leap(y: i32) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}

fn days_in(y: i32, m: u32) -> u32 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap(y) {
                29
            } else {
                28
            }
        }
        _ => 0,
    }
}

/// Parse an engine `Modified` stamp (`2026-10-03 21:39:45.966`) as local
/// wall time (7zz stamps carry no offset). Returns `None` when unparsable.
fn parse_stamp(raw: &str) -> Option<(i32, u32, u32, u32, u32, u32)> {
    let s = raw.trim().replace('T', " ");
    let (date, time) = match s.split_once(' ') {
        Some(pair) => pair,
        None => (s.as_str(), "00:00:00"),
    };
    let d: Vec<&str> = date.split('-').collect();
    if d.len() != 3 {
        return None;
    }
    let t: Vec<&str> = time.split(':').collect();
    if t.len() < 2 {
        return None;
    }
    let secs = t.get(2).unwrap_or(&"0").split('.').next().unwrap_or("0");
    let (y, mo, day, h, mi, se) = (
        d[0].parse().ok()?,
        d[1].parse().ok()?,
        d[2].parse().ok()?,
        t[0].parse().ok()?,
        t[1].parse().ok()?,
        secs.parse().ok()?,
    );
    if !(1..=12).contains(&mo) || day == 0 || day > days_in(y, mo) || h > 23 || mi > 59 || se > 60 {
        return None;
    }
    Some((y, mo, day, h, mi, se))
}

/// `Oct 3, 2026, 9:39:45 PM` (month name localized; the shape matches
/// `toLocaleString` with short month + numeric time + AM/PM).
pub fn format_modified(raw: Option<&str>, lang: Lang) -> String {
    let Some(s) = raw else {
        return "—".to_string();
    };
    if s.trim().is_empty() {
        return "—".to_string();
    }
    let Some((y, mo, d, h, mi, se)) = parse_stamp(s) else {
        return s.to_string();
    };
    let months = if lang == Lang::Hi {
        MONTHS_HI
    } else {
        MONTHS_EN
    };
    let (h12, ap) = match h {
        0 => (12, "AM"),
        1..=11 => (h, "AM"),
        12 => (12, "PM"),
        _ => (h - 12, "PM"),
    };
    localize_digits(
        &format!(
            "{}, {y}, {h12}:{:02}:{:02} {ap}",
            format!("{} {d}", months[(mo - 1) as usize]),
            mi,
            se
        ),
        lang,
    )
}

/// Epoch seconds (container mtime) rendered like [`format_modified`].
pub fn format_epoch(secs: Option<u64>, lang: Lang) -> String {
    // Days → civil date (Howard Hinnant's algorithm), time of day split out.
    let Some(s) = secs else {
        return "—".to_string();
    };
    let days = (s / 86_400) as i64;
    let tod = (s % 86_400) as u32;
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    let year = (if m <= 2 { y + 1 } else { y }) as i32;
    format_modified(
        Some(&format!(
            "{year:04}-{:02}-{:02} {:02}:{:02}:{:02}",
            m,
            d,
            tod / 3_600,
            (tod % 3_600) / 60,
            tod % 60
        )),
        lang,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_format_iec_sizes() {
        assert_eq!(format_size(0), "0B");
        assert_eq!(format_size(1536), "1.5KiB");
        assert_eq!(format_size(1024), "1KiB");
        assert_eq!(format_size(5 * 1024 * 1024), "5MiB");
        assert_eq!(format_size(-1), "—");
    }

    #[test]
    fn should_group_counts_per_locale() {
        assert_eq!(format_count(10_000, Lang::En), "10,000");
        assert_eq!(format_count(10_000, Lang::Hi), "१०,०००");
        assert_eq!(format_count(100_000, Lang::Hi), "१,००,०००");
        assert_eq!(format_count(10_421_311, Lang::En), "10,421,311");
    }

    #[test]
    fn should_render_stamps_as_local_wall_time() {
        assert_eq!(
            format_modified(Some("2026-10-03 21:39:45.966"), Lang::En),
            "Oct 3, 2026, 9:39:45 PM"
        );
        assert_eq!(format_modified(None, Lang::En), "—");
        assert_eq!(format_modified(Some("  "), Lang::En), "—");
        assert_eq!(format_modified(Some("garbage"), Lang::En), "garbage");
        assert_eq!(
            format_modified(Some("2026-10-03 21:39:45"), Lang::Hi),
            "अक्टू॰ ३, २०२६, ९:३९:४५ PM"
        );
    }

    #[test]
    fn should_reject_impossible_dates() {
        assert_eq!(
            format_modified(Some("2026-13-01 00:00:00"), Lang::En),
            "2026-13-01 00:00:00"
        );
        assert_eq!(
            format_modified(Some("2026-02-30 00:00:00"), Lang::En),
            "2026-02-30 00:00:00"
        );
    }
}
