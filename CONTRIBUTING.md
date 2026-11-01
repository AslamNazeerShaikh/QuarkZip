# Contributing

QuarkZip is built one vertical slice at a time. Thank you for helping.

## Setup

```bash
git clone https://github.com/AslamNazeerShaikh/QuarkZip.git
cd QuarkZip
git switch develop
./Scripts/verify.sh
```

Requirements: macOS 26+, Xcode 26+ (Command Line Tools are enough), Swift
6.2+. No Homebrew, Node, or Rust.

## Branch model

- `develop` is the integration branch. Work lands here first.
- `main` is release history. Merge from `develop` only when releasing.
- Feature branches: `feat/browse-selection`, `fix/slip-paths`,
  `docs/engine-abi`.
- Never force-push a shared branch. Never rewrite published history.

## Commit messages

Conventional Commits v1.0.0.

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `chore`.
- Scope: the area, lowercase, for example `engine`, `browse`, `kit`,
  `design`, `opencode`.
- Description: imperative, lowercase, no period, 72 characters max.
- Breaking change: `!` after the type or scope, plus a `BREAKING CHANGE:`
  footer.
- One vertical slice per commit. If the message needs "and", split it.
- No "Generated with" or co-author trailers.

Examples:

```text
feat(browse): list archive entries in a virtualized table
fix(engine): reject entries that escape the destination
test(kit): cover nested archive tree building
refactor(jobs): move cancellation into the runner actor
docs(adr): record the vendored 7-Zip decision
```

## Definition of done

- A test that failed before the change now passes.
- `./Scripts/verify.sh` exits 0.
- No new warnings.
- Coverage at or above the gate.
- UI changes: snapshots in light and dark were opened.
- The story in `docs/STORIES.md` is ticked with evidence.
- Docs updated when behavior or a decision changed.

## Code rules

- Follow `AGENTS.md` and the project skills.
- No new dependency without an ADR.
- No force unwraps, no `try!`, no `as!`.
- No archive work on the main actor.
- Never edit `vendor/7zip`.
- Public types get a doc comment that says why they exist, not what the name
  already says.

## Review

A reviewer checks, in order: correctness, security, performance, design,
tests. Findings are ordered by severity with file and line. A review is done
when every blocking finding is fixed or explicitly deferred in an issue.

## License

By contributing you agree that your contribution is licensed under
LGPL-3.0, the license of this repository.
