# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

`labs/brain-archive` is a Node.js CLI lab that reproduces the book's Archive Agent pipeline (Daily Note → section parser → action planner → dry-run diff → apply → graph doctor → similar search) with **no external LLM or embedding services**. It ships three surfaces over the same core module:

1. CLI — `src/brain-archive.mjs` (`bin: brain-archive`)
2. Dashboard — `src/dashboard-server.mjs` serving `web/` over plain `node:http`
3. Obsidian plugin — `obsidian-plugin/` (loaded directly by Obsidian)

The lab is intentionally minimal: no production embedding index, no confidence scoring, no approval queue.

## Commands

```bash
npm test                    # node --test test/*.test.mjs (only test runner)
npm run dashboard           # http://127.0.0.1:8787 (set PORT=… to override)
npm run plugin:check        # node --check on obsidian-plugin/main.js + brain-archive.cjs

# Run a single test by name pattern
node --test --test-name-pattern="parses H2" test/brain-archive.test.mjs

# CLI against the read-only fixture vault
node src/brain-archive.mjs archive fixtures/vault/daily/2026-06-19.md --vault fixtures/vault --dry-run
node src/brain-archive.mjs archive fixtures/vault/daily/2026-06-19.md --vault fixtures/vault --json
node src/brain-archive.mjs graph doctor --vault fixtures/vault
node src/brain-archive.mjs search similar fixtures/vault/notes/frontend/react-query.md --vault fixtures/vault --limit 2

# Disposable sandbox vault for manual --apply runs
./bootstrap-sandbox-vault.sh sandbox-vault 2026-06-22
```

Default mode is dry-run. `--apply` mutates the vault and **moves** the daily note into `archive/daily/` while stamping `archive_status: archived` in its frontmatter.

There is **no build step, no linter, no formatter, no TypeScript** configured in this lab. ESM only (`"type": "module"`), Node ≥ 18 (uses `node:test`, top-level async). Do not introduce a bundler or transpiler.

## Architecture

### Core module — `src/brain-archive.mjs`

Single file (~800 lines) exporting the entire pipeline as pure-ish functions. Everything else (CLI, dashboard, plugin) is a thin caller of these exports:

- `parseDailyNote(markdown)` — strips frontmatter, splits on `## H2`, then splits each section on `### H3` topics. Returns flat `[{heading, topic, text}]`.
- `planArchive({sections, sourcePath, vaultRoot})` — classifies each section (`create_note` / `create_project_note` / `create_question_note` / `create_decision_note` / `create_meeting_note`) and computes the target path. Project hierarchy uses `>` chains in the topic (`위자드 > MW > fallback`) to derive nested `projects/<a>/<b>/<b>.md` paths. **Project index files are named after the project, never `index.md`**, because Obsidian backlinks collapse on duplicate `index` titles.
- `renderPlanDiff({actions, vaultRoot})` — pure string diff; checks `hasAppliedAction` against existing target to avoid double-append.
- `applyPlan({actions, vaultRoot})` — creates or appends target notes and ensures parent project index notes exist.
- `markDailyNoteArchived({sourcePath, vaultRoot})` — updates frontmatter then **moves** the daily note to `archive/daily/`, picking a collision-free name via `nextAvailablePath`. Called automatically after `applyPlan` in CLI and dashboard.
- `analyzeVaultGraph(vaultRoot)` — walks all `.md` files, resolves wikilinks by slugified filename or H1 title, reports orphans (under `notes/` only), broken links, top hubs.
- `findSimilarNotes({vaultRoot, queryPath|queryText, limit})` — token-frequency vector + cosine similarity. No embeddings, no IDF; `STOP_WORDS` filters obvious filler.

### Critical invariant: the three copies of the core module

The Obsidian plugin cannot `import` ESM from `src/`. So the lab maintains **three** copies of the core logic:

| File | Format | Used by |
| --- | --- | --- |
| `src/brain-archive.mjs` | ESM | CLI, dashboard, tests |
| `obsidian-plugin/brain-archive.mjs` | ESM (mirror) | reference only |
| `obsidian-plugin/brain-archive.cjs` | CommonJS | Obsidian plugin runtime (`main.js` does `require("./brain-archive.cjs")`) |

When you change `src/brain-archive.mjs`, **port the same change to `obsidian-plugin/brain-archive.cjs`** (and ideally the `.mjs` mirror) or the plugin will drift. The plugin loads the `.cjs` from its own folder — never from the vault root.

### Dashboard — `src/dashboard-server.mjs` + `web/`

`node:http` server. `GET` serves `web/{index.html,app.js,styles.css}`; `POST /api/{bootstrap,archive/dry-run,archive/apply,graph,similar,report}` delegates to core exports. Paths in request bodies are resolved relative to the lab root (`resolveFromLab`). The bootstrap endpoint and `bootstrap-sandbox-vault.sh` produce identical scaffolding — keep them in sync.

### Obsidian plugin — `obsidian-plugin/`

`main.js` is a hand-written, dependency-free Obsidian plugin (no esbuild). It registers a ribbon icon + commands, opens an in-modal dashboard, and calls the bundled `brain-archive.cjs`. Installation copies `manifest.json`, `main.js`, `styles.css`, `brain-archive.cjs` into `<vault>/.obsidian/plugins/brain-archive/`. The `.mjs` mirror is not shipped.

### Tests — `test/brain-archive.test.mjs`

`node:test` only. Two patterns are used:

- Read-only tests against the committed `fixtures/vault/` (do not mutate it).
- Apply / archive tests `cp -r` the fixture into `mkdtemp` and clean up with `rm -rf` in `t.after`.

`fixtures/vault/` is the canonical reference vault — preserve its shape when adding fixtures.

## Daily-note input rules (encoded in `planArchive`)

These shape what targets are created; understanding them is required before editing `classifySection` / `targetForSection`:

- **Projects**: under `## Project`, the H3 topic can be plain text (`### 위자드 > MW > fallback 정책`) or a wikilink to an existing project (`### [[projects/위자드/mw/mw|MW]] > fallback 정책`). Both produce the same nested `projects/<a>/<b>/<b>.md` structure plus a decision/note leaf.
- **Decisions**: under `## Decision`, the project chain plus the final segment becomes `decisions/<project-chain>/<slug>.md`.
- **Meetings**: under `## Meeting`, `### 13:00 무슨회의` becomes `meetings/무슨회의/<daily-date>-13-00.md`; without a time, `meetings/<slug>/<daily-date>.md`. The daily-note date is part of the meeting note's identity.
- **Project index files** are named `<project>.md`, never `index.md`.

## Parent repo

This lab lives inside the `obsidian-agent-second-brain` mdBook repo. The book's full toolchain (`mdbook build`, `_tools/mdbook.sh`) runs at the repo root and is unrelated to this lab. From inside the lab, only the npm scripts above are relevant.
