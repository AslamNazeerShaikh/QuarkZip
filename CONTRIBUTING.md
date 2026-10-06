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

| Type       | Use for                                  | SemVer |
| ---------- | ---------------------------------------- | ------ |
| `feat`     | New feature                              | MINOR  |
| `fix`      | Bug fix                                  | PATCH  |
| `docs`     | Documentation only                       | —      |
| `style`    | Formatting, no logic change              | —      |
| `refactor` | Code change that is neither feat nor fix | —      |
| `perf`     | Performance improvement                  | —      |
| `test`     | Adding or fixing tests                   | —      |
| `build`    | Build system, sidecars, packaging        | —      |
| `ci`       | CI configuration                         | —      |
| `chore`    | Maintenance, no src change               | —      |
| `revert`   | Reverts a prior commit                   | —      |

Scopes (optional, in parens): `ui`, `backend`, `sidecar`, `config`, `docs`, `release`.

### Rules

- Description: imperative mood, lowercase, no trailing period, max 72 chars.
- Body (optional): explain _why_, wrapped at 72 columns.
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

## Translations

The UI is fully translatable at runtime (see `docs/i18n.md` — modeled on
XDM's one-file-per-language `Lang/` + index pattern). To add a language:

1. `cp src/i18n/locales/en.json src/i18n/locales/<code>.json` and translate
   the values (keys and `{placeholders}` stay intact).
2. Register it in `src/i18n/locales.ts` (`LOCALES`).
3. Run `npm run i18n:check` and `npm test`, then PR as
   `feat(i18n): add <Language> (<code>)`.
