# Database Choice (MongoDB or Postgres) Implementation Plan — v3.2.0

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Koti generates projects on MongoDB *or* Postgres (developer's choice at `koti new`, switchable any time via `koti db:switch`), with full feature parity across both databases and both frameworks.

**Architecture:** Axis-disciplined template layers — framework (`templates/express|elysia`), database (`templates/db/mongodb|postgres`), neutral (`templates/shared`) — composed at scaffold time; DB-specific code generation via twin emitters (`crud/mongoose/*`, `crud/drizzle/*`) selected by `ctx.database`; a models manifest in `koti.config.json` makes regeneration (edit + switch) authoritative without parsing generated source.

**Tech Stack:** TypeScript, commander, fs-extra, zod, @modelcontextprotocol/sdk (koti itself — unchanged); Drizzle ORM + node-postgres `pg` + drizzle-kit (generated PG projects only); vitest.

**Spec:** `docs/superpowers/specs/2026-08-06-database-choice-design.md` — read it before starting. Section references (§) below point there.

## Global Constraints

- Work on branch `feature/database-choice`. Commit after every task. **Never push. Never switch to or commit on main/master/prod/qa or any restricted branch.**
- `FIELD_TYPES` stays exactly `['String','Number','Date','Boolean','ObjectId','Array','Mixed','JSON']` in this order — CLI menu numbers, MCP z.enum, and `context.test.ts:22` depend on it.
- API wire shapes are identical across databases: responses carry `id` (string), never `_id`; secrets (`password`, `refreshTokens`, reset/verification tokens) never serialize.
- Every template file is single-axis: framework-owned, db-owned, or neutral. No file may import mongoose outside `templates/db/mongodb/`.
- Drizzle/pg deps are generated-project deps only — never add them to koti's own `package.json` or the `build-mcpb.js` requiredDeps allowlist.
- Version floors in generated PG projects: `drizzle-orm ^0.44`, `drizzle-kit ^0.31`, `pg ^8.16`, `@types/pg ^8.15`; PG ≥ 13 assumed (`gen_random_uuid()`).
- Non-interactive defaults everywhere: `koti new` without `--database` on a non-TTY stdin silently defaults to `mongodb` (the `--framework` precedent, `cli.ts:376-391`) — the test suite depends on never being prompted.
- Keep files under 500 lines (repo rule). The PG service ports must respect this — split helpers out if a port grows past it.
- TDD: every task writes its failing test first, sees it fail, implements, sees it pass, commits.
- After each task: `npx vitest run` must be green before commit (existing 127 tests + everything added so far).

---

## Phase 1 — Foundations (pure refactor; every task leaves the suite green; still mongo-only)

### Task 1: `Database` axis in the generator context

**Files:**
- Modify: `src/generators/context.ts` (types at 5-9, ProjectContext ~37-41, resolveProject 84-119, error message 118)
- Modify: `tests/helpers/fakeProject.ts` (signature line 5, deps line 11, config lines 16-18)
- Test: `tests/generators/context.test.ts`

**Interfaces:**
- Consumes: existing `Framework`, `FRAMEWORKS`, `ProjectContext { root, framework, warnings }`, `GeneratorError`.
- Produces (all later tasks rely on these exact names):
  ```ts
  export type Database = 'mongodb' | 'postgres';
  export const DATABASES = ['mongodb', 'postgres'] as const;
  export interface ProjectContext { root: string; framework: Framework; database: Database; warnings: string[]; }
  // GeneratorError gains code 'UNSUPPORTED_DATABASE'
  ```

- [x] **Step 1: Write the failing tests** — append to `tests/generators/context.test.ts`:

```ts
describe('resolveProject database detection', () => {
  it('reads database from koti.config.json', async () => {
    const root = await makeFakeProject('express', 'postgres');
    const ctx = await resolveProject(root);
    expect(ctx.database).toBe('postgres');
    expect(ctx.warnings).toHaveLength(0);
  });

  it('defaults missing database key to mongodb with a warning (pre-3.2 project)', async () => {
    const root = await makeFakeProject('express'); // helper writes config WITHOUT database when arg omitted
    const ctx = await resolveProject(root);
    expect(ctx.database).toBe('mongodb');
    expect(ctx.warnings.some(w => w.includes('database'))).toBe(true);
  });

  it('hard-fails on unknown database value', async () => {
    const root = await makeFakeProject('express');
    const cfg = JSON.parse(await fs.readFile(path.join(root, 'koti.config.json'), 'utf8'));
    cfg.database = 'postgress'; // typo
    await fs.writeFile(path.join(root, 'koti.config.json'), JSON.stringify(cfg));
    await expect(resolveProject(root)).rejects.toMatchObject({ code: 'UNSUPPORTED_DATABASE' });
  });

  it('sniffs postgres from drizzle-orm/pg deps when config is absent', async () => {
    const root = await makeFakeProject('express', 'postgres');
    await fs.remove(path.join(root, 'koti.config.json'));
    const ctx = await resolveProject(root);
    expect(ctx.database).toBe('postgres');
    expect(ctx.warnings.length).toBeGreaterThan(0); // inferred → warned
  });

  it('sniffs mongodb from mongoose dep when config is absent', async () => {
    const root = await makeFakeProject('express', 'mongodb');
    await fs.remove(path.join(root, 'koti.config.json'));
    const ctx = await resolveProject(root);
    expect(ctx.database).toBe('mongodb');
  });
});
```

- [x] **Step 2: Update the fixture** — `tests/helpers/fakeProject.ts`:

```ts
export async function makeFakeProject(
  framework: 'express' | 'elysia',
  database?: 'mongodb' | 'postgres',   // undefined = pre-3.2 fixture: no database key, mongoose dep
) {
  // ...existing dir setup unchanged...
  const deps: Record<string, string> =
    framework === 'elysia' ? { elysia: '^1.0.0' } : { express: '^4.18.0' };
  if (database === 'postgres') { deps['drizzle-orm'] = '^0.44.0'; deps['pg'] = '^8.16.0'; }
  else { deps['mongoose'] = '^8.0.0'; }
  // package.json written with deps as before
  const config: Record<string, unknown> = { framework, kotiVersion: '3.1.0' };
  if (database) config.database = database;
  // koti.config.json written as before
}
```
Every existing call site compiles unchanged (`database` optional). Existing detection tests must stay green — the pre-3.2 fixture still carries the mongoose dep they rely on.

- [x] **Step 3: Run tests, verify the 5 new ones fail** — `npx vitest run tests/generators/context.test.ts`. Expected: new describe block fails (`ctx.database` undefined / no UNSUPPORTED_DATABASE).

- [x] **Step 4: Implement in `context.ts`:**

```ts
export type Database = 'mongodb' | 'postgres';
export const DATABASES = ['mongodb', 'postgres'] as const;
```
Add `'UNSUPPORTED_DATABASE'` to the GeneratorError code union. Add `database: Database` to `ProjectContext`. In `resolveProject`:
- config path: `if (config.database === undefined) { database = 'mongodb'; warnings.push("koti.config.json has no \"database\" key (pre-3.2 project) — assuming mongodb. Run koti db:switch or add the key to silence this."); } else if (!DATABASES.includes(config.database)) { throw new GeneratorError('UNSUPPORTED_DATABASE', `Unknown database "${config.database}" in koti.config.json. Supported: ${DATABASES.join(', ')}`); } else { database = config.database; }`
- sniff path (config absent, existing fallback block at 105-118): frameworks sniff as today (elysia dep → elysia; express dep → express); database: `deps['drizzle-orm'] || deps.pg ? 'postgres' : deps.mongoose ? 'mongodb' : 'mongodb'` — and drop `deps.mongoose` from the *framework* condition at line 114 (`deps.express || deps.mongoose` becomes `deps.express || deps.mongoose || deps.pg || deps['drizzle-orm']` so DB-only dep sets still mark a koti project with framework defaulting to express + warning). Update the NOT_KOTI_PROJECT message at 118 to name `express/elysia/mongoose/drizzle-orm/pg`.

- [x] **Step 5: Run the full suite** — `npx vitest run`. Expected: all green (127 + 5).

- [x] **Step 6: Commit** — `git add -A && git commit -m "feat(context): Database axis — type, detection, UNSUPPORTED_DATABASE"`

---

### Task 2: Re-layer templates — extract `templates/db/mongodb/`, delete dead files

**Files:**
- Move (git mv): `templates/shared/src/models/*` → `templates/db/mongodb/src/models/`; `templates/shared/src/services/{authService,userService,auditService,documentService,tinyUrlService}.ts` + `services/index.ts` → `templates/db/mongodb/src/services/`; `templates/shared/src/seeds/*` → `templates/db/mongodb/src/seeds/`; `templates/express/src/config/database.ts` → `templates/db/mongodb/src/config/database.ts`
- Delete: `templates/elysia/src/config/database.ts` (byte-identical duplicate), `templates/express/src/middleware/auditMiddleware.ts` (dead, mongoose-coupled), `templates/express/crud-template/` (legacy, unreferenced)
- Modify: `src/generators/project.ts` (copy block 374-391: add db-layer overlay), `templates/db/mongodb/src/models/index.ts` (complete + fix barrel)
- Test: `tests/cli.test.ts` (required-files list 93-113), `tests/generators/project.test.ts`

**Interfaces:**
- Produces: scaffold copy order **framework src → shared src → `templates/db/<ctx.database>/src`** (each `fs.pathExists`-guarded, later layer wins). All Phase-1 scaffolds use `database = 'mongodb'`.
- Produces: complete mongodb models barrel (later tasks' switch tests assert built-ins survive):

```ts
export { default as User, IUser } from './User';
export { default as Role, IRole } from './Role';
export { default as AuditLog, IAuditLog } from './AuditLog';
export { default as Document, IDocument } from './Document';
export { default as TinyUrl, ITinyUrl } from './TinyUrl';
```
(Verify each model's actual default/named exports first — `IUser` etc. are named type exports in the model files; the old barrel's phantom named `User` re-export bug must not be reproduced.)

- [x] **Step 1: Write failing test updates** — in `tests/cli.test.ts` required-files list: replace `templates/express/src/config/database.ts`, `templates/shared/src/models/User.ts`, `templates/shared/src/services/authService.ts` with `templates/db/mongodb/src/config/database.ts`, `templates/db/mongodb/src/models/User.ts`, `templates/db/mongodb/src/services/authService.ts`; add `templates/db/mongodb/src/seeds/seed.ts`. In `tests/generators/project.test.ts` add:

```ts
it('scaffolded express project still contains the db-owned files', async () => {
  const dir = await createTestProject('express'); // existing helper pattern with skipInstall: true
  for (const f of ['src/config/database.ts', 'src/models/User.ts', 'src/services/authService.ts', 'src/seeds/seed.ts']) {
    expect(await fs.pathExists(path.join(dir, f))).toBe(true);
  }
  expect(await fs.pathExists(path.join(dir, 'src/middleware/auditMiddleware.ts'))).toBe(false);
});
```

- [x] **Step 2: Run** — `npx vitest run tests/cli.test.ts tests/generators/project.test.ts`. Expected: FAIL (paths don't exist yet / auditMiddleware still copied).

- [x] **Step 3: Execute the moves** exactly as listed in Files (use `git mv`; create `templates/db/mongodb/src/` first). Fix the barrel as shown in Interfaces. Delete the three dead paths.

- [x] **Step 4: Wire the db overlay in `project.ts`** — after the shared overlay copy (383-387), add:

```ts
const dbTemplateSrc = path.join(templatesDir(), 'db', database, 'src');
if (await fs.pathExists(dbTemplateSrc)) {
  await fs.copy(dbTemplateSrc, path.join(projectPath, 'src'));
}
```
For this task `database` is the literal `'mongodb'` (the parameter arrives in Task 12) — declare `const database = 'mongodb' as const;` at the top of `createProject` with a `// widened to a parameter in the --database task` comment.

- [x] **Step 5: Run the full suite** — `npx vitest run`. Expected: green. The `commands.test.ts` full-scaffold test exercises the new copy path for real.

- [x] **Step 6: Commit** — `git commit -am "refactor(templates): extract db/mongodb layer; delete dead auditMiddleware + crud-template"`

---

### Task 3: Connection-lifecycle seam — `connectDB`/`closeDB`/`isValidId`

**Files:**
- Modify: `templates/db/mongodb/src/config/database.ts`, `templates/express/src/server.ts` (lines 9, 90), `templates/elysia/src/server.ts` (lines 5, 80), `templates/express/src/controllers/auditController.ts` (18, 24, 55, 92), `templates/elysia/src/controllers/auditController.ts` (1, 12, 18, 38, 57), `templates/db/mongodb/src/services/auditService.ts` (interface at 4-8), `templates/db/mongodb/src/seeds/seed.ts` + `seedRoles.ts` (mongoose.connection.close → closeDB)
- Test: `tests/cli.test.ts` (new static content locks)

**Interfaces:**
- Produces — the db-layer module contract every framework file compiles against (PG implements the same in Task 7):

```ts
// templates/db/<database>/src/config/database.ts must export:
export const connectDB: () => Promise<void>;
export const closeDB: () => Promise<void>;
export const isValidId: (id: string) => boolean;   // mongodb: Types.ObjectId.isValid; postgres: uuid regex
```
- Produces: `AuditLogEntry` fields `userId`/`entityId` become `string` (were `Types.ObjectId`) — all callers pass strings from here on.

- [x] **Step 1: Write failing static locks** — add to the `cli.test.ts` security/template block:

```ts
// globTsFiles lives in tests/helpers/glob.ts (recursive .ts collection) — Tasks 12 and 14 import it too
it('framework layers never import mongoose (single-axis rule)', async () => {
  for (const dir of ['templates/express/src', 'templates/elysia/src', 'templates/shared/src']) {
    const files = await globTsFiles(dir);
    for (const f of files) {
      expect(await fs.readFile(f, 'utf8'), `${f} imports mongoose`).not.toMatch(/from 'mongoose'/);
    }
  }
});
it('db config exports the lifecycle contract', async () => {
  const src = await fs.readFile('templates/db/mongodb/src/config/database.ts', 'utf8');
  for (const name of ['connectDB', 'closeDB', 'isValidId']) expect(src).toContain(`export const ${name}`);
});
```

- [x] **Step 2: Run — expect FAIL** (server.ts ×2 and audit controllers ×2 still import mongoose).

- [x] **Step 3: Implement the seam.** `database.ts` adds `export const closeDB = async (): Promise<void> => { await mongoose.connection.close(); };` and `export const isValidId = (id: string): boolean => Types.ObjectId.isValid(id);`. Both `server.ts` files: drop the mongoose import, import `{ connectDB, closeDB }`, graceful shutdown calls `await closeDB()` (connect timing untouched: express fire-and-forget at 35, elysia top-level await at 15). Audit controllers: replace `Types.ObjectId.isValid(x)` with `isValidId(x)` imported from `'../config/database'`, drop casts, pass plain strings. `auditService.ts`: `AuditLogEntry.userId/entityId: string`; internal writes let Mongoose cast strings to ObjectId (it does this natively for ObjectId schema paths). Seeds: import `closeDB` and call it in `finally`.

- [x] **Step 4: Full suite green** — `npx vitest run`.
- [x] **Step 5: Commit** — `git commit -am "refactor(templates): connection-lifecycle + id-validation seam (connectDB/closeDB/isValidId)"`

---

### Task 4: Auth-path seam — `getUserWithRoles` + passport delegation

**Files:**
- Modify: `templates/db/mongodb/src/services/userService.ts` (new function), `templates/express/src/middleware/authorize.ts` (line 30), `templates/express/src/middleware/checkPermission.ts` (45-46), `templates/elysia/src/middleware/auth.ts` (line 44), `templates/express/src/config/passport.ts` (verify callback 20-51)
- Test: `tests/cli.test.ts` (extend the single-axis lock)

**Interfaces:**
- Produces (PG userService implements the identical signature in Task 9):

```ts
// userService — both db layers
export interface UserWithRoles {
  id: string;
  isActive: boolean;
  roles: Array<{ name: string; tasks: string[]; isActive: boolean }>;
}
export async function getUserWithRoles(id: string): Promise<UserWithRoles | null>;
```
- Consumes: `authService.googleAuth(profile)` — already exists in the mongo authService (lines ~125-150); passport now delegates to it (the elysia `oauth.ts` precedent).

- [x] **Step 1: Extend the failing lock** — add to the single-axis test's assertions:

```ts
// middleware must not query models directly — RBAC goes through userService
for (const f of ['templates/express/src/middleware/authorize.ts',
                 'templates/express/src/middleware/checkPermission.ts',
                 'templates/elysia/src/middleware/auth.ts',
                 'templates/express/src/config/passport.ts']) {
  const src = await fs.readFile(f, 'utf8');
  expect(src, `${f} touches User model directly`).not.toMatch(/User\.(findById|findOne)|from '..\/models/);
}
```

- [x] **Step 2: Run — expect FAIL** (all four files hit the pattern).

- [x] **Step 3: Implement.** `getUserWithRoles` in mongo userService: `const user = await User.findById(id).populate<{ roles: IRole[] }>('roles').lean(); if (!user) return null; return { id: String(user._id), isActive: user.isActive, roles: (user.roles ?? []).map(r => ({ name: r.name, tasks: r.tasks ?? [], isActive: r.isActive ?? true })) };`. Rewire the three middleware files to call it (imports via `'../services/userService'`), preserving each file's existing SUPER_ADMIN / task-check logic on the returned shape. `passport.ts`: verify callback body becomes `const user = await authService.googleAuth({ googleId: profile.id, email, firstName, lastName }); done(null, user);` matching authService.googleAuth's existing parameter shape (read it first and match exactly); `deserializeUser` uses `getUserWithRoles`.

- [x] **Step 4: Full suite green.** The security-hardening locks (`cli.test.ts:141-150`) must still pass untouched.
- [x] **Step 5: Commit** — `git commit -am "refactor(templates): RBAC + OAuth read through userService/authService seam"`

---

### Task 5: Models manifest in `koti.config.json`

**Files:**
- Modify: `src/generators/context.ts` (new types + helpers), `src/generators/model.ts` (createModel writes manifest; editModel + cli display read manifest-first; parseExistingModel importer rules), `src/cli.ts` (line ~459 display path)
- Test: `tests/generators/model.test.ts`, `tests/generators/edit-model.test.ts`

**Interfaces:**
- Produces (switch in Task 14 consumes exactly these):

```ts
// context.ts
export interface ModelManifestEntry { fields: FieldSpec[]; crud: boolean; rbacTasks: boolean; }
export async function readModelManifest(root: string): Promise<Record<string, ModelManifestEntry>>;
export async function upsertModelManifest(root: string, name: string, entry: ModelManifestEntry): Promise<void>;
export const BUILTIN_MODELS = ['User', 'Role', 'AuditLog', 'Document', 'TinyUrl'] as const;
// model.ts
export async function importManifestFromSource(root: string): Promise<{ imported: string[]; warnings: string[] }>;
```

> Signature note: the option shapes in these tests (`createModel({ projectRoot, name, fields, crud, rbacTasks })`, `editModel({ projectRoot, name, addFields, removeFields, updateCrud })`) must match the *actual* exported signatures — check `src/generators/model.ts` and the canonical calls in `src/mcp-server.ts` (create_model ~line 160, edit_model ~line 185) before writing the tests, and adjust parameter names to what exists.

- [x] **Step 1: Failing tests:**

```ts
// model.test.ts
it('createModel records the model in the koti.config.json manifest', async () => {
  const root = await makeFakeProject('express', 'mongodb');
  await createModel({ projectRoot: root, name: 'Product', fields: [{ name: 'title', type: 'String', required: true }], crud: true, rbacTasks: false });
  const cfg = JSON.parse(await fs.readFile(path.join(root, 'koti.config.json'), 'utf8'));
  expect(cfg.models.Product).toEqual({ fields: [{ name: 'title', type: 'String', required: true }], crud: true, rbacTasks: false });
});

// edit-model.test.ts
it('editModel reads fields from the manifest, not the source file', async () => {
  const root = await makeFakeProject('express', 'mongodb');
  await createModel({ projectRoot: root, name: 'Widget', fields: [{ name: 'title', type: 'String' }], crud: false, rbacTasks: false });
  const modelPath = path.join(root, 'src/models/Widget.ts');
  await fs.writeFile(modelPath, '// user mangled this file beyond parsing\n');
  await editModel({ projectRoot: root, name: 'Widget', addFields: [{ name: 'count', type: 'Number' }], removeFields: [], updateCrud: false });
  const cfg = JSON.parse(await fs.readFile(path.join(root, 'koti.config.json'), 'utf8'));
  expect(cfg.models.Widget.fields.map((f: FieldSpec) => f.name)).toEqual(['title', 'count']);
  expect(await fs.readFile(modelPath, 'utf8')).toContain('count'); // regenerated from manifest
});

it('importManifestFromSource skips built-ins and index.ts, tolerates parse failures', async () => {
  const root = await makeFakeProject('express', 'mongodb');
  // simulate a pre-3.2 project: user model on disk, no manifest
  await createModel({ projectRoot: root, name: 'Legacy', fields: [{ name: 'note', type: 'String' }], crud: false, rbacTasks: false });
  const cfg = JSON.parse(await fs.readFile(path.join(root, 'koti.config.json'), 'utf8'));
  delete cfg.models;
  await fs.writeFile(path.join(root, 'koti.config.json'), JSON.stringify(cfg));
  await fs.copy('templates/db/mongodb/src/models/User.ts', path.join(root, 'src/models/User.ts')); // built-in present
  await fs.writeFile(path.join(root, 'src/models/Broken.ts'), 'not a schema at all');
  const { imported, warnings } = await importManifestFromSource(root);
  expect(imported).toEqual(['Legacy']);
  expect(warnings.some(w => w.includes('Broken'))).toBe(true);
});
```

- [x] **Step 2: Run — expect FAIL** (no manifest written; editModel still parses source; importer doesn't exist).

- [x] **Step 3: Implement.** `readModelManifest`/`upsertModelManifest` read-modify-write `koti.config.json` (preserve unknown keys). `createModel` calls `upsertModelManifest` after writing files. `editModel`: fields come from `readModelManifest(...)[name]` when present, else falls back to `parseExistingModel` **and** immediately backfills the manifest; the resulting field list is upserted after the edit. `importManifestFromSource`: glob `src/models/*.ts`, skip `index.ts` + `BUILTIN_MODELS`, run `parseExistingModel` per file inside try/catch collecting warnings, upsert each success with `{ fields, crud: <sniff route file exists>, rbacTasks: <existing 'auth: [Task.'|'checkPermission(' sniff from model.ts:269> }`. `cli.ts:459`: current-fields display reads the manifest first, falling back to the parser only when the manifest lacks the model.

- [x] **Step 4: Full suite green.** The exact-string edit-model regression at `edit-model.test.ts:81` must still pass (regeneration output is unchanged — only the *source of fields* moved).
- [x] **Step 5: Commit** — `git commit -am "feat(generators): models manifest in koti.config.json; manifest-first edits"`

---

### Task 6: Move Mongoose emitters + fix the ObjectId emission bug

**Files:**
- Move (git mv): `src/generators/crud/modelFile.ts` → `src/generators/crud/mongoose/modelFile.ts`; `src/generators/crud/service.ts` → `src/generators/crud/mongoose/service.ts`
- Modify: `src/generators/model.ts` (imports), `src/generators/crud/mongoose/modelFile.ts` (line ~26-27)
- Test: `tests/generators/crud-express.test.ts`

**Interfaces:**
- Produces: `generateTypeScriptModel(modelName: string, fields: FieldSpec[]): string` and `generateCRUDService(modelName: string, fields: FieldSpec[]): string` — same signatures, new module paths `../crud/mongoose/modelFile` / `../crud/mongoose/service`.

- [x] **Step 1: Failing test** (this is the live-bug regression, spec §6.2 †):

```ts
it('emits Schema.Types.ObjectId for ObjectId fields (regression: bare ObjectId was unbound)', () => {
  const out = generateTypeScriptModel('Order', [{ name: 'ownerId', type: 'ObjectId', required: true }]);
  expect(out).toContain('ownerId: { type: Schema.Types.ObjectId,  required: true }');
  expect(out).not.toMatch(/type: ObjectId[,\s}]/);
  expect(out).toContain('ownerId: Types.ObjectId;'); // interface side unchanged
});
```

- [x] **Step 2: Run — expect FAIL** (`type: ObjectId` emitted today).
- [x] **Step 3: Implement** — in the moved `modelFile.ts`, the type emission (old lines 26-27) becomes: Mixed/JSON → `Schema.Types.Mixed` (existing), **ObjectId → `Schema.Types.ObjectId` (new)**, everything else verbatim. Update `model.ts` import paths. Preserve the double-space emission convention exactly (edit-model.test.ts:81 asserts it).
- [x] **Step 4: Full suite green.**
- [x] **Step 5: Commit** — `git commit -am "fix(generators): ObjectId fields emit Schema.Types.ObjectId; emitters move to crud/mongoose/"`

---

### Task 7: Scaffold-time composition — `package.deps.json` + `env.fragment`

**Files:**
- Create: `templates/db/mongodb/package.deps.json`, `templates/db/mongodb/env.fragment`, `templates/db/mongodb/readme.fragment.md` (the "start MongoDB" setup prose lifted from `templates/express/README.md:62-75`)
- Modify: `templates/express/package.json` (remove `mongoose` dep line 16, `@types/mongoose` line 49, seed scripts stay), `templates/elysia/package.json` (remove `mongoose` line 21), `templates/express/.env` + `.env.example` + `templates/elysia/.env` + `.env.example` (remove the MONGODB_URI line — replaced by fragment insertion; **keep exactly two `REPLACE_WITH_AUTO_GENERATED_SECRET` tokens in the same order**), `src/generators/project.ts` (merge + insert logic)
- Test: `tests/generators/project.test.ts`

**Interfaces:**
- Produces — fragment contracts (PG ships its own pair in Task 8):

```jsonc
// templates/db/mongodb/package.deps.json
{ "dependencies": { "mongoose": "^8.0.0" }, "devDependencies": {}, "scripts": {} }
```
```bash
# templates/db/mongodb/env.fragment
MONGODB_URI=mongodb://localhost:27017/{{PROJECT_NAME}}
```
- Produces in `project.ts`: `applyDbFragments(projectPath: string, database: Database, framework: Framework): Promise<void>` — merges deps/devDeps/scripts into the project package.json (framework-conditional script values: a script value may be an object `{ "express": "npx ts-node …", "elysia": "bun run …" }`, resolved by framework at merge time), inserts the env fragment (with `{{PROJECT_NAME}}` replaced) under the `# Database` section of both `.env` and `.env.example`, and — express only, since elysia ships no README — replaces a `<!-- DB_SETUP -->` marker in the copied project README with `readme.fragment.md` (add the marker to `templates/express/README.md` in place of the MongoDB setup prose at lines 62-75). Spec §4.2 last seam row.

- [x] **Step 1: Failing tests:**

```ts
it('scaffold merges db deps and env fragment (mongodb)', async () => {
  const dir = await createTestProject('express');
  const pkg = JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf8'));
  expect(pkg.dependencies.mongoose).toBeDefined();
  expect(pkg.devDependencies['@types/mongoose']).toBeUndefined();
  const env = await fs.readFile(path.join(dir, '.env'), 'utf8');
  expect(env).toMatch(/MONGODB_URI=mongodb:\/\/localhost:27017\//);
  expect(env).not.toContain('REPLACE_WITH_AUTO_GENERATED_SECRET'); // secret contract intact
});
```

- [x] **Step 2: Run — expect FAIL** (mongoose still in framework package.json is fine, but env fragment insertion doesn't exist; the assertion on `@types/mongoose` fails).
- [x] **Step 3: Implement** `applyDbFragments` in `project.ts`, called after the db overlay copy and before secret injection (secret replacement at 454-455 must run on the *final* .env). JSON merge: read project package.json, `Object.assign` each of dependencies/devDependencies; scripts resolve framework-conditional object values. Env insert: if the template `.env` still contains a `MONGODB_URI` line (it shouldn't after this task), replace it; else append the fragment after the `PORT` line. Also branch the code-resident fallback `.env` block (project.ts:430-451): keep its two secret tokens, make the DB line come from the fragment file.
- [x] **Step 4: Full suite green** — pay attention to `project.test.ts:20-21` (zero leftover secret tokens + 128-hex JWT_SECRET).
- [x] **Step 5: Commit** — `git commit -am "feat(scaffold): per-db package.deps.json + env.fragment composition"`

**Phase-1 exit criterion:** `npx vitest run` fully green; a scaffolded express and elysia project each boot exactly as before (manual smoke optional); zero behavior change visible to users.

---

## Phase 2 — Postgres (creates ship-ready PG projects at `koti new`)

### Task 8: PG db layer — config, drizzle.config, fragments, migrations skeleton

**Files:**
- Create: `templates/db/postgres/src/config/database.ts`, `templates/db/postgres/drizzle.config.ts` *(copied to project root at scaffold — extend the copy list in `project.ts` the same way package.json/tsconfig are handled)*, `templates/db/postgres/package.deps.json`, `templates/db/postgres/env.fragment`, `templates/db/postgres/drizzle/` (initial migration `0000_init.sql` + `meta/_journal.json` + `meta/0000_snapshot.json` — generated in Step 3, not hand-written)
- Test: `tests/cli.test.ts` (required-files + lifecycle-contract locks extended to postgres)

**Interfaces:**
- Produces — same lifecycle contract as mongodb (Task 3) plus the Drizzle handle all PG services consume:

```ts
// templates/db/postgres/src/config/database.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to .env (see .env.example).');
}
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);
export const connectDB = async (): Promise<void> => { await pool.query('SELECT 1'); console.log('✅ PostgreSQL connected'); };
export const closeDB = async (): Promise<void> => { await pool.end(); };
export const isValidId = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
```
```jsonc
// templates/db/postgres/package.deps.json
{
  "dependencies": { "drizzle-orm": "^0.44.0", "pg": "^8.16.0" },
  "devDependencies": { "drizzle-kit": "^0.31.0", "@types/pg": "^8.15.0" },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "cleanup:urls": { "express": "npx ts-node src/scripts/cleanupUrls.ts", "elysia": "bun run src/scripts/cleanupUrls.ts" }
  }
}
```
```bash
# templates/db/postgres/env.fragment
DATABASE_URL=postgres://postgres:postgres@localhost:5432/{{PROJECT_NAME}}
```
```ts
// templates/db/postgres/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/models/*.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [x] **Step 1: Failing locks** — extend cli.test.ts: required-files gains `templates/db/postgres/src/config/database.ts`, `templates/db/postgres/drizzle.config.ts`, `templates/db/postgres/drizzle/meta/_journal.json`; the lifecycle-contract test loops over both `templates/db/{mongodb,postgres}/src/config/database.ts`.
- [x] **Step 2: Run — expect FAIL.**
- [x] **Step 3: Implement** the files above. Note: the initial migration + meta snapshot are produced by running `npx drizzle-kit generate` against the Task-9 schema — so **write this task's files now, generate the migration at the end of Task 9**, and only then flip the required-files lock for `drizzle/meta/_journal.json` (keep that single assertion commented with a `// enabled after models task` note until then if ordering demands).
- [x] **Step 4: Suite green** (postgres template files exist; nothing consumes them yet).
- [x] **Step 5: Commit** — `git commit -am "feat(templates): postgres db layer skeleton — config, drizzle.config, fragments"`

---

### Task 9: PG models — six tables + barrel + initial migration

**Files:**
- Create: `templates/db/postgres/src/models/{User,Role,UserRole,AuditLog,Document,TinyUrl}.ts`, `templates/db/postgres/src/models/index.ts`
- Create (generated): `templates/db/postgres/drizzle/0000_init.sql`, `templates/db/postgres/drizzle/meta/*`
- Test: `tests/cli.test.ts` (content locks), plus a scratch `tsc --noEmit` check

**Interfaces:**
- Produces — table + type exports all PG services and emitters consume. Full User table (the richest; write the other five to the same pattern, translating each field from the corresponding mongo model per spec §5):

```ts
// templates/db/postgres/src/models/User.ts
import { pgTable, uuid, text, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  password: text('password'),                      // null for OAuth-only accounts; excluded from default selects
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  googleId: text('google_id'),
  isActive: boolean('is_active').notNull().default(true),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  refreshTokens: text('refresh_tokens').array().notNull().default(sql`'{}'`),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: timestamp('password_reset_expires', { withTimezone: true }),
  emailVerificationToken: text('email_verification_token'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('users_google_id_unique').on(t.googleId).where(sql`${t.googleId} IS NOT NULL`),
  index('users_is_active_idx').on(t.isActive),
]);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```
Field inventory for the rest (translate from the mongo models — read each one first): `roles` (name unique, description, tasks `text('tasks').array()`, isActive); `user_roles` (userId uuid FK→users.id, roleId uuid FK→roles.id, composite PK); `audit_logs` (userId uuid, action text, entityType text, entityId uuid, oldValue/newValue `jsonb`, three composite indexes mirroring the mongo ones); `documents` (fileName unique, originalName, mimeType, size, path, s3Key/s3Bucket nullable, metadata `jsonb`, uploadedBy uuid, isDeleted boolean, six indexes per the mongo model); `tiny_urls` (shortCode unique, originalUrl, createdAt — **no TTL: expiry is query-time `WHERE created_at > now() - interval '7 days'` in the service**).
- Barrel: `export * from './User';` … one line per model (drizzle named exports — spec §6.3).

- [x] **Step 1: Failing content lock** — cli.test.ts: postgres User.ts must contain `gen_random_uuid`, `IS NOT NULL` (partial unique), `$onUpdate`; barrel must have six `export * from` lines.
- [x] **Step 2: Run — expect FAIL.**
- [x] **Step 3: Write the six models + barrel.** Then generate the initial migration: in a scratch dir, copy the postgres template, `npm i` the pinned deps, run `npx drizzle-kit generate`; copy the produced `drizzle/` (sql + meta) back into `templates/db/postgres/drizzle/`. Verify `tsc --noEmit` passes in the scratch project (drizzle subpath imports resolve under the express template's node10 resolution — already validated during the sweep).
- [x] **Step 4: Suite green; enable the meta-artifacts lock from Task 8 if deferred.**
- [x] **Step 5: Commit** — `git commit -am "feat(templates): postgres schema — six tables, partial unique googleId, initial migration + meta"`

---

### Task 10: PG services I — serializer, userService, authService

**Files:**
- Create: `templates/db/postgres/src/services/serialize.ts`, `templates/db/postgres/src/services/userService.ts`, `templates/db/postgres/src/services/authService.ts`
- Test: `tests/cli.test.ts` (parity + security locks)

**Interfaces:**
- Consumes: `db`, tables from Tasks 8-9; `tokenUtils`, `AppError`, `types/api` from the neutral shared layer.
- Produces: **function-for-function signature parity with the mongodb services** — before writing, read `templates/db/mongodb/src/services/{userService,authService}.ts` and mirror every exported name, parameter list, and resolved return shape (spec §4.2: parity is defined at the service function level). The serializer is the wire-contract keeper:

```ts
// serialize.ts
const SECRET_FIELDS = ['password', 'refreshTokens', 'passwordResetToken', 'passwordResetExpires', 'emailVerificationToken'] as const;
export function toPublic<T extends Record<string, unknown>>(row: T): Omit<T, (typeof SECRET_FIELDS)[number]> {
  const out = { ...row };
  for (const k of SECRET_FIELDS) delete (out as Record<string, unknown>)[k];
  return out as Omit<T, (typeof SECRET_FIELDS)[number]>;
}
```
Implementation notes that MUST be honored (each maps to a spec §5 bullet):
- Password hashing moves out of the (nonexistent) schema hook: `authService.register`/`resetPassword` call `bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS ?? 12))` explicitly; `comparePassword` is a service-local `bcrypt.compare`.
- Hidden-column discipline: default reads select via `toPublic`; the login path reads the full row (`findByEmailWithPassword` equivalent: `db.select().from(users).where(eq(users.email, email))` then compare, then `toPublic` before returning).
- `getUserWithRoles(id)` returns the exact `UserWithRoles` shape from Task 4 (join through `user_roles` → `roles`).
- Multi-table writes (create user + assign roles; role re-assignment) run in `db.transaction(async (tx) => { … })`.
- Token creation/verification uses the same `tokenUtils` and env names as mongo (HS256 only, no fallback secrets, awaited verification — the v3.0.1 guards, which Step 1 locks).
- `googleAuth(profile)`: find by googleId → link by email → create, inside one transaction — single home for the upsert (passport + elysia oauth both delegate).
- Search/pagination in `getUsers`: `ilike` + `or` over the string columns, `count(*)` for totals — same response envelope (`PaginationResult`) as mongo.

- [x] **Step 1: Failing locks** — cli.test.ts: PG authService must contain `await ` on token verification calls, `HS256`, and must NOT contain fallback-secret patterns (mirror the assertions of the existing security block at 141-150, pointed at the postgres file); parity lock: every `export async function` name present in `templates/db/mongodb/src/services/userService.ts` also appears in the postgres one (cheap regex extraction of `export (async )?function (\w+)` / `export const (\w+)` from both files, compared as sets).
- [x] **Step 2: Run — expect FAIL.**
- [x] **Step 3: Port the two services** per the notes above. Keep each file under 500 lines (move shared helpers into `serialize.ts` or a `queries.ts` sibling if needed).
- [x] **Step 4: Suite green.** Also run the scratch-project `tsc --noEmit` from Task 9 with services included.
- [x] **Step 5: Commit** — `git commit -am "feat(templates): postgres auth + user services with wire-contract serializer"`

---

### Task 11: PG services II — audit, document, tinyUrl, seeds, cleanup script

**Files:**
- Create: `templates/db/postgres/src/services/{auditService,documentService,tinyUrlService}.ts`, `templates/db/postgres/src/seeds/{seed,seedRoles}.ts`, `templates/db/postgres/src/scripts/cleanupUrls.ts`, `templates/db/postgres/src/services/index.ts`
- Test: `tests/cli.test.ts` (parity-lock loop extended to all five services)

**Interfaces:**
- Consumes: Task 8-10 exports. Produces: signature parity with the three mongo services (same parity-lock mechanism as Task 10). Translation specifics (spec §5):
  - `auditService.AuditLogEntry` uses `string` ids (matches Task 3); `getAuditStats` becomes `select({ action: auditLogs.action, count: count() }).from(auditLogs).where(…).groupBy(auditLogs.action)` — two grouped queries mirroring the two mongo pipelines.
  - `documentService`: metadata dot-path query becomes `sql`${documents.metadata}->>'type' = 'profile_image'``; soft-delete via `update … set isDeleted`; pagination identical envelope.
  - `tinyUrlService.resolve`: adds `and(eq(tinyUrls.shortCode, code), gt(tinyUrls.createdAt, sql`now() - interval '7 days'`))` — the TTL replacement; `cleanupUrls.ts` deletes expired rows and is wired to `cleanup:urls` (fragment from Task 8).
  - Seeds: same role/user data and idempotence checks as mongo seeds (read them first), through `db` + `closeDB()` in `finally`; **same filenames** `seed.ts`/`seedRoles.ts` so `seed`/`seed:roles` scripts and MCP `seed_database` work unmodified.
- [x] **Step 1: Extend the failing parity locks to all five services + require `templates/db/postgres/src/seeds/seed.ts` in required-files.**
- [x] **Step 2: Run — expect FAIL.  Step 3: Implement.  Step 4: Suite green + scratch `tsc --noEmit`.**
- [x] **Step 5: Commit** — `git commit -am "feat(templates): postgres audit/document/tinyUrl services, seeds, url cleanup"`

---

### Task 12: `--database` end-to-end at `koti new` (CLI + generator + MCP)

**Files:**
- Modify: `src/generators/project.ts` (options gain `database`; validation; overlay uses it; fragments use it; fallback .env branch; inline express index-route string at line 81 becomes DB-conditional; koti.config.json writer adds `database`), `src/cli.ts` (`--database` flag + TTY prompt + validation cloned from 367-391; next-steps text 401-427 DB-conditional), `src/mcp-server.ts` (create_project schema line ~135 adds `database: z.enum(['mongodb','postgres']).optional().default('mongodb')`, description line 132 DB-neutral, success message echoes database)
- Test: `tests/generators/project.test.ts`, `tests/mcp-server.test.ts`

**Interfaces:**
- Produces: `createProject({ name, framework, database, targetDir?, skipInstall? })` — `database: Database` defaulting to `'mongodb'`; throws `GeneratorError('UNSUPPORTED_DATABASE')` on invalid values (mirror of the UNSUPPORTED_FRAMEWORK check at project.ts:313-316).

- [x] **Step 1: Failing tests:**

```ts
// project.test.ts — the 2×2 matrix + release gate
for (const fw of ['express', 'elysia'] as const) {
  for (const dbx of ['mongodb', 'postgres'] as const) {
    it(`scaffolds ${fw} + ${dbx}`, async () => {
      const dir = await createTestProject(fw, dbx);
      const cfg = JSON.parse(await fs.readFile(path.join(dir, 'koti.config.json'), 'utf8'));
      expect(cfg.database).toBe(dbx);
      const pkg = JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf8'));
      if (dbx === 'postgres') {
        expect(pkg.dependencies['drizzle-orm']).toBeDefined();
        expect(pkg.dependencies.mongoose).toBeUndefined();
        // release gate: zero mongoose imports anywhere in a PG project
        for (const f of await globTsFiles(path.join(dir, 'src'))) {
          expect(await fs.readFile(f, 'utf8'), f).not.toMatch(/from 'mongoose'/);
        }
        expect(await fs.pathExists(path.join(dir, 'drizzle.config.ts'))).toBe(true);
        expect(await fs.readFile(path.join(dir, '.env'), 'utf8')).toMatch(/DATABASE_URL=postgres:/);
      } else {
        expect(pkg.dependencies.mongoose).toBeDefined();
        expect(pkg.dependencies['drizzle-orm']).toBeUndefined();
      }
    });
  }
}
it('rejects unknown database', async () => {
  await expect(createProject({ name: 'x-app', framework: 'express', database: 'mysql' as never, targetDir: tmp, skipInstall: true }))
    .rejects.toMatchObject({ code: 'UNSUPPORTED_DATABASE' });
});
```
```ts
// mcp-server.test.ts — one new case in the existing harness
it('create_project accepts database: postgres', async () => {
  const res = await client.callTool('create_project', { projectName: 'pg-api', framework: 'express', database: 'postgres', targetDir: scratch, skipInstall: true });
  expect(res.isError).toBeFalsy();
  const cfg = JSON.parse(await fs.readFile(path.join(scratch, 'pg-api', 'koti.config.json'), 'utf8'));
  expect(cfg.database).toBe('postgres');
});
```

- [x] **Step 2: Run — expect FAIL.**
- [x] **Step 3: Implement** per Files. CLI prompt block (clone of 374-391): flag wins → `process.stdin.isTTY` gate → menu `1) MongoDB (default)  2) PostgreSQL` → non-TTY silent `'mongodb'`; validate against `DATABASES`, `process.exit(1)` on bad flag value. Next-steps: mongodb keeps today's lines; postgres prints `createdb <name>` / `npm run db:migrate` / `npm run seed`. The express inline index-route description string (project.ts:81) becomes `` `TypeScript API built with Bun, Express, and ${database === 'postgres' ? 'PostgreSQL' : 'MongoDB'}` ``. For postgres, `createProject` additionally copies the root-level db files from the template — `templates/db/postgres/drizzle.config.ts` → `<project>/drizzle.config.ts` and `templates/db/postgres/drizzle/` → `<project>/drizzle/` (the `src/` overlay copy from Task 2 only covers `src`).
- [x] **Step 4: Full suite green.**
- [x] **Step 5: Commit** — `git commit -am "feat: --database flag end-to-end (CLI prompt, generator, MCP create_project)"`

---

### Task 13: Drizzle emitters — `koti model` on PG projects

**Files:**
- Create: `src/generators/crud/drizzle/modelFile.ts`, `src/generators/crud/drizzle/service.ts`
- Modify: `src/generators/model.ts` (emitter selection + DB-conditional barrel line), `src/generators/crud/express.ts` (generateJoiValidation gains `database` param; ObjectId → `Joi.string().uuid()` when postgres, lines 160/186), `src/generators/crud/elysia.ts` (typeBoxFor gains `database`; ObjectId → `t.String({ format: 'uuid' })` when postgres, line 61), `src/mcp-server.ts` (fieldSchema description line 117 → 'Field data type'), `src/cli.ts` (model success text line 179 DB-conditional)
- Test: `tests/generators/crud-drizzle.test.ts` (new), `tests/generators/model.test.ts`

**Interfaces:**
- Produces:

```ts
// crud/drizzle/modelFile.ts
export function generateDrizzleModel(modelName: string, fields: FieldSpec[]): string;
// emission per spec §6.2: pgTable('<snake_plural>'), id uuid PK gen_random_uuid, createdAt/updatedAt timestamptz,
// String→text, Number→doublePrecision, Date→timestamp({withTimezone:true}), Boolean→boolean,
// ObjectId→uuid, Array→jsonb().$type<any[]>(), Mixed/JSON→jsonb();
// required→.notNull(), unique→.unique(), index→index() in the table's third arg,
// default→literal for String/Number/Boolean; 'Date.now'→defaultNow(); Array/Mixed/JSON→sql`'<json>'::jsonb`;
// unmappable default → omit + return-warning (never throw)
// exports: `export const <plural> = pgTable(...)` + `export type <Name> = typeof <plural>.$inferSelect` + NewX insert type

// crud/drizzle/service.ts
export function generateDrizzleCRUDService(modelName: string, fields: FieldSpec[]): string;
// getAll: select + ilike/or over String fields + count(*) pagination; getById/create/update/delete via eq(id);
// same exported service API names as the mongoose CRUD service emission
```
- Produces in `model.ts`: `const isPg = ctx.database === 'postgres';` selecting modelFile/service emitters; barrel line `export * from './X'` (pg) vs existing `export { default as X, IX } from './X'` (mongo); validators called with `ctx.database`.

- [ ] **Step 1: Write `crud-drizzle.test.ts`** — exact-string tests in the style of `crud-express.test.ts`: table name pluralization, every FieldType mapping from the table above, `.notNull()`/`.unique()`/index emission, `Date.now` default → `defaultNow()`, warning on unmappable default, service `ilike` emission, uuid-format validator emission for both frameworks when database is postgres, plain `Joi.string()`/`t.String()` when mongodb.
- [ ] **Step 2: Run — expect FAIL.  Step 3: Implement.  Step 4: green** — plus `model.test.ts` case: `createModel` on a `makeFakeProject('express','postgres')` writes a Drizzle model + service, appends `export * from` to the barrel, and records the manifest.
- [ ] **Step 5: Commit** — `git commit -am "feat(generators): drizzle model + CRUD service emitters; per-db validator tightening"`

**Phase-2 exit criterion:** `koti new x --framework <fw> --database postgres` produces a project that installs, typechecks, migrates, seeds, and boots against a local Postgres (manual smoke on one framework minimum; record results in the PR description).

---

## Phase 3 — Switch + release

### Task 14: `switchDatabase` generator

**Files:**
- Create: `src/generators/switchDb.ts`
- Test: `tests/generators/db-switch.test.ts` (new)

**Interfaces:**
- Consumes: `resolveProject`, `readModelManifest`, `importManifestFromSource`, `BUILTIN_MODELS`, both emitter pairs, `applyDbFragments`, `templatesDir`.
- Produces:

```ts
export async function switchDatabase(projectRoot: string, target: Database): Promise<{ files: string[]; warnings: string[] }>;
```
Algorithm = spec §7.2 steps 1-9 verbatim — implement in that order; key mechanics:
- Backup: `.bak` copy for every file about to be overwritten (config/database.ts, src/models/*, all five built-in service files, every manifest model's service, manifest models' `src/validators/*`, seeds, and when leaving PG: `drizzle.config.ts` + `drizzle/`). Reuse the `editModel` backup helper convention (model.ts 254-258).
- Overlay: copy `templates/db/<target>/src`; for postgres targets also copy `drizzle.config.ts` + `drizzle/` to root — restoring `drizzle/` and `drizzle.config.ts` from their `.bak` copies instead when present (round-trip case).
- Regenerate: each manifest model via the target's modelFile emitter; if `entry.crud`, the target CRUD service + validators (with `target` database); barrels rebuilt = overlay's built-in lines + one appended line per manifest model via `updateIndexExport`.
- package.json: delete the keys named in the *source* db's `package.deps.json` (deps, devDeps, scripts), then merge the target's fragments (`applyDbFragments`).
- .env/.env.example: comment out the old DB line (`# MONGODB_URI=...` / `# DATABASE_URL=...`), insert the target fragment (PROJECT_NAME from package.json `name`).
- Update `koti.config.json.database`; return warnings + a `nextSteps` string list (install; postgres: `db:generate` then `db:migrate`; start DB; re-seed; migration-history caveat).

- [ ] **Step 1: Write the failing suite:**

```ts
describe('switchDatabase', () => {
  it('mongo → postgres: swaps db layer, regenerates models, rewrites deps/env/config', async () => {
    const root = await scaffold('express', 'mongodb');          // helper wrapping createProject skipInstall
    await createModel({ projectRoot: root, name: 'Product', fields: [{ name: 'title', type: 'String', required: true }], crud: true, rbacTasks: false });
    const { warnings } = await switchDatabase(root, 'postgres');
    expect(await read(root, 'src/config/database.ts')).toContain('drizzle');
    expect(await read(root, 'src/models/Product.ts')).toContain("pgTable('products'");
    expect(await fs.pathExists(path.join(root, 'src/models/Product.ts.bak'))).toBe(true);
    expect(await fs.pathExists(path.join(root, 'src/validators/product.ts.bak'))).toBe(true);
    const pkg = await readJson(root, 'package.json');
    expect(pkg.dependencies['drizzle-orm']).toBeDefined();
    expect(pkg.dependencies.mongoose).toBeUndefined();
    expect(await read(root, '.env')).toMatch(/# MONGODB_URI=/);
    expect((await readJson(root, 'koti.config.json')).database).toBe('postgres');
    for (const f of await globTsFiles(path.join(root, 'src'))) {
      expect(await fs.readFile(f, 'utf8'), f).not.toMatch(/from 'mongoose'/);
    }
  });

  it('round-trips postgres → mongodb → postgres with barrels keeping built-ins', async () => {
    const root = await scaffold('elysia', 'postgres');
    await createModel({ projectRoot: root, name: 'Item', fields: [{ name: 'label', type: 'String' }], crud: true, rbacTasks: false });
    await switchDatabase(root, 'mongodb');
    expect(await read(root, 'src/models/Item.ts')).toContain('new Schema<');
    await switchDatabase(root, 'postgres');
    const barrel = await read(root, 'src/models/index.ts');
    for (const b of ['User', 'Role', 'AuditLog', 'Document', 'TinyUrl', 'Item']) expect(barrel).toContain(b);
    expect(await fs.pathExists(path.join(root, 'drizzle/meta/_journal.json'))).toBe(true); // restored or fresh
  });

  it('pre-3.2 mongo project (no manifest): imports user models, skips built-ins, survives junk', async () => {
    const root = await scaffold('express', 'mongodb');
    await createModel({ projectRoot: root, name: 'Legacy', fields: [{ name: 'note', type: 'String' }], crud: false, rbacTasks: false });
    const cfg = await readJson(root, 'koti.config.json');
    delete cfg.models; delete cfg.database;
    await writeJson(root, 'koti.config.json', cfg);
    await fs.writeFile(path.join(root, 'src/models/Junk.ts'), 'nonsense');
    const { warnings } = await switchDatabase(root, 'postgres');
    expect(await read(root, 'src/models/Legacy.ts')).toContain('pgTable');
    expect(await read(root, 'src/services/userService.ts')).toContain('drizzle'); // built-in NOT regenerated as CRUD
    expect(warnings.some(w => w.includes('Junk'))).toBe(true);
  });

  it('rejects no-op and manifest-less postgres sources', async () => {
    const root = await scaffold('express', 'mongodb');
    await expect(switchDatabase(root, 'mongodb')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    const pgRoot = await scaffold('express', 'postgres');
    const cfg = await readJson(pgRoot, 'koti.config.json');
    delete cfg.models;
    await writeJson(pgRoot, 'koti.config.json', cfg);
    // spec §6.4: a manifest-less postgres project is always a hard error (Drizzle sources are never parsed);
    // the error message must tell the user to restore koti.config.json
    await expect(switchDatabase(pgRoot, 'mongodb')).rejects.toMatchObject({ code: 'IO_ERROR' });
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module doesn't exist).  Step 3: Implement `switchDb.ts` per the mechanics above.  Step 4: Full suite green.**
- [ ] **Step 5: Commit** — `git commit -am "feat(generators): switchDatabase — code-only db conversion with backups + manifest regeneration"`

---

### Task 15: `koti db:switch` CLI + `switch_database` MCP tool

**Files:**
- Modify: `src/cli.ts` (new command registration next to `model:edit`), `src/mcp-server.ts` (10th registerTool; scaffold-api prompt gains the database step next to the framework step at ~433-439; models resource description line 371 → 'Lists data models'; seed_database description 314 DB-neutral; program/header comments 5, 64)
- Test: `tests/mcp-server.test.ts` (both 9→10 assertions at 31-34 and 100, plus a switch_database happy-path case), `tests/commands.test.ts` (one non-interactive `db:switch` run)

**Interfaces:**
- Consumes: `switchDatabase` from Task 14.
- Produces: CLI `koti db:switch <database>` — validates via DATABASES, runs in `process.cwd()`, prints files/warnings/next-steps (yellow warnings per the existing convention, cli.ts:206). MCP tool:

```ts
server.registerTool('switch_database', {
  title: 'Switch Database',
  description: 'Convert an existing Koti project between MongoDB and PostgreSQL (code-only; data does not move; originals kept as .bak).',
  inputSchema: { projectPath: z.string().describe('Absolute path to the project'), database: z.enum(['mongodb', 'postgres']) },
}, async ({ projectPath, database }) => { /* requireAbsolute → switchDatabase → ok(files, warnings) / fail(err) */ });
```

- [ ] **Step 1: Failing tests** — update both tool-count assertions to 10 + sorted-name arrays gain `'switch_database'`; add:

```ts
it('switch_database converts a scaffolded project', async () => {
  // scaffold mongodb express project via create_project (skipInstall), then:
  const res = await client.callTool('switch_database', { projectPath: projDir, database: 'postgres' });
  expect(res.isError).toBeFalsy();
  const cfg = JSON.parse(await fs.readFile(path.join(projDir, 'koti.config.json'), 'utf8'));
  expect(cfg.database).toBe('postgres');
});
```
And in `commands.test.ts`: run `node dist/cli.js db:switch postgres` inside a scaffolded fixture project, assert exit 0 + `koti.config.json.database === 'postgres'`.
- [ ] **Step 2: Run — expect FAIL.  Step 3: Implement.  Step 4: Full suite green.**
- [ ] **Step 5: Commit** — `git commit -am "feat: koti db:switch command + switch_database MCP tool (10 tools)"`

---

### Task 16: Docs, wording sweep, release chores → v3.2.0

**Files:**
- Modify: `README.md` (headline, Features, new Database Choice section, commands: `db:switch`, env examples DB-dual, generated-deps lists), `QUICK_START.md` (lines 65, 161, 216, 450-456, 493 — DB-dual), `manifest.json` (10 tools incl. switch_database; descriptions DB-neutral), `package.json` + `version.json` (description/keywords add postgres/drizzle; version → 3.2.0 via `npm run update-version`), `PUBLISHING_GUIDE.md` (drop npm-package.json rows), `scripts/update-version.js` (remove the npm-package.json line 26), `src/cli.ts` (program description line 64), `MCP_RUN_DEPLOY.md` (Postgres prerequisite line)
- Delete: `npm-package.json`
- Test: `tests/cli.test.ts` (README locks: **remove/rescope the UUID-forbidding assertions at 192-196** — the capability ships now; add a lock that README mentions both `--database mongodb|postgres` and `db:switch`; version-match test stays)

**Interfaces:** none new — this task is the §9 checklist executed.

- [ ] **Step 1: Flip the README locks first (failing):** delete the two UUID prohibitions; add `expect(readme).toContain('--database')` and `expect(readme).toContain('db:switch')`. Run — FAIL (README not yet updated).
- [ ] **Step 2: Write the docs + wording sweep** per Files. README's Database Choice section documents: create-time choice, switch semantics (code-only, `.bak`, data does not move, migration-history caveat), the field-type mapping table, and the roadmap ladder (spec §10) as "planned".
- [ ] **Step 3: Version bump:** set `version.json` to `3.2.0` (+ release-notes line), run `npm run update-version`, verify README install line + manifest/package versions moved.
- [ ] **Step 4: Full verification battery:** `npx vitest run` (everything), `npm run build`, `npm run pack:mcpb` (preflight passes; bundle contains `templates/db/`). Scaffold all four variants with `skipInstall` and eyeball `koti.config.json` + zero-mongoose gate one last time.
- [ ] **Step 5: Commit** — `git commit -am "release: v3.2.0 — database choice (MongoDB or Postgres), db:switch, drizzle emitters"`

---

## Verification gates (run after every phase)

1. `npx vitest run` — zero failures, zero skips added.
2. `npm run build` — esbuild clean.
3. Phase 2+: scratch scaffold of `express+postgres` typechecks (`tsc --noEmit`) with pinned deps installed.
4. Phase 3: manual smoke on one PG project against local Postgres: `db:migrate` → `seed` → boot → `GET /health`, login round-trip, one CRUD create/list (documents in PR description).

## Out of scope (spec §3/§10 — do not build)

Data migration between databases; SSR templates; pg-boss/outbox/RLS scaffolds; Prisma; MySQL/SQLite; runtime pglite tier (testcontainers smoke is best-effort, non-blocking).
