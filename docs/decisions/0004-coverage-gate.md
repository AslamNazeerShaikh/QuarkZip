# 0004 - Coverage gate and test pyramid

- Status: accepted
- Date: 2026-11-01

## Context

The project asks for 100% unit test success and 100% code coverage. Taken
literally across SwiftUI view bodies, that number is not meaningful: a view
body is a function of state, and asserting its pixels is a snapshot test, not
a unit test. Chasing line coverage in views produces tests that call `body`
and prove nothing.

At the same time, the code that can lose a user's files is not the view. It
is the path policy, the extraction plan, the tree builder, the job state
machine, and the engine adapter.

## Decision

1. **100% line coverage is a hard gate for `QuarkZipKit`.**
   `Scripts/coverage.sh` fails below it.
2. **The engine has a measured baseline that may only go up.** The first
   milestone records it in `docs/testing.md`.
3. **Views are excluded from line coverage** and proven by snapshots in light
   and dark plus the in-app self-test.
4. **100% of unit tests pass** before any commit. No skipped tests, no
   `.disabled`, no retries.
5. Exclusions require a written reason in `docs/testing.md`.

## Consequences

- The kit must be designed for testability: injected clocks, protocols at the
  engine boundary, pure functions for sorting and path rules.
- Some code moves from the view into the kit so it can be tested.
- Snapshot review stays a human step. A script can check that images exist,
  not that they look right.
- Coverage is a floor, not a goal. A test that asserts nothing is worse than
  no test and will be rejected in review.

## Alternatives considered

- **100% across every target including views**: vanity metric, brittle tests.
- **No gate**: coverage drifts down under deadline pressure.
- **Mutation testing now**: valuable later, too slow for the first
  milestones. Revisit before 1.0.

## References

- `docs/testing.md`
- `Scripts/coverage.sh`
