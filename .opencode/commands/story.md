---
description: Build the next story from the backlog
---
Call the `improve-loop` skill and work on the next unchecked story in
`docs/STORIES.md`.

Rules:

- One story per commit, Conventional Commits format.
- Write or update the failing test before the implementation.
- Run `./Scripts/verify.sh` and look at the light and dark snapshots.
- Tick the story only when every acceptance line is proven by a test, a
  self-test step, or a named snapshot.
