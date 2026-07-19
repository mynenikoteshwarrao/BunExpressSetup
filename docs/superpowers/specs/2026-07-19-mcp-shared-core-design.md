# Koti MCP v3.1 — Shared Generator Core

**Date:** 2026-07-19
**Status:** Approved
**Target version:** 3.1.0

## Problem

A multi-agent review (2026-07-19) of the existing MCP server (`src/mcp-server.ts`, 756 lines) confirmed 23 findings. The root cause of nearly all of them: the MCP server shares no code with the CLI. Instead it spawns `node dist/cli.js` and drives the CLI's interactive readline prompts by piping pre-scripted answer sequences into stdin ("stdin puppeteering"). The v3 CLI changed its prompts; the MCP answer scripts were never updated; and a lenient success check (`exitCode !== 0 && !output.includes('successfully')`) hides every failure.

Confirmed consequences (highlights):

- `create_enum` can never succeed (sends `1`/`2` where the CLI expects the words `string`/`number`) yet reports success on every call.
- `create_model` answers 4 questions per field while the CLI asks 6; the CLI's readline drops pre-buffered stdin lines, so the CLI exits 0 having created nothing — reported as success with an empty file list.
- Six tools report fabricated success for every CLI soft-failure path that exits 0 (invalid enum type, duplicate task, missing Task.ts, unparsable enum, empty description).
- Elysia (the v3 headline feature) is unreachable via MCP: `create_project` has no framework parameter and the non-TTY spawn silently defaults to Express. The sub-generators are Express-only even in the CLI — `koti.config.json` is written but never read.
- A bad `projectPath` can crash the whole server (no `child.on('error')`); no timeout on spawned CLI runs; `seed_database` runs `npm run seed` in any directory (arbitrary code execution vector) and blocks the event loop via `execSync`.
- MCP resources read `process.cwd()`, which is meaningless for a client-spawned stdio server.
- Distribution: the packaged `koti-mcp-2.0.3.mcpb` is two major versions stale (pre-Elysia, missing v3.0.1 auth hardening); `MCP_DISTRIBUTION_GUIDE.md` documents install commands that do not exist; the published README has no MCP documentation; `scripts/update-version.js` does not update `package.json` or `manifest.json`.

## Goals

1. Eliminate the stdin-puppeteering bug class permanently by making CLI and MCP call the same generator functions.
2. Deliver framework parity: sub-generators emit Express or Elysia code according to the project's `koti.config.json`.
3. Never report fabricated success: responses list files actually written; failures surface as errors.
4. Ship a coherent 3.1.0 release: fresh `.mcpb`, correct docs, working version-sync tooling.

## Non-goals

- No changes to project-scaffold templates (`templates/express`, `templates/elysia`, `templates/shared`) beyond what sub-generator variants require.
- No changes to generated app features (JWT auth, RBAC, audit, documents/S3, tinyURL, Swagger, email).
- No new frameworks beyond Express and Elysia.

## Architecture

A new `src/generators/` package becomes the single source of truth for code generation. Both entry points import it directly.

```
src/
  generators/
    context.ts      — project detection & shared plumbing (see below)
    project.ts      — createProject(opts): scaffold a new project
    model.ts        — createModel(opts) and editModel(opts)
    enum.ts         — createEnum(opts)
    controller.ts   — createController(opts)
    service.ts      — createService(opts)
    middleware.ts   — createMiddleware(opts)
    task.ts         — createTask(opts)
  cli.ts            — commander + readline prompt layer ONLY; collects answers, calls generators
  mcp-server.ts     — MCP tools validate input (zod) and call generators in-process
```

`context.ts` owns:

- **Project detection:** `resolveProject(root)` reads `koti.config.json` first (authoritative: framework, version); falls back to dependency sniffing (express/elysia/mongoose in package.json) for pre-3.1 projects, with a warning. Returns `{root, framework}` or throws `NOT_KOTI_PROJECT`.
- **Framework resolution:** unknown/missing framework falls back to `express` with a warning (never a silent wrong emit, never a hard fail on old projects).
- Naming utilities (toCamelCase, toPascalCase), index-export updater, sub-generator template loading (resolved from the package root via `__dirname`, as today).
- A single `getVersion()` (currently duplicated verbatim in `cli.ts` and `mcp-server.ts`).
- The canonical **field-type list** and **enum-type list**, exported once and consumed by both the CLI menu and the MCP zod schemas so they cannot drift.

### Generator contract

Every generator:

- takes structured arguments (no readline, no prompts, no console I/O; optional logger callback for CLI printing),
- returns `GeneratorResult { files: string[]; warnings: string[] }` where `files` are paths it actually wrote,
- throws `GeneratorError { code, message }` on failure, with codes: `NOT_KOTI_PROJECT`, `DUPLICATE`, `INVALID_INPUT`, `UNSUPPORTED_FRAMEWORK`, `IO_ERROR`, `INSTALL_FAILED`.

Consequences:

- **CLI:** catches `GeneratorError`, prints the red message, exits **1** (fixes all exit-0 soft-failure paths).
- **MCP:** catches `GeneratorError`, returns `isError: true` with the message. Success responses render the returned file list — real files, not recomputed guesses (fixes the wrong-validator-filename and unverified-path findings).

### File size

Per project rules, every file stays under 500 lines. `cli.ts` (currently 3123 lines) shrinks to command/prompt wiring; each generator lives in its own file.

## Framework awareness

`createProject` continues writing `koti.config.json` (`{ framework: "express" | "elysia", version }`). Every sub-generator calls `resolveProject()` and selects the matching template variant:

- **controller / service / middleware / enum / task:** Express and Elysia variants (service, enum, task are framework-neutral today and stay shared where possible; controller and middleware need Elysia variants since they currently hard-code Express imports).
- **model CRUD chain** (controller, service, Joi validator, routes with Swagger docs, route auto-registration): Elysia variants authored to match what the Elysia project template expects.

## MCP tool surface (v3.1)

| Tool | Change |
|------|--------|
| `create_project` | Gains `framework: 'express' \| 'elysia'` (default `express`). `skipInstall` becomes real: the install step in `createProject` is conditional. `directory` must be an absolute existing path. |
| `create_model` | Field `type` enum aligned to the canonical 8 (String, Number, Date, Boolean, ObjectId, Array, Mixed, JSON). Gains per-field `index: boolean` and `default: string`. Dead `ref` parameter removed. `field.name` regex-validated as an identifier (kills newline injection). |
| `edit_model` (new) | Add/remove fields on an existing model; regenerates CRUD files with `.bak` backups — closes the `model:edit` parity gap. |
| `create_enum` | Works via direct call. `enumType` passed as typed argument. Keys regex-validated as identifiers; values validated. |
| `create_controller` / `create_service` / `create_middleware` | Name regex-validated; project validated via `resolveProject`; reported paths come from the generator's returned file list. |
| `create_task` | Name regex widened to `^[A-Z][A-Z0-9_]*$` (CLI allows digits). Description sanitized (no newlines). Duplicate/missing-file cases are errors, not fabricated successes. |
| `seed_database` | Requires a verified Koti project (closes the run-anything vector). Async `spawn` with timeout (default 120s) instead of event-loop-blocking `execSync`. Captures stdout **and** stderr in the error report. |

Cross-cutting input rules: every `projectPath`/`directory` must be absolute, exist, and (for generators) resolve to a Koti project — validated before any filesystem write.

### Resources and prompts

The three resources (`project-structure`, `models-list`, `tasks-list`) resolve their project root from, in order: `--project-root` server argument, `KOTI_PROJECT_ROOT` env var, `process.cwd()` fallback. This makes them usable when Claude Desktop spawns the server with an arbitrary cwd. The two prompts (`scaffold-api`, `add-crud-model`) are updated to mention framework choice.

### Remaining child processes

Only dependency install (inside `createProject`) and `seed_database` spawn children. Both get: `child.on('error')` handlers (fixes the server-crash vector), timeouts (install: 300s; seed: 120s), and kill-on-timeout. Nothing else shells out — `runKotiCommand` is deleted.

## Error handling summary

- Generator failures → typed `GeneratorError` → CLI exit 1 / MCP `isError: true`.
- Child-process failures → caught via `error` handler + timeout kill → surfaced with stdout+stderr.
- Success is only ever claimed with the generator's actual written-file list attached.

## Testing

Vitest (already configured). Three layers:

1. **Generator unit tests** — each generator scaffolds into a temp dir; assert returned file list matches disk, assert content for **both frameworks**, assert typed errors for duplicate/invalid/non-project cases.
2. **MCP integration test** — builds the server, speaks real JSON-RPC over stdio: `initialize` → `tools/list` → `create_project` (skipInstall) → `create_model` → `create_enum` → assert files exist on disk and responses list them. This is exactly the test that would have caught the current breakage.
3. **CLI smoke test** — drives the prompt layer for `model` and `enum` end-to-end (answers fed per-prompt), asserting generated files; plus exit-code assertions for failure paths (must be 1, not 0).

## Distribution & docs

- `scripts/update-version.js` updates `package.json`, `manifest.json`, and `version.json` together.
- Version bumped to **3.1.0**; `.mcpb` rebuilt via `npm run pack:mcpb` from the new build; the stale `koti-mcp-2.0.3.mcpb` is deleted from the repo root.
- `MCP_DISTRIBUTION_GUIDE.md` rewritten to the three real install paths: `npm i -g koti` → `koti-mcp` binary; `claude mcp add koti -- koti-mcp`; the `.mcpb` bundle for Claude Desktop.
- README gains an MCP section (tools list, install, `KOTI_PROJECT_ROOT`).
- `manifest.json` tool descriptions updated (framework-aware wording).

## Success criteria

1. All 8+1 MCP tools verifiably work end-to-end against the built server (integration test green).
2. An Elysia project can be scaffolded via MCP, and sub-generators emit Elysia code inside it.
3. No tool can report success without listing files that exist on disk; all former exit-0 soft failures surface as errors in both CLI and MCP.
4. CLI behavior is unchanged for interactive users (same prompts, same outputs) except failures now exit 1.
5. Rebuilt `.mcpb`, corrected guide, README MCP section, and version-sync all ship in the same release.
