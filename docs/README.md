# Documentation

Start here, then read only what the task needs.

## Product

- [Vision](product/vision.md) - who this is for, what it must feel like, what
  it refuses to do.
- [Feature map](product/features.md) - parity with the desktop archive
  managers people already use, and the gaps worth closing.
- [Stories](STORIES.md) - the backlog, one checkable story at a time.
- [Roadmap](roadmap.md) - milestones and the order of work.

## Architecture

- [Overview](architecture/overview.md) - targets, layers, data flow,
  concurrency, security.
- [Engine](architecture/engine.md) - how 7-Zip is vendored, compiled, and
  called through a C ABI.
- [Decisions](decisions/) - ADRs for choices that are expensive to reverse.

## Design

- [Design system](design/design-system.md) - tokens, type, spacing, motion,
  components, accessibility.
- [Legacy rules review](design/legacy-rules-review.md) - audit of the two old
  design documents, measured contrast, HIG comparison, and the decisions
  still open before the next UI pass.

## Quality

- [Testing](testing.md) - the pyramid, fixtures, coverage gates, snapshots,
  self-test.
- [Contributing](../CONTRIBUTING.md) - branch, commits, review, done.

## Research

- [Competitive landscape](research/competitive-landscape.md) - what 7-Zip GUI,
  WinRAR, PeaZip, Ark, File Roller, MacPacker, Keka, and AkiZip get right and
  wrong.

## Rules for these docs

- Write in plain words, present tense, active voice.
- No em dashes.
- A doc that describes a plan says whether it is done, in progress, or
  planned.
- When a decision changes, add an ADR instead of silently rewriting history.
