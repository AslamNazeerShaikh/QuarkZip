# Opencode Configuration for QuarkZip

Tauri 2 + React + Tailwind v4 archive manager with a pinned 7-Zip sidecar.
Model: `opencode/muse-spark-1.3-contributor-free` via OpenCode Zen (reasoning effort high).

## Structure

```
.opencode/
├── opencode.json              # Main configuration (model, agents, skills, commands, MCP)
├── agents/                    # Agent definitions
│   ├── tauri-app-assistant.md # Main coach (default)
│   ├── rust-developer.md      # PRIMARY for Rust (strict quality rules)
│   ├── code-reviewer.md       # Tauri/React/Rust review checklist
│   ├── test-writer.md         # Test strategy (harness proposed on demand)
│   └── documentation-writer.md# Keeps README + docs/7zz-binaries.md in sync
├── skills/                    # Skill definitions
│   ├── tauri-development.md   # Sidecars, commands, capabilities, checks
│   └── graphify/              # Knowledge-graph skill (untouched, shared)
├── commands/                  # Custom commands
│   ├── dev.md                 # `npm run tauri dev`
│   ├── build.md               # `npm run build`
│   ├── tauri-build.md         # `npm run tauri build`
│   ├── check.md               # `npm run build` + `cargo check`
│   ├── fetch-7zz.md           # `./scripts/fetch-7zz.sh`
│   └── clean.md               # `rm -rf dist src-tauri/target`
├── permissions/               # Permission rules (npm/cargo/graphify bash allows, destructive denies)
│   └── default.md
├── lsp/                       # rust-analyzer + typescript + JSON
│   └── default.md
└── plugins/
    └── graphify.js            # Knowledge-graph reminder hook (untouched, shared)
```

## Repo layout (target project)

| Path                   | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `src/`                 | React + Tailwind v4 frontend (`main.tsx`, `App.tsx`, `index.css`)       |
| `src-tauri/`           | Rust backend (`lib.rs` commands, `main.rs` launcher, `tauri.conf.json`) |
| `src-tauri/binaries/`  | Pinned 7zz sidecars (fetch-at-build, gitignored)                        |
| `scripts/fetch-7zz.sh` | Pinned 7-Zip fetch + normalize script                                   |
| `docs/7zz-binaries.md` | Asset table, sidecar naming, license notes                              |

## Agents

| Agent                   | Purpose                                                                |
| ----------------------- | ---------------------------------------------------------------------- |
| `tauri-app-assistant`   | Main coach (default): features, 7zz wiring, UI                         |
| `rust-developer`        | PRIMARY for Rust: strict quality rules (use for all `src-tauri/` work) |
| `code-reviewer`         | Reviews against the checklist (argv safety, streaming, virtualization) |
| `test-writer`           | Proposes harness on demand, writes tests                               |
| `documentation-writer`  | Keeps root `README.md` + `docs/7zz-binaries.md` in sync                |
| `macos-design-reviewer` | Native macOS UI review (palette, accents, materials, no liquid glass)  |

## Skills

| Skill               | Description                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `tauri-development` | Sidecar spawning, Tauri commands, capabilities, checks                                   |
| `macos-design`      | Native macOS rules; full HIG audits via installed `apple-design` skill + `ui-skills` MCP |

## Commands

| Command       | Description                                     |
| ------------- | ----------------------------------------------- |
| `dev`         | `npm run tauri dev`                             |
| `build`       | `npm run build` (`tsc && vite build`)           |
| `tauri-build` | `npm run tauri build` (installers)              |
| `check`       | `npm run build` + `cargo check` in `src-tauri/` |
| `fetch-7zz`   | `./scripts/fetch-7zz.sh`                        |
| `clean`       | `rm -rf dist src-tauri/target`                  |

## MCP

| Server       | Purpose                                                 |
| ------------ | ------------------------------------------------------- |
| `ui-skills`  | UI skill registry (frontend patterns)                   |
| `github`     | GitHub access (uses `GITHUB_PERSONAL_ACCESS_TOKEN` env) |
| `whiteboard` | Whiteboard review sessions                              |

## Guardrails

- Bash `*` allowed, except destructive commands are denied: `rm -rf *`, `sudo *`, `chmod 777 *` (full deny list in `permissions/default.md`).
- Sensitive files (`.env*`, `*.key`, `*.pem`, `secrets.*`, `credentials.*`) are neither written nor read.
- Never install toolchains/packages on your own — give copy-pasteable commands instead.

## Usage

### Switch Agent

```
> agent code-reviewer
```

### Run Command

```
> dev
> fetch-7zz
```

### Knowledge graph

```
> /graphify
```

(`graphify update .` after code changes once `graphify-out/` exists; see `AGENTS.md`)

## Documentation

- [Opencode Config](https://opencode.ai/docs/config/)
- [Opencode Agents](https://opencode.ai/docs/agents/)
- [Opencode Models](https://opencode.ai/docs/models/) (Zen model IDs use `opencode/<model-id>`)
- [Opencode Commands](https://opencode.ai/docs/commands/)
- [Opencode Permissions](https://opencode.ai/docs/permissions/)
- [Opencode LSP](https://opencode.ai/docs/lsp/)
