# Database Choice: MongoDB or Postgres — Design Spec (v3.2.0)

**Date:** 2026-08-06
**Status:** Approved design, pending implementation plan
**Prior art:** `Elysia-support.md` (the v3.0.0 second-axis precedent this spec deliberately mirrors)

## 1. Summary

Koti gains a second stack axis: the **database**. Developers pick MongoDB or Postgres
at `koti new` and can convert an existing project at any time with `koti db:switch`.
Both frameworks (Express and Elysia) support both databases with full feature parity.
The Postgres output is production-credible — UUID primary keys, drizzle-kit migrations,
transaction helpers, JSONB — not a toy port.

**Motivation.** An external architecture review chose AdonisJS + Postgres over Koti for a
marketplace project, with MongoDB-only named as the load-bearing rejection ("a
`--database postgres` template would be a natural evolution of koti"). This release
removes that rejection reason. The longer-term ambition (compete with AdonisJS on
scaffolding value while keeping Koti's no-lock-in "you own the generated code"
differentiation) is recorded in §10 Future Work — not in this release's scope.

## 2. Decision log

| Decision | Choice | Rationale |
| --- | --- | --- |
| Switch semantics | **Regenerate on switch** (`koti db:switch`), `.bak` backups | Generated code stays idiomatic per DB; no permanent abstraction tax; matches `model:edit` conventions |
| Postgres stack | **Drizzle ORM + node-postgres (`pg`)** | TS-first schema files codegen/round-trip like Mongoose files; drizzle-kit migrations; works under bun *and* ts-node; raw-SQL escape hatch for ledger-grade work later |
| Data on switch | **Code-only** | Mongo↔PG data migration (ObjectId→UUID, refs→FKs) is its own project; developer owns data |
| Framework scope | **Both Express + Elysia at once** | Full parity is the house style (v3.0.0) |
| Architecture | **Axis-disciplined template layers** | Growth is F+D, not F×D; see §4 |
| Postgres quality bar | **Production-credible** | UUID PKs, migrations, `db.transaction`, JSONB, partial unique indexes |

## 3. Goals and non-goals

### Goals

1. `koti new <name> --database <mongodb|postgres>`; flag → TTY prompt → default `mongodb` (non-interactive default preserved for CI and the test suite).
2. Identical API surface and response shapes on either database (same endpoints, same JSON, same env-var conventions where possible).
3. `koti db:switch <database>` converts an existing project's code, config, and dependencies; MCP tool `switch_database` mirrors it.
4. All component generators (`model`, `model:edit`, CRUD) emit idiomatic code for the project's database, detected from `koti.config.json`.
5. A per-project **models manifest** makes regeneration authoritative instead of regex-parsing generated source.

### Non-goals (this release)

- Data migration between databases (switch is code-only; `.bak` files are the safety net).
- SSR / storefront templates.
- Ledger, transactional-outbox, RLS, or pg-boss scaffolds (→ §10).
- Prisma or other ORM options (`DATABASES` stays extensible).
- MySQL/SQLite variants.

## 4. Template architecture: axis-disciplined layers

### 4.1 New layout

```text
templates/
├─ express/          ← framework-only (routes, controllers, middleware, swagger/oauth config)
├─ elysia/           ← framework-only
├─ shared/           ← truly neutral (types/, utils/, enums/)
└─ db/
   ├─ mongodb/src/   ← models/, services (auth, user, audit, document, tinyUrl), seeds/, config/database.ts
   └─ postgres/src/  ← models/ (Drizzle tables), services, seeds/, config/database.ts, drizzle.config.ts, migrations
```

`createProject` copy order: **framework → shared → db layer**, each guarded by
`fs.pathExists` (existing idiom). Last layer wins whole-file collisions; after the
de-mixing seams below, no file legitimately exists in two layers.

**Rule: every template file is single-axis** — framework-owned, db-owned, or neutral.
The four files that currently mix axes get seams, not variants:

### 4.2 De-mixing seams

| File | Today | Seam |
| --- | --- | --- |
| `server.ts` (×2) | imports mongoose, calls `mongoose.connection.close()` | db layer's `config/database.ts` exports `connectDB()` + `closeDB()`; server.ts calls only those. Express keeps fire-and-forget connect; Elysia keeps top-level `await connectDB()` (framework concerns) |
| RBAC middleware (`authorize.ts`, `checkPermission.ts`, elysia `auth.ts`) | `User.findById().populate('roles')` per request | per-DB `userService.getUserWithRoles(id)`; middleware becomes framework-only |
| `passport.ts` (express) | verify callback does a 3-branch Google upsert (find by googleId / link by email / create) that duplicates `authService.googleAuth` | delegate to a single `authService.googleAuth` call (the elysia `oauth.ts` precedent); passport.ts becomes framework-only |
| `auditMiddleware.ts` (express) | dead/unwired code (per the elysia parity notes) importing `Types` from mongoose | **deleted** in v3.2 — shipping it would fail the zero-mongoose gate on PG projects |
| audit controllers (×2) | `Types.ObjectId.isValid` + casts; `AuditLogEntry` exposes `Types.ObjectId` | db layer exports `isValidId(id: string)`; audit interfaces take plain `string` IDs |
| `package.json` (×2) | framework + mongoose deps in one file | framework template holds the base; DB deps/scripts **JSON-merged at scaffold time** (see 4.3) |
| `.env` / `.env.example` (×2) | MONGODB_URI + framework config | DB section composed at scaffold; the exactly-two-`REPLACE_WITH_AUTO_GENERATED_SECRET`-tokens contract is unchanged |
| `README.md` (express template only) | "start MongoDB" prose | DB section swapped from a per-DB fragment at scaffold |

The Mongo layer is refactored **only** at these seams. Its schema-level business logic
(bcrypt `pre('save')`, token instance methods, `toJSON` transforms) stays as-is — it is
battle-tested and locked by security regression tests. Parity is defined at the
**service function level**: both db layers expose the same service signatures and wire
shapes (deliberate asymmetry in internals; documented with parity notes, the
`elysia/middleware/audit.ts` convention). One in-passing fix: the models barrel ships
complete and correct in both db layers — today it exports only User/Role and mis-declares
a named `User` export that `User.ts` never provides.

### 4.3 Scaffold-time composition

- **Dependencies:** each db layer ships a fragment file `templates/db/<database>/package.deps.json`
  (`{ dependencies, devDependencies, scripts }`); `createProject` merges it into the copied
  package.json. Mongo: `mongoose`. Postgres: `drizzle-orm`, `pg`, `drizzle-kit` (dev),
  `@types/pg` (dev) — pinned to current 2026 majors (the partial-index `.where()`,
  `$onUpdate`, and unsuffixed `drizzle-kit generate/migrate` all require ≥ 2024 releases),
  plus scripts `db:generate`, `db:migrate`, `cleanup:urls`.
  (Also fixed in passing: drop obsolete `@types/mongoose` from the express template.)
- **Script runner split:** TS-file scripts are framework-runner-specific today (express:
  `npx ts-node src/seeds/...`; elysia: `bun run src/seeds/...`). The merge applies
  framework-conditional values for TS-file scripts (`cleanup:urls`), mirroring the existing
  seed-script split; `drizzle-kit` calls are runner-neutral. **Seed filename parity:** the
  PG db layer ships `src/seeds/seed.ts` and `src/seeds/seedRoles.ts` under the same names,
  so the framework-layer `seed`/`seed:roles` scripts and the MCP `seed_database` tool keep
  working unmodified.
- **Env:** each db layer ships `templates/db/<database>/env.fragment` (`MONGODB_URI=...` vs
  `DATABASE_URL=postgres://localhost:5432/<name>`), inserted into `.env`/`.env.example`.
  Fragment files live outside `src/` so the overlay copy never places them in the project. The code-resident fallback `.env` block in
  `project.ts` (lines ~430–451) branches on database too.
- **Express inline route strings** (`project.ts` lines 56–296): the hardcoded
  "…Express, and MongoDB" description string becomes database-conditional. (Killing the
  inline duplication entirely is noted as a cleanup candidate, not required here.)

## 5. The Postgres template

- **Driver/ORM:** Drizzle over `pg` Pool. `config/database.ts` exports `db` (Drizzle
  instance), `connectDB()` (pool ping, fail-fast on missing `DATABASE_URL` — mirrors the
  JWT fail-fast), `closeDB()` (pool end).
- **Model files:** one file per model in `src/models/` (keeps the swagger glob
  `./src/models/*.ts` and the MCP `koti://project/models` resource working). Each file
  exports the Drizzle table + `$inferSelect`/`$inferInsert` types.
- **Keys & timestamps:** `id uuid primary key default gen_random_uuid()` (PG ≥ 13 assumed);
  `created_at`/`updated_at timestamptz` with `defaultNow()` and `$onUpdate` (ORM-level,
  firing on Drizzle update calls — same application-layer semantics as Mongoose
  `timestamps: true`).
- **Auth model translation:**
  - `roles: ObjectId[] ref Role` → `user_roles` join table (proper M2M).
  - bcrypt hashing + token creation/comparison → explicit authService/userService functions.
  - `toJSON` wire contract (`_id→id`, strip `password`/`refreshTokens`/reset tokens) → a
    small serializer per db layer; **response JSON is identical across databases** (both emit `id: string`).
  - `select: false` secrets → default column-exclusion in select helpers; explicit opt-in readers.
  - `googleId` sparse-unique → partial unique index (`WHERE google_id IS NOT NULL`).
  - `Document.metadata` Mixed + dot-path query → JSONB + `->>` predicate.
  - TinyUrl TTL index → query-time 7-day filter + `npm run cleanup:urls` script.
  - `auditService.getAuditStats` aggregate() → SQL GROUP BY via Drizzle.
- **Transactions:** multi-table writes (create user + assign roles, seeds) use
  `db.transaction`; the helper is exported so app code can build ACID flows on it.
- **Migrations:** template ships `drizzle.config.ts` + the initial migration for the six
  auth tables (users, roles, user_roles, audit_logs, documents, tiny_urls) **including its
  drizzle-kit meta artifacts (`meta/_journal.json`, `0000_snapshot.json`)** — without the
  snapshot, the user's first `db:generate` after `koti model` would re-emit CREATE TABLE
  for all six tables and `db:migrate` would fail. `db:generate` / `db:migrate` scripts
  wired. Seeds run through the same connection module.
- **Security parity:** awaited token verification, HS256-only, no fallback secrets —
  the v3.0.1 guards hold in the PG services and are test-locked (§8).

## 6. Generator core

### 6.1 Context & detection

- `context.ts`: `Database` union + `DATABASES = ['mongodb', 'postgres'] as const`;
  `ProjectContext` gains `database`.
- `resolveProject`:
  - `koti.config.json.database` read alongside `framework`.
  - **Missing key** (pre-3.2 project) → `'mongodb'` + warning.
  - **Unknown value → hard error** (`UNSUPPORTED_DATABASE`). Deliberately stricter than
    the framework fallback: silently emitting Mongoose into a PG project is the worse failure.
  - Dependency sniff learns the DB axis: `mongoose` → mongodb; `drizzle-orm`/`pg` →
    postgres. The `deps.mongoose ⇒ express` inference and the NOT_KOTI_PROJECT message
    are reworked so a config-less PG project resolves correctly.

### 6.2 Field vocabulary (unchanged) + per-DB mapping

`FIELD_TYPES` keeps the same 8 names and menu order — the CLI stdin contract, MCP
`z.enum`, and the FIELD_TYPES contract test all survive. Mapping:

| FieldType | Mongoose emission | Drizzle emission | TS type |
| --- | --- | --- | --- |
| String | `String` | `text()` | string |
| Number | `Number` | `doublePrecision()` | number |
| Date | `Date` | `timestamp({ withTimezone: true })` | Date |
| Boolean | `Boolean` | `boolean()` | boolean |
| ObjectId | `Schema.Types.ObjectId` (†) | `uuid()` (no FK — FieldSpec has no ref target) | `Types.ObjectId` / `string` |
| Array | `[{ type: Schema.Types.Mixed, ... }]` | `jsonb().$type<any[]>()` | any[] |
| Mixed | `Schema.Types.Mixed` | `jsonb()` | any |
| JSON | `Schema.Types.Mixed` | `jsonb()` | any |

(†) **Live bug fixed here:** today's Mongoose emitter writes a bare `ObjectId` — an
unbound identifier (only `Schema, model, Document, Types` are imported), so models with
ObjectId fields don't typecheck, and no test covers the emission. The relocated
`crud/mongoose/modelFile.ts` emits `Schema.Types.ObjectId` and gains that regression test.
The TS-type column shows Mongoose / Drizzle interface types respectively.

`required` → NOT NULL, `unique` → unique constraint, `index` → `index()`, `default` →
`default(...)` (String-quoting convention preserved). Drizzle default mapping: String /
Number / Boolean literally; a Date default of `Date.now` → `defaultNow()`;
Array/Mixed/JSON defaults → `sql` JSON literals; anything unmappable emits a generation
**warning and omits the default** (never a hard failure — switch must not die on a legal
Mongo default). MCP `fieldSchema` description becomes DB-neutral ("field data type").

### 6.3 Emitters

```text
src/generators/crud/
├─ mongoose/ modelFile.ts, service.ts   ← today's files, moved
├─ drizzle/  modelFile.ts, service.ts   ← new
├─ express.ts                           ← framework axis, near-unchanged
└─ elysia.ts                            ← framework axis, near-unchanged
```

`model.ts` selects DB emitters via `ctx.database` (same ternary style as `isElysia`).
Generated CRUD service on PG: Drizzle select/insert/update/delete with
pagination and `ILIKE` search over String fields (the `$regex` equivalent).
Validators tighten **only on postgres, and only for ObjectId body fields** (Joi `.uuid()` /
TypeBox `format: 'uuid'`); mongodb keeps today's plain-string validation (no 24-hex
tightening — that would change what existing projects accept). Route files stay
DB-neutral: the elysia inline `idParam` remains `t.String()`, and the validator export
names (`create<N>Schema` / `create<N>Body`…) are a **frozen contract across DB idioms** —
this is what lets §7.2 leave controllers/routes untouched on switch.
Barrel export lines become DB-conditional: mongoose keeps
`export { default as X, IX } from './X'`; drizzle models get `export * from './X'`
(tables and inferred types are named exports).

### 6.4 Models manifest — the switch foundation

`koti.config.json` becomes:

```json
{
  "framework": "express",
  "database": "postgres",
  "kotiVersion": "3.2.0",
  "createdAt": "...",
  "models": {
    "Product": {
      "fields": [{ "name": "title", "type": "String", "required": true }],
      "crud": true,
      "rbacTasks": true
    }
  }
}
```

- Written by `createModel` / updated by `editModel`.
- Regeneration (edit and switch) reads the manifest — never regex-parses source.
- `parseExistingModel` survives only as a **one-time importer for mongodb projects**
  (all pre-3.2 projects are mongodb; it populates the manifest with a warning). Import
  rules: skip the built-in set (User, Role, AuditLog, Document, TinyUrl) and `index.ts` —
  the built-ins match the parser regex too, and ingesting them would regenerate them as
  generic CRUD models, clobbering the auth services; tolerate per-file parse failures with
  a warning instead of aborting. Drizzle sources are **never parsed** — a postgres project
  with a missing manifest is a hard error telling the user to restore `koti.config.json`.
- Both existing parser call sites move to manifest-first reads: `editModel` itself and the
  `koti model:edit` current-fields display (`cli.ts` ~459), which would otherwise
  hard-fail on a Drizzle model file. This retires the fragile-parser bug class
  (Mixed-parses-as-"Schema", nested braces, double-space assertions).

## 7. CLI, MCP, and `db:switch`

### 7.1 `koti new`

`--database <mongodb|postgres>` cloned from the `--framework` pattern: flag wins →
TTY-guarded prompt → silent default `mongodb`. Validated against `DATABASES`.
`koti.config.json` records the choice. Post-create next-steps text becomes DB-conditional
("Start MongoDB" vs "createdb + npm run db:migrate").

### 7.2 `koti db:switch <database>` (CLI) / `switch_database` (MCP)

Algorithm:

1. `resolveProject`; validate target ∈ `DATABASES` and target ≠ current.
2. Load manifest; if absent **and the current database is mongodb**, import per §6.4
   (built-ins and `index.ts` skipped, per-file failures warn). A manifest-less postgres
   project is a hard error (§6.4).
3. Back up to `.bak` **everything step 4–5 will overwrite**: `config/database.ts`,
   `src/models/*`, the five built-in services *plus every manifest model's generated
   service*, `src/validators/*` for manifest models, `seeds/*`, and (when leaving PG)
   `drizzle.config.ts` + the migrations dir — the `model:edit` backup convention applied
   to the whole set.
4. Copy `templates/db/<target>/src` overlay. When switching **back to** postgres, restore
   the project's prior migrations dir + meta artifacts from `.bak` if present; otherwise
   the shipped initial migration starts fresh.
5. Regenerate every manifest model + its CRUD service + validators in the target idiom.
   Barrels are rebuilt as **db-overlay built-in exports + one appended line per manifest
   model** (updateIndexExport semantics, DB-conditional line shape per §6.3) — never
   wholesale from the manifest alone; regenerated CRUD services re-append their services
   barrel lines. Controllers/routes untouched (framework axis).
6. package.json: remove old DB deps/scripts, merge new (deterministic merge).
7. `.env`/`.env.example`: old connection line kept as a comment; new DB line appended.
8. Update `koti.config.json.database`.
9. Print checklist: install deps; on postgres targets run `npm run db:generate` (captures
   manifest models not in the shipped migration) then `npm run db:migrate`; start the DB;
   re-seed. Stated plainly in output and docs: **drizzle migration history is not
   preserved across a round-trip** unless step 4 restored it — switching back otherwise
   targets a fresh database.

**Ownership rule (documented):** db-owned files are overwritten-with-backup, exactly like
`model:edit`. User code outside the db-owned set is never touched. Switch does not move data.

### 7.3 MCP surface

- `create_project` gains `database: z.enum(['mongodb','postgres']).optional().default('mongodb')`.
- New tool `switch_database` (tool count 9 → 10; manifest.json hand-synced; **both**
  exactly-9 assertions in `mcp-server.test.ts` updated — the sorted tools/list name array
  and the `length === 9` aliveness check inside the create_task error test).
- Tool/resource descriptions go DB-neutral ("Mongoose model" → "data model", etc.).
- `scaffold-api` prompt gains an "ask which database, pass the `database` parameter" step
  (otherwise assistants silently default).
- `seed_database` body unchanged (delegates to `npm run seed`); description updated.

## 8. Testing

**Static tier (mandatory, extends the existing vitest suite — currently 127 tests):**

- `makeFakeProject(framework, database)` — fixture parameterized on both axes; `database`
  key in fixture koti.config.json; per-DB dep sets.
- `crud-drizzle.test.ts` — emitter twins mirroring `crud-express/elysia.test.ts` (exact-string
  assertions for table/service output), plus a regression test for the mongoose
  ObjectId-emission fix (§6.2 †).
- `context.test.ts` — three-tier database detection (explicit / sniffed / unknown→`UNSUPPORTED_DATABASE`;
  missing→mongodb+warning).
- `project.test.ts` — 2×2 scaffold matrix: koti.config.json keys, dep sets, and
  **zero `mongoose` imports in a postgres project** (mirror of v3.0.0's zero-express check).
- Security content locks ported to PG templates (awaited verify, HS256, no fallback secrets,
  canonical refresh-secret env names).
- `db-switch.test.ts` — scaffold mongo → switch to postgres → assert files/deps/manifest/env;
  round-trip back; `.bak` presence including validators; barrels keep the built-in exports
  through the round trip; pre-3.2 import path skips built-ins and survives an unparsable
  model file; switch on a manifest-less postgres project hard-errors.
- MCP suite: tool list = 10; `create_project` with `database: 'postgres'`; models resource on a PG project.
- Wire-parity checks: generated response serializers emit identical JSON keys across DBs.

**Runtime tier (best-effort, per Elysia-support.md §7b precedent):** testcontainers or a
local Postgres is the primary mechanism — migrate, seed, CRUD through the generated PG
service. pglite **cannot** back the generated pg-Pool config directly (it needs the
`drizzle-orm/pglite` driver or a socket bridge with single-connection pooling); if used at
all, it tests emitted SQL/service logic against an injected db instance, not the shipped
connection module. Static tier gates the release; runtime tier is pursued but not blocking.

**Guarded hazards:** interactive stdin arrays don't shift (the database prompt is
TTY-guarded with a non-interactive default, and the field-type menu is unchanged);
`commands.test.ts` fixtures updated where the mongoose-dep sniff was load-bearing.

## 9. Docs & release chores

- README / QUICK_START / manifest.json / package.json descriptions & keywords: DB-neutral
  or dual wording; README gets a Database Choice section; no capability advertised before
  it ships (the UUID-claim lesson — content-locked in cli.test.ts). **This release inverts
  the UUID lock:** cli.test.ts currently *forbids* "UUID Primary Keys" claims in the
  README — retire/rescope that assertion, since the capability now ships.
- Sweep koti's own user-facing strings beyond docs: `cli.ts` program description
  ("Express and MongoDB"), the `koti model` success text ("Model with Mongoose schema"),
  `koti new` next-steps, and the MCP `ok()` result messages — all DB-conditional or neutral.
- manifest.json tool list hand-synced to 10 (no automated cross-check exists; noted).
- `build-mcpb` allowlist **unchanged** — Drizzle is a generated-project dependency, never
  a koti runtime dependency. New `templates/db/` ships automatically (whole `templates/`
  dir is bundled and in package.json `files`); `cli.test.ts` required-files list updated:
  add `templates/db/**` anchors, and move the three anchors that follow their files into
  the db layer — `templates/express/src/config/database.ts` (the only database.ts pinned
  today), `templates/shared/src/models/User.ts`, and
  `templates/shared/src/services/authService.ts`.
- Delete legacy `npm-package.json` (+ its `update-version.js` line + PUBLISHING_GUIDE rows).
- Delete `templates/express/crud-template/` — mongoose-idiom legacy, never copied into
  projects and unreferenced since the generators moved to `src/generators/crud/`; it
  violates the single-axis rule and ships dead weight in both bundles.
- Version: **3.2.0** via `version.json` → `npm run update-version`.

## 10. Future work (the "compete with AdonisJS" ladder — explicitly out of scope here)

1. **v3.3+:** pg-boss job-queue scaffold; transactional-outbox pattern generator;
   runtime test harness graduation (pglite/testcontainers as a supported tier).
2. **Later:** SSR/storefront template; relation-aware modeling (FieldSpec `ref` targets →
   real FKs and typed populate/join helpers); Bun-native SQL driver option.

Koti's positioning stays *scaffolder, not framework*: developers own every generated line.

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| PG service ports subtly change API behavior | Wire-parity tests on serializer output; endpoint/response-shape checklist in the implementation plan |
| Manifest and disk drift (user hand-edits models) | Manifest is authoritative for regeneration; `.bak` backups; drift detection via the old parser is future work |
| Old projects (pre-3.2) lack manifest & database key | Defaults + importer path, both warned and tested |
| Doubling template maintenance | Axis discipline keeps it F+D; parity-notes convention; shared services stay single-sourced where truly neutral |
| Suite wall-time growth | Only DB-axis suites gain the second dimension; scaffold matrix reuses `skipInstall` |
| `.mcpb`/npm bundle misses new templates | Bundled via existing whole-dir inclusion; asserted in cli.test.ts required-files |
