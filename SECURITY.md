# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

Only the latest `0.1.x` prerelease is supported. QuarkZip has no stable
release yet — update to the newest commit before reporting.

## Reporting a Vulnerability

**Do not open a public issue.** Report privately via
[GitHub Security Advisories](https://github.com/AslamNazeerShaikh/QuarkZip/security/advisories/new)
(**Security** tab → **Advisories** → **Report a vulnerability**).

Include: app version/commit, OS + architecture, steps to reproduce, and the
archive or checksum input involved (attach samples only if they contain no
sensitive data).

What to expect:

- Acknowledgement within 7 days.
- Triage decision (accepted/declined) within 30 days.
- Accepted issues are fixed on `main` and credited in the release notes
  unless you ask to stay anonymous. There is no bounty program.

## Scope notes

QuarkZip is fully offline — archives never leave your machine, so most
impact is local file access. The bundled 7zz sidecar is unsigned third-party
code (see `docs/7zz-binaries.md`); flaws in archive parsing/decompression
themselves usually belong upstream to
[7-Zip](https://www.7-zip.org/) — report those there, and tell us so we can
re-pin the sidecar.
