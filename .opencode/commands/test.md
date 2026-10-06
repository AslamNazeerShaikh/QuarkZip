---

name: test
description: Run frontend unit tests (vitest)
category: test
command: npm test
args:

- name: coverage
  description: Include v8 coverage report
  type: string
  default: "false"
  examples:
- npm test
- npm run test:coverage
- npm run test:rust
