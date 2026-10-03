# Graph Report - QuarkZip  (2026-10-03)

## Corpus Check
- 43 files · ~16,995 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 274 nodes · 241 edges · 44 communities (23 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `32eb7ccc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- opencode.json
- tauri.conf.json
- compilerOptions
- github
- What You Must Do When Invoked
- Opencode Configuration for QuarkZip
- permission
- /graphify
- graphify reference: extra exports and benchmark
- devDependencies
- compilerOptions
- QuarkZip — agent instructions
- 7zz binaries for QuarkZip
- graphify reference: query, path, explain
- Tauri development (QuarkZip)
- QuarkZip
- default.json
- lib.rs
- react
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- fetch-7zz.sh
- graphify.js
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- extraction-spec.md
- quarkzip

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `What You Must Do When Invoked` - 12 edges
3. `Opencode Configuration for QuarkZip` - 10 edges
4. `/graphify` - 10 edges
5. `permission` - 8 edges
6. `graphify reference: extra exports and benchmark` - 8 edges
7. `github` - 6 edges
8. `compilerOptions` - 6 edges
9. `scripts` - 5 edges
10. `build` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (44 total, 6 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.08
Nodes (25): dependencies, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-opener, name, private, scripts (+17 more)

### Community 1 - "opencode.json"
Cohesion: 0.08
Nodes (24): agents, default, list, commands, custom, instructions, lsp, model (+16 more)

### Community 2 - "tauri.conf.json"
Cohesion: 0.11
Nodes (18): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+10 more)

### Community 3 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 4 - "github"
Cohesion: 0.12
Nodes (16): enabled, headers, oauth, type, url, Authorization, mcp, github (+8 more)

### Community 5 - "What You Must Do When Invoked"
Cohesion: 0.13
Nodes (15): Part A - Structural extraction for code files, Part B - Semantic extraction (parallel subagents), Part C - Merge AST + semantic into final extraction, Step 0 - GitHub repos and multi-path merge (only if a URL or several paths), Step 1 - Ensure graphify is installed, Step 2.5 - Video and audio (only if video files detected), Step 2 - Detect files, Step 3 - Extract entities and relationships (+7 more)

### Community 6 - "Opencode Configuration for QuarkZip"
Cohesion: 0.14
Nodes (13): Agents, Commands, Documentation, Guardrails, Knowledge graph, MCP, Opencode Configuration for QuarkZip, Repo layout (target project) (+5 more)

### Community 7 - "permission"
Cohesion: 0.18
Nodes (11): chmod 777 *, rm -rf *, sudo *, permission, bash, edit, glob, grep (+3 more)

### Community 8 - "/graphify"
Cohesion: 0.20
Nodes (9): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Usage (+1 more)

### Community 9 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 10 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, tailwindcss, @tailwindcss/vite, @tauri-apps/cli, @types/react, @types/react-dom, typescript, vite (+1 more)

### Community 11 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 12 - "QuarkZip — agent instructions"
Cohesion: 0.33
Nodes (5): Conventions, graphify, Guardrails, QuarkZip — agent instructions, Toolchain

### Community 13 - "7zz binaries for QuarkZip"
Cohesion: 0.33
Nodes (5): 7zz binaries for QuarkZip, Assets we use, Checked-in vs fetch-at-build, License, Tauri sidecar naming

### Community 14 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 15 - "Tauri development (QuarkZip)"
Cohesion: 0.33
Nodes (5): Checks, Commands, Frontend, Sidecar (7zz), Tauri development (QuarkZip)

### Community 16 - "QuarkZip"
Cohesion: 0.33
Nodes (5): Layout (per https://v2.tauri.app/start/project-structure/), Prereqs, QuarkZip, Quickstart, Status

### Community 17 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 18 - "lib.rs"
Cohesion: 0.33
Nodes (4): drag_window(), greet(), String, Window

### Community 20 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 21 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 22 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 23 - "fetch-7zz.sh"
Cohesion: 0.83
Nodes (3): fetch(), pick(), fetch-7zz.sh script

## Knowledge Gaps
- **174 isolated node(s):** `$schema`, `version`, `model`, `small_model`, `reasoningEffort` (+169 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 211 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `mcp` connect `github` to `opencode.json`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `permission` connect `permission` to `opencode.json`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `model` to the rest of the system?**
  _174 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07977207977207977 - nodes in this community are weakly interconnected._
- **Should `opencode.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `tauri.conf.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._