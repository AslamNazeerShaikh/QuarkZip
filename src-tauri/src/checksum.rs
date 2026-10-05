//! File checksum calculation (MD5 / SHA-1 / SHA-256 / SHA-512).
//!
//! The hashing core is pure and unit-tested with known-answer vectors.
//! The Tauri command streams whole-percent progress over a Channel and
//! honors a shared cancellation flag, so the UI can show a live progress
//! bar plus a Cancel button that leaves the dialog open.

use std::sync::atomic::{AtomicBool, Ordering};

use digest::Digest as _;

/// Read granularity: progress granularity and memory use both hinge on this.
pub const CHUNK_BYTES: usize = 1024 * 1024;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ChecksumAlgo {
    Md5,
    Sha1,
    Sha256,
    Sha512,
}

impl ChecksumAlgo {
    /// Accepts `md5`, `MD5`, `SHA-1`, `sha_256`, … (case/separator-insensitive).
    pub fn parse(name: &str) -> Option<Self> {
        match name
            .to_ascii_lowercase()
            .replace(['-', '_', ' '], "")
            .as_str()
        {
            "md5" => Some(Self::Md5),
            "sha1" => Some(Self::Sha1),
            "sha256" => Some(Self::Sha256),
            "sha512" => Some(Self::Sha512),
            _ => None,
        }
    }

    /// Short UI id (`md5`, `sha1`, …) — the only values the frontend sends.
    pub fn id(self) -> &'static str {
        match self {
            Self::Md5 => "md5",
            Self::Sha1 => "sha1",
            Self::Sha256 => "sha256",
            Self::Sha512 => "sha512",
        }
    }

    /// Display label (`MD5`, `SHA-256`, …).
    pub fn label(self) -> &'static str {
        match self {
            Self::Md5 => "MD5",
            Self::Sha1 => "SHA-1",
            Self::Sha256 => "SHA-256",
            Self::Sha512 => "SHA-512",
        }
    }

    /// Hex length of the digest (lets the UI sanity-check pasted hashes).
    pub fn hex_len(self) -> usize {
        match self {
            Self::Md5 => 32,
            Self::Sha1 => 40,
            Self::Sha256 => 64,
            Self::Sha512 => 128,
        }
    }

    fn hasher(self) -> Hasher {
        match self {
            Self::Md5 => Hasher::Md5(md5::Md5::new()),
            Self::Sha1 => Hasher::Sha1(sha1::Sha1::new()),
            Self::Sha256 => Hasher::Sha256(sha2::Sha256::new()),
            Self::Sha512 => Hasher::Sha512(sha2::Sha512::new()),
        }
    }
}

/// Concrete hashers behind one small interface (avoids `dyn` + extra traits).
enum Hasher {
    Md5(md5::Md5),
    Sha1(sha1::Sha1),
    Sha256(sha2::Sha256),
    Sha512(sha2::Sha512),
}

impl Hasher {
    fn update(&mut self, data: &[u8]) {
        match self {
            Self::Md5(h) => h.update(data),
            Self::Sha1(h) => h.update(data),
            Self::Sha256(h) => h.update(data),
            Self::Sha512(h) => h.update(data),
        }
    }

    fn finish(self) -> Vec<u8> {
        match self {
            Self::Md5(h) => h.finalize().to_vec(),
            Self::Sha1(h) => h.finalize().to_vec(),
            Self::Sha256(h) => h.finalize().to_vec(),
            Self::Sha512(h) => h.finalize().to_vec(),
        }
    }
}

pub fn hex_of(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

/// Hash in-memory bytes (unit tests, known-answer vectors).
pub fn hash_bytes(algo: ChecksumAlgo, data: &[u8]) -> String {
    let mut h = algo.hasher();
    h.update(data);
    hex_of(&h.finish())
}

/// Hash a file with whole-percent progress and cooperative cancellation.
/// `progress` fires only when the whole percent changes (plus a final 100).
/// `cancel` is checked every chunk; a set flag aborts with an error.
pub async fn hash_file_async(
    path: &str,
    algo: ChecksumAlgo,
    cancel: &AtomicBool,
    mut progress: impl FnMut(u32),
) -> Result<String, String> {
    use tokio::io::AsyncReadExt as _;

    let mut file = tokio::fs::File::open(path)
        .await
        .map_err(|e| format!("Cannot open file for checksumming: {e}"))?;
    let total = file
        .metadata()
        .await
        .map_err(|e| format!("Cannot stat file for checksumming: {e}"))?
        .len();

    let mut hasher = algo.hasher();
    if total == 0 {
        progress(100);
        return Ok(hex_of(&hasher.finish()));
    }

    let mut buf = vec![0u8; CHUNK_BYTES];
    let mut read: u64 = 0;
    let mut last: u32 = 0;
    loop {
        if cancel.load(Ordering::Relaxed) {
            return Err("Checksum calculation cancelled.".to_string());
        }
        let n = file
            .read(&mut buf)
            .await
            .map_err(|e| format!("Cannot read file for checksumming: {e}"))?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
        read += n as u64;
        let pct = (read.min(total) * 100 / total) as u32;
        if pct != last {
            last = pct;
            progress(pct);
        }
    }
    if cancel.load(Ordering::Relaxed) {
        return Err("Checksum calculation cancelled.".to_string());
    }
    progress(100);
    Ok(hex_of(&hasher.finish()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_parse_algorithm_names_case_insensitively() {
        assert_eq!(ChecksumAlgo::parse("md5"), Some(ChecksumAlgo::Md5));
        assert_eq!(ChecksumAlgo::parse("MD5"), Some(ChecksumAlgo::Md5));
        assert_eq!(ChecksumAlgo::parse("SHA-1"), Some(ChecksumAlgo::Sha1));
        assert_eq!(ChecksumAlgo::parse("sha_256"), Some(ChecksumAlgo::Sha256));
        assert_eq!(ChecksumAlgo::parse("SHA 512"), Some(ChecksumAlgo::Sha512));
        assert_eq!(ChecksumAlgo::parse("crc32"), None);
        assert_eq!(ChecksumAlgo::parse(""), None);
    }

    #[test]
    fn should_match_known_answer_vectors_for_abc() {
        let data = b"abc";
        assert_eq!(
            hash_bytes(ChecksumAlgo::Md5, data),
            "900150983cd24fb0d6963f7d28e17f72"
        );
        assert_eq!(
            hash_bytes(ChecksumAlgo::Sha1, data),
            "a9993e364706816aba3e25717850c26c9cd0d89d"
        );
        assert_eq!(
            hash_bytes(ChecksumAlgo::Sha256, data),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        assert_eq!(
            hash_bytes(ChecksumAlgo::Sha512, data),
            "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f"
        );
    }

    #[test]
    fn should_hash_empty_input_to_known_digests() {
        assert_eq!(
            hash_bytes(ChecksumAlgo::Md5, b""),
            "d41d8cd98f00b204e9800998ecf8427e"
        );
        assert_eq!(
            hash_bytes(ChecksumAlgo::Sha256, b""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn should_report_hex_lengths_per_algorithm() {
        assert_eq!(ChecksumAlgo::Md5.hex_len(), 32);
        assert_eq!(ChecksumAlgo::Sha1.hex_len(), 40);
        assert_eq!(ChecksumAlgo::Sha256.hex_len(), 64);
        assert_eq!(ChecksumAlgo::Sha512.hex_len(), 128);
    }
}
