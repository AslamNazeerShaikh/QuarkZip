# Contributing to QuarkZip

## Commits — Conventional Commits v1.0.0

We follow <https://www.conventionalcommits.org/en/v1.0.0/>.

Format:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Use for                                              | SemVer |
| ---------- | ---------------------------------------------------- | ------ |
| `feat`     | New feature                                          | MINOR  |
| `fix`      | Bug fix                                              | PATCH  |
| `docs`     | Documentation only                                   | —      |
| `style`    | Formatting, no logic change                          | —      |
| `refactor` | Code change that is neither feat nor fix             | —      |
| `perf`     | Performance improvement                              | —      |
| `test`     | Adding or fixing tests                               | —      |
| `build`    | Build system, sidecars, packaging                    | —      |
| `ci`       | CI configuration                                     | —      |
| `chore`    | Maintenance, no src change                           | —      |
| `revert`   | Reverts a prior commit                               | —      |

Scopes (optional, in parens): `ui`, `backend`, `sidecar`, `config`, `docs`, `release`.

### Rules

- Description: imperative mood, lowercase, no trailing period, max 72 chars.
- Body (optional): explain *why*, wrapped at 72 columns.
- Breaking changes: append `!` after type/scope **and** add a `BREAKING CHANGE:` footer describing what broke and how to migrate (correlates with MAJOR).

### Examples

```text
feat(ui): add archive file list
fix(sidecar): resolve windows arm64 7za path
docs: update 7zz pinning notes
refactor(backend)!: change list command to streaming json

BREAKING CHANGE: list_archive now emits newline-delimited JSON
instead of TSV; update callers to parse JSON lines.
```

Your editor uses the repo template (`.gitmessage`) automatically once
`git config commit.template .gitmessage` has been run in this clone.
