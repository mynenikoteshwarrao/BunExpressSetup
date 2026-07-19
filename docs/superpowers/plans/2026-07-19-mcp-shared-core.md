# Koti MCP v3.1 — Shared Generator Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all code generation from `src/cli.ts` into a shared `src/generators/` module that both the CLI and the MCP server call directly, make sub-generators framework-aware (Express + Elysia), fix the MCP server's false-success/crash/hang bugs, and ship a coherent v3.1.0 release.

**Architecture:** Generators are pure-ish functions taking structured args and returning `{files, warnings}` or throwing typed `GeneratorError`s. `cli.ts` becomes a commander+readline prompt layer over them; `mcp-server.ts` calls them in-process (the stdin-puppeteering `runKotiCommand` is deleted). Framework selection is read from the project's `koti.config.json`.

**Tech Stack:** TypeScript (strict, CommonJS, target ES2020), esbuild bundling (`--bundle --platform=node --target=node16 --format=cjs --external:readline`), fs-extra, commander, zod v3, @modelcontextprotocol/sdk ^1.12, vitest.

**Spec:** `docs/superpowers/specs/2026-07-19-mcp-shared-core-design.md`

## Global Constraints

- Node engines `>=16.0.0`; all code CJS-compatible (no ESM-only imports, no top-level await; `__dirname` is relied on).
- zod is **v3** (`^3.23.0`) — use v3 API only.
- No chalk. CLI output uses the hand-rolled `colors` ANSI object (currently `cli.ts:52-60`). **Generators never `console.log`** — they return warnings or accept an optional `log` callback.
- Every file stays **under 500 lines** — split further if a file approaches the limit.
- Path resolution must work BOTH bundled (`dist/cli.js` → templates at `dist/../templates`) AND under ts-node/vitest (`src/generators/*.ts` → templates at `src/generators/../../templates`). Always probe candidates; never assume one layout.
- CLI interactive prompt UX must remain **byte-identical** (existing tests in `tests/commands.test.ts` feed answers by prompt order with `runInteractiveCLI`). Failure paths change from `return` (exit 0) to `process.exit(1)` — that is intentional per spec.
- Tests: vitest, config includes `tests/**/*.test.ts`. Run one file: `npx vitest run tests/<file>.test.ts`. Full suite: `npm test`.
- Version files: `version.json` is the source of truth; `manifest.json.version` must equal `package.json.version` or `npm run pack:mcpb` fails.
- Commit after every task. Never commit `.env` files or secrets.

## Verbatim-Move Convention

Several tasks relocate existing template-literal generator functions out of `src/cli.ts` **unchanged**. For those, this plan gives the exact source line range (valid at commit `3959392`) and the destination; copy the function body verbatim rather than retyping it. Any deliberate modification to moved code is called out explicitly in the task. Code that is NEW is given in full in the task.

`src/cli.ts` reference map (commit `3959392`): getVersion 10-23, generateSecret 26-28, colors 52-60, enumTypes 77, createReadlineInterface/askQuestion 80-94, naming transforms 97-114, addTaskToEnum 120-174, parseExistingModel 177-217, checkCRUDExists 220-233, createBackupWithNewCode 236-263 (dead), readExistingSchemas 266-276 (dead), projectTemplates 279-605 (dead), generateTypeScriptModel 608-645, generateTypeScriptEnum 648-664, generateTypeScriptController 667-808, generateTypeScriptService 811-854, generateTypeScriptMiddleware 857-889, generateCRUDController 892-1032, generateCRUDService 1035-1146, generateCRUDRoutes 1149-1346, generateJoiValidation 1349-1393, updateIndexExport 1404-1422, updateMainRoutes 1424-1471, generateEssentialFiles 1474-2214, commands: model 2222-2414, enum 2417-2478, controller 2481-2506, service 2509-2534, middleware 2537-2562, new 2565-2800, model:edit 2803-3029, task 3032-3122.

## File Structure

```
src/
  generators/
    context.ts        — types, GeneratorError, naming, resolveProject, updateIndexExport,
                        getVersion, generateSecret, packageRoot/templatesDir, FIELD_TYPES/ENUM_TYPES
    enum.ts           — createEnum (framework-neutral)
    task.ts           — addTaskToEnum (canonical) + createTask (framework-neutral)
    controller.ts     — createController (express stub moved / elysia stub NEW)
    service.ts        — createService (framework-neutral stub, moved)
    middleware.ts     — createMiddleware (express moved / elysia NEW)
    crud/
      modelFile.ts    — generateTypeScriptModel (moved + index/default fixes)
      service.ts      — generateCRUDService (moved, framework-neutral)
      express.ts      — generateCRUDController, generateJoiValidation, generateCRUDRoutes (moved)
      elysia.ts       — generateElysiaCrudController, generateTypeBoxValidator, generateElysiaCrudRoutes (NEW)
    model.ts          — createModel, editModel, parseExistingModel, route registration (both frameworks)
    project.ts        — createProject (framework, skipInstall, hardened install)
  cli.ts              — prompt layer only (shrinks from 3123 lines)
  mcp-server.ts       — 9 MCP tools calling generators in-process
tests/
  helpers/fakeProject.ts, helpers/mcpClient.ts
  generators/context.test.ts, enum-task.test.ts, stubs.test.ts,
             crud-express.test.ts, crud-elysia.test.ts, model.test.ts,
             edit-model.test.ts, project.test.ts
  mcp-server.test.ts
  cli.test.ts, commands.test.ts (existing — kept green, some source-grep assertions repointed)
```

---

### Task 1: `src/generators/context.ts` — shared foundation

**Files:**
- Create: `src/generators/context.ts`
- Create: `tests/generators/context.test.ts`
- Create: `tests/helpers/fakeProject.ts`

**Interfaces:**
- Consumes: nothing (foundation).
- Produces (every later task imports from here):
  - `type Framework = 'express' | 'elysia'`
  - `type FieldType = 'String'|'Number'|'Date'|'Boolean'|'ObjectId'|'Array'|'Mixed'|'JSON'`
  - `const FIELD_TYPES: readonly FieldType[]` (order matters — CLI menu shows `1-8` in this order)
  - `const ENUM_TYPES: readonly ['string','number']`
  - `interface FieldSpec { name: string; type: FieldType; required?: boolean; unique?: boolean; index?: boolean; default?: string; }`
  - `type GeneratorErrorCode = 'NOT_KOTI_PROJECT'|'DUPLICATE'|'INVALID_INPUT'|'UNSUPPORTED_FRAMEWORK'|'IO_ERROR'|'INSTALL_FAILED'`
  - `class GeneratorError extends Error { code: GeneratorErrorCode }`
  - `interface GeneratorResult { files: string[]; warnings: string[]; }`
  - `interface ProjectContext { root: string; framework: Framework; warnings: string[]; }`
  - `resolveProject(root: string): Promise<ProjectContext>`
  - `capitalize/toCamelCase/toKebabCase/toUpperSnakeCase(s: string): string`
  - `updateIndexExport(dirPath: string, exportLine: string): Promise<void>`
  - `getVersion(): string`, `generateSecret(bytes?: number): string`
  - `packageRoot(): string`, `templatesDir(): string`
  - `assertValidName(value: string, pattern: RegExp, what: string): void` (throws `INVALID_INPUT`)

- [ ] **Step 1: Write the failing tests**

```ts
// tests/helpers/fakeProject.ts
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export async function makeFakeProject(framework: 'express' | 'elysia'): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'koti-test-'));
  await fs.writeJson(path.join(root, 'package.json'), {
    name: 'fake-project',
    version: '1.0.0',
    dependencies: {
      mongoose: '^8.0.0',
      ...(framework === 'express' ? { express: '^4.18.0' } : { elysia: '^1.0.0' }),
    },
    scripts: { seed: 'node -e "console.log(\'seeded\')"', 'seed:roles': 'node -e "console.log(\'roles-seeded\')"' },
  });
  await fs.writeJson(path.join(root, 'koti.config.json'), {
    framework, kotiVersion: '3.1.0', createdAt: '2026-07-19T00:00:00.000Z',
  });
  for (const d of ['models', 'controllers', 'services', 'middleware', 'routes', 'enums', 'validators']) {
    await fs.ensureDir(path.join(root, 'src', d));
  }
  if (framework === 'express') {
    await fs.writeFile(path.join(root, 'src', 'routes', 'index.ts'),
`import { Router } from 'express';
import authRoutes from './auth';

const router = Router();

router.use('/auth', authRoutes);

export default router;
`);
  } else {
    await fs.writeFile(path.join(root, 'src', 'routes', 'index.ts'),
`import { Elysia } from 'elysia';
import { authRoutes } from './auth';

export const apiRoutes = new Elysia()
  .use(authRoutes);

export default apiRoutes;
`);
  }
  await fs.writeFile(path.join(root, 'src', 'enums', 'Task.ts'),
`export enum Task {
  /** View users */
  VIEW_USERS = 'VIEW_USERS',
}

export const TaskDescriptions: Record<Task, string> = {
  [Task.VIEW_USERS]: 'View users',
};
`);
  return root;
}
```

```ts
// tests/generators/context.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { makeFakeProject } from '../helpers/fakeProject';
import {
  GeneratorError, resolveProject, capitalize, toCamelCase, toKebabCase, toUpperSnakeCase,
  updateIndexExport, getVersion, generateSecret, templatesDir, FIELD_TYPES, assertValidName,
} from '../../src/generators/context';

describe('naming transforms', () => {
  it('transforms names like the legacy CLI', () => {
    expect(capitalize('product')).toBe('Product');
    expect(toCamelCase('ProductItem')).toBe('productItem');
    expect(toKebabCase('ProductItem')).toBe('product-item');
    expect(toUpperSnakeCase('ProductItem')).toBe('PRODUCT_ITEM');
  });
});

describe('FIELD_TYPES', () => {
  it('matches the CLI menu order 1-8', () => {
    expect([...FIELD_TYPES]).toEqual(['String', 'Number', 'Date', 'Boolean', 'ObjectId', 'Array', 'Mixed', 'JSON']);
  });
});

describe('assertValidName', () => {
  it('throws INVALID_INPUT for bad names', () => {
    expect(() => assertValidName('bad name\n', /^[a-zA-Z_][a-zA-Z0-9_]*$/, 'field name'))
      .toThrowError(GeneratorError);
    try {
      assertValidName('bad-name', /^[A-Z][a-zA-Z0-9]*$/, 'model name');
    } catch (e) {
      expect((e as GeneratorError).code).toBe('INVALID_INPUT');
    }
  });
  it('accepts good names', () => {
    expect(() => assertValidName('Product', /^[A-Z][a-zA-Z0-9]*$/, 'model name')).not.toThrow();
  });
});

describe('resolveProject', () => {
  it('reads framework from koti.config.json', async () => {
    const root = await makeFakeProject('elysia');
    const ctx = await resolveProject(root);
    expect(ctx.framework).toBe('elysia');
    expect(ctx.warnings).toEqual([]);
    await fs.remove(root);
  });
  it('falls back to dependency sniffing with a warning when koti.config.json is missing', async () => {
    const root = await makeFakeProject('express');
    await fs.remove(path.join(root, 'koti.config.json'));
    const ctx = await resolveProject(root);
    expect(ctx.framework).toBe('express');
    expect(ctx.warnings.length).toBe(1);
    await fs.remove(root);
  });
  it('falls back to express with a warning on unknown framework value', async () => {
    const root = await makeFakeProject('express');
    await fs.writeJson(path.join(root, 'koti.config.json'), { framework: 'fastify' });
    const ctx = await resolveProject(root);
    expect(ctx.framework).toBe('express');
    expect(ctx.warnings.length).toBe(1);
    await fs.remove(root);
  });
  it('throws NOT_KOTI_PROJECT for a non-project directory', async () => {
    const empty = await fs.mkdtemp(path.join(os.tmpdir(), 'koti-empty-'));
    await expect(resolveProject(empty)).rejects.toMatchObject({ code: 'NOT_KOTI_PROJECT' });
    await fs.remove(empty);
  });
  it('throws NOT_KOTI_PROJECT for a nonexistent directory', async () => {
    await expect(resolveProject('/nonexistent/nope')).rejects.toMatchObject({ code: 'NOT_KOTI_PROJECT' });
  });
});

describe('updateIndexExport', () => {
  it('appends once and is idempotent', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'koti-idx-'));
    await updateIndexExport(dir, `export { X } from './X';`);
    await updateIndexExport(dir, `export { X } from './X';`);
    const content = await fs.readFile(path.join(dir, 'index.ts'), 'utf-8');
    expect(content.match(/export \{ X \}/g)!.length).toBe(1);
    await fs.remove(dir);
  });
});

describe('package root helpers', () => {
  it('finds the templates directory from source layout', () => {
    expect(fs.existsSync(path.join(templatesDir(), 'express'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir(), 'elysia'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir(), 'shared'))).toBe(true);
  });
  it('getVersion returns the repo version', () => {
    const pkg = fs.readJsonSync(path.join(__dirname, '..', '..', 'package.json'));
    expect(getVersion()).toBe(pkg.version);
  });
  it('generateSecret returns hex of requested byte length', () => {
    expect(generateSecret(64)).toMatch(/^[0-9a-f]{128}$/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/generators/context.test.ts`
Expected: FAIL — cannot resolve `../../src/generators/context`.

- [ ] **Step 3: Implement `src/generators/context.ts`**

Move verbatim from `cli.ts`: naming transforms (97-114), `updateIndexExport` (1404-1422), `generateSecret` (26-28). `getVersion` is reimplemented below (the cli.ts version only probes `__dirname/..`, which breaks under ts-node from `src/generators/`).

```ts
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

export type Framework = 'express' | 'elysia';
export const FRAMEWORKS: readonly Framework[] = ['express', 'elysia'] as const;

export type FieldType = 'String' | 'Number' | 'Date' | 'Boolean' | 'ObjectId' | 'Array' | 'Mixed' | 'JSON';
export const FIELD_TYPES: readonly FieldType[] = ['String', 'Number', 'Date', 'Boolean', 'ObjectId', 'Array', 'Mixed', 'JSON'] as const;
export const ENUM_TYPES = ['string', 'number'] as const;

export interface FieldSpec {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  index?: boolean;
  default?: string;
}

export type GeneratorErrorCode =
  | 'NOT_KOTI_PROJECT' | 'DUPLICATE' | 'INVALID_INPUT'
  | 'UNSUPPORTED_FRAMEWORK' | 'IO_ERROR' | 'INSTALL_FAILED';

export class GeneratorError extends Error {
  constructor(public readonly code: GeneratorErrorCode, message: string) {
    super(message);
    this.name = 'GeneratorError';
  }
}

export interface GeneratorResult {
  files: string[];
  warnings: string[];
}

export interface ProjectContext {
  root: string;
  framework: Framework;
  warnings: string[];
}

export const assertValidName = (value: string, pattern: RegExp, what: string): void => {
  if (!pattern.test(value)) {
    throw new GeneratorError('INVALID_INPUT', `Invalid ${what}: "${value}" (must match ${pattern})`);
  }
};

// --- naming transforms: moved verbatim from cli.ts:97-114 ---
export const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);
export const toCamelCase = (str: string): string => str.charAt(0).toLowerCase() + str.slice(1);
export const toKebabCase = (str: string): string => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
export const toUpperSnakeCase = (str: string): string => str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();

export const generateSecret = (bytes: number = 64): string => crypto.randomBytes(bytes).toString('hex');

// Works from dist/*.js (bundled) and src/generators/*.ts (ts-node/vitest).
export const packageRoot = (): string => {
  const candidates = [path.join(__dirname, '..'), path.join(__dirname, '..', '..')];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'templates'))) return c;
  }
  throw new GeneratorError('IO_ERROR', 'Could not locate koti package root (no templates/ directory found)');
};

export const templatesDir = (): string => path.join(packageRoot(), 'templates');

export const getVersion = (): string => {
  const candidates = [
    path.join(__dirname, '..', 'version.json'),
    path.join(__dirname, '..', 'package.json'),
    path.join(__dirname, '..', '..', 'version.json'),
    path.join(__dirname, '..', '..', 'package.json'),
  ];
  for (const candidate of candidates) {
    try {
      const data = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (data.version) return data.version;
    } catch { /* try next */ }
  }
  return '0.0.0-unknown';
};

export const resolveProject = async (root: string): Promise<ProjectContext> => {
  const warnings: string[] = [];
  const pkgPath = path.join(root, 'package.json');
  if (!(await fs.pathExists(pkgPath))) {
    throw new GeneratorError('NOT_KOTI_PROJECT', `${root} is not a Koti project (no package.json)`);
  }
  const configPath = path.join(root, 'koti.config.json');
  if (await fs.pathExists(configPath)) {
    try {
      const config = await fs.readJson(configPath);
      if (config.framework === 'express' || config.framework === 'elysia') {
        return { root, framework: config.framework, warnings };
      }
      warnings.push(`Unknown framework "${config.framework}" in koti.config.json — defaulting to express`);
      return { root, framework: 'express', warnings };
    } catch {
      warnings.push('Unreadable koti.config.json — falling back to dependency detection');
    }
  }
  let deps: Record<string, string> = {};
  try {
    const pkg = await fs.readJson(pkgPath);
    deps = { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    throw new GeneratorError('NOT_KOTI_PROJECT', `${root} has an unreadable package.json`);
  }
  if (deps.elysia) {
    warnings.push('No koti.config.json — framework "elysia" inferred from dependencies');
    return { root, framework: 'elysia', warnings };
  }
  if (deps.express || deps.mongoose) {
    warnings.push('No koti.config.json — framework "express" inferred from dependencies');
    return { root, framework: 'express', warnings };
  }
  throw new GeneratorError('NOT_KOTI_PROJECT', `${root} is not a Koti project (no koti.config.json and no express/elysia/mongoose dependency)`);
};

// --- moved verbatim from cli.ts:1404-1422 ---
export const updateIndexExport = async (dirPath: string, exportLine: string): Promise<void> => {
  const indexPath = path.join(dirPath, 'index.ts');
  try {
    let content = '';
    if (await fs.pathExists(indexPath)) {
      content = await fs.readFile(indexPath, 'utf-8');
    }
    if (content.includes(exportLine)) return;
    const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
    await fs.writeFile(indexPath, content + separator + exportLine + '\n');
  } catch { /* Non-fatal */ }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/generators/context.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/generators/context.ts tests/generators/context.test.ts tests/helpers/fakeProject.ts
git commit -m "feat(generators): add shared context module (types, errors, naming, project resolution)"
```

---

### Task 2: enum + task generators, wired into the CLI

**Files:**
- Create: `src/generators/enum.ts`, `src/generators/task.ts`
- Create: `tests/generators/enum-task.test.ts`
- Modify: `src/cli.ts` — enum command (2417-2478), task command (3032-3122); delete `addTaskToEnum` (120-174) and `generateTypeScriptEnum` (648-664)

**Interfaces:**
- Consumes: everything from Task 1's `context.ts`.
- Produces:
  - `interface EnumValue { key: string; value: string | number; }`
  - `createEnum(opts: { projectRoot: string; name: string; enumType: 'string' | 'number'; values: EnumValue[] }): Promise<GeneratorResult>`
  - `createTask(opts: { projectRoot: string; name: string; description: string }): Promise<GeneratorResult>`
  - `addTaskToEnum(projectRoot: string, taskKey: string, description: string): Promise<boolean>` (used by Task 7's `createModel`)

- [ ] **Step 1: Write the failing tests**

```ts
// tests/generators/enum-task.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { makeFakeProject } from '../helpers/fakeProject';
import { createEnum } from '../../src/generators/enum';
import { createTask, addTaskToEnum } from '../../src/generators/task';

let root: string;
beforeEach(async () => { root = await makeFakeProject('express'); });
afterEach(async () => { await fs.remove(root); });

describe('createEnum', () => {
  it('writes a string enum and updates the barrel', async () => {
    const result = await createEnum({
      projectRoot: root, name: 'OrderStatus', enumType: 'string',
      values: [{ key: 'PENDING', value: 'pending' }, { key: 'SHIPPED', value: 'shipped' }],
    });
    const enumPath = path.join(root, 'src', 'enums', 'OrderStatus.ts');
    expect(result.files).toContain(enumPath);
    const content = await fs.readFile(enumPath, 'utf-8');
    expect(content).toContain(`PENDING = 'pending'`);
    expect(content).toContain('export enum OrderStatus');
    const barrel = await fs.readFile(path.join(root, 'src', 'enums', 'index.ts'), 'utf-8');
    expect(barrel).toContain(`export { OrderStatus } from './OrderStatus';`);
  });
  it('writes a number enum without quotes', async () => {
    await createEnum({ projectRoot: root, name: 'Priority', enumType: 'number', values: [{ key: 'LOW', value: 1 }] });
    const content = await fs.readFile(path.join(root, 'src', 'enums', 'Priority.ts'), 'utf-8');
    expect(content).toContain('LOW = 1');
    expect(content).not.toContain(`LOW = '1'`);
  });
  it('rejects invalid enum names and keys', async () => {
    await expect(createEnum({ projectRoot: root, name: 'bad-name', enumType: 'string', values: [{ key: 'A', value: 'a' }] }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(createEnum({ projectRoot: root, name: 'Ok', enumType: 'string', values: [{ key: 'bad\nkey', value: 'a' }] }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('throws DUPLICATE when the enum file already exists', async () => {
    await createEnum({ projectRoot: root, name: 'Dup', enumType: 'string', values: [{ key: 'A', value: 'a' }] });
    await expect(createEnum({ projectRoot: root, name: 'Dup', enumType: 'string', values: [{ key: 'A', value: 'a' }] }))
      .rejects.toMatchObject({ code: 'DUPLICATE' });
  });
});

describe('createTask', () => {
  it('adds an enum entry and description', async () => {
    const result = await createTask({ projectRoot: root, name: 'MANAGE_INVENTORY', description: 'Manage inventory' });
    const content = await fs.readFile(path.join(root, 'src', 'enums', 'Task.ts'), 'utf-8');
    expect(content).toContain(`MANAGE_INVENTORY = 'MANAGE_INVENTORY'`);
    expect(content).toContain(`[Task.MANAGE_INVENTORY]: 'Manage inventory'`);
    expect(result.files).toContain(path.join(root, 'src', 'enums', 'Task.ts'));
  });
  it('allows digits in task names', async () => {
    await expect(createTask({ projectRoot: root, name: 'VIEW_S3_FILES', description: 'x' })).resolves.toBeTruthy();
  });
  it('throws DUPLICATE for an existing task', async () => {
    await expect(createTask({ projectRoot: root, name: 'VIEW_USERS', description: 'again' }))
      .rejects.toMatchObject({ code: 'DUPLICATE' });
  });
  it('throws IO_ERROR when Task.ts is missing', async () => {
    await fs.remove(path.join(root, 'src', 'enums', 'Task.ts'));
    await expect(createTask({ projectRoot: root, name: 'NEW_TASK', description: 'x' }))
      .rejects.toMatchObject({ code: 'IO_ERROR' });
  });
  it('rejects multi-line descriptions', async () => {
    await expect(createTask({ projectRoot: root, name: 'OK_TASK', description: 'a\nb' }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});

describe('addTaskToEnum', () => {
  it('returns false for duplicates without modifying the file', async () => {
    expect(await addTaskToEnum(root, 'VIEW_USERS', 'dup')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/generators/enum-task.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/generators/enum.ts` and `src/generators/task.ts`**

`enum.ts` — `generateTypeScriptEnum` moved verbatim from `cli.ts:648-664` as a private function; new orchestrator:

```ts
import fs from 'fs-extra';
import path from 'path';
import {
  GeneratorResult, GeneratorError, resolveProject, capitalize, updateIndexExport, assertValidName,
} from './context';

export interface EnumValue { key: string; value: string | number; }

// moved verbatim from cli.ts:648-664
const generateTypeScriptEnum = (enumName: string, enumType: 'string' | 'number', values: EnumValue[]): string => {
  const capitalizedName = capitalize(enumName);
  const enumValues = values.map(({ key, value }) => {
    if (enumType === 'string') { return `  ${key} = '${value}'`; }
    return `  ${key} = ${value}`;
  }).join(',\n');
  return `export enum ${capitalizedName} {\n${enumValues}\n}\n\nexport default ${capitalizedName};\n`;
};

export const createEnum = async (opts: {
  projectRoot: string; name: string; enumType: 'string' | 'number'; values: EnumValue[];
}): Promise<GeneratorResult> => {
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, 'enum name (PascalCase)');
  for (const v of opts.values) {
    assertValidName(v.key, /^[A-Z][A-Z0-9_]*$/, 'enum key (UPPER_SNAKE_CASE)');
    if (typeof v.value === 'string' && /[\r\n']/.test(v.value)) {
      throw new GeneratorError('INVALID_INPUT', `Enum value for ${v.key} must not contain newlines or quotes`);
    }
  }
  if (opts.values.length === 0) {
    throw new GeneratorError('INVALID_INPUT', 'At least one enum value is required');
  }
  const ctx = await resolveProject(opts.projectRoot);
  const capitalizedName = capitalize(opts.name);
  const enumPath = path.join(ctx.root, 'src', 'enums', `${capitalizedName}.ts`);
  if (await fs.pathExists(enumPath)) {
    throw new GeneratorError('DUPLICATE', `Enum already exists: ${enumPath}`);
  }
  await fs.ensureDir(path.dirname(enumPath));
  await fs.writeFile(enumPath, generateTypeScriptEnum(opts.name, opts.enumType, opts.values));
  await updateIndexExport(path.join(ctx.root, 'src', 'enums'), `export { ${capitalizedName} } from './${capitalizedName}';`);
  return { files: [enumPath], warnings: ctx.warnings };
};
```

`task.ts` — the canonical `addTaskToEnum` moved verbatim from `cli.ts:120-174` with ONE deliberate change: it takes `projectRoot` instead of using `process.cwd()` (`const enumPath = path.join(projectRoot, 'src', 'enums', 'Task.ts')`). `createTask` distinguishes the three legacy silent-failure cases:

```ts
import fs from 'fs-extra';
import path from 'path';
import { GeneratorResult, GeneratorError, resolveProject, assertValidName } from './context';

// moved verbatim from cli.ts:120-174, cwd → projectRoot parameter
export const addTaskToEnum = async (projectRoot: string, taskKey: string, description: string): Promise<boolean> => {
  // ... (verbatim body; signature change only)
};

export const createTask = async (opts: {
  projectRoot: string; name: string; description: string;
}): Promise<GeneratorResult> => {
  assertValidName(opts.name, /^[A-Z][A-Z0-9_]*$/, 'task name (UPPER_SNAKE_CASE)');
  if (!opts.description.trim()) {
    throw new GeneratorError('INVALID_INPUT', 'Task description is required');
  }
  if (/[\r\n]/.test(opts.description)) {
    throw new GeneratorError('INVALID_INPUT', 'Task description must be a single line');
  }
  const ctx = await resolveProject(opts.projectRoot);
  const enumPath = path.join(ctx.root, 'src', 'enums', 'Task.ts');
  if (!(await fs.pathExists(enumPath))) {
    throw new GeneratorError('IO_ERROR', `src/enums/Task.ts not found — run this inside a Koti project (koti new creates it)`);
  }
  const content = await fs.readFile(enumPath, 'utf-8');
  if (content.includes(`${opts.name} =`) || content.includes(`${opts.name}=`)) {
    throw new GeneratorError('DUPLICATE', `Task ${opts.name} already exists in Task.ts`);
  }
  const added = await addTaskToEnum(ctx.root, opts.name, opts.description);
  if (!added) {
    throw new GeneratorError('IO_ERROR', 'Could not parse src/enums/Task.ts — unexpected enum format');
  }
  return { files: [enumPath], warnings: ctx.warnings };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/generators/enum-task.test.ts`
Expected: PASS.

- [ ] **Step 5: Rewire the CLI `enum` and `task` commands**

In `src/cli.ts`: keep every prompt string byte-identical. The `enum` command's action keeps its readline flow (enum type word, key/value loop with keys uppercased) and then calls `createEnum` instead of writing files inline; the `task` command keeps its description prompt and key derivation (`taskName.toUpperCase().replace(/[^A-Z0-9_]/g, '_')`) then calls `createTask`. Both catch blocks become:

```ts
} catch (error) {
  if (error instanceof GeneratorError) {
    console.error(colors.red(`❌ ${error.message}`));
  } else {
    console.error(colors.red('❌ Unexpected error:'), (error as Error).message);
  }
  process.exit(1);
}
```

Success output prints `result.files` (dim) and `result.warnings` (yellow). The `task` command keeps its usage-hint block (checkPermission example). Delete `generateTypeScriptEnum` (648-664) and `addTaskToEnum` (120-174) from `cli.ts`; import `{ createEnum }` from `./generators/enum` and `{ createTask }` from `./generators/task`, plus `{ GeneratorError }` from `./generators/context`. Note: prompt-validation failures (invalid enum type word) now also `process.exit(1)` instead of `return`.

- [ ] **Step 6: Run the existing CLI integration tests**

Run: `npx vitest run tests/commands.test.ts -t enum`
Expected: PASS (interactive enum tests still green — prompts unchanged).

- [ ] **Step 7: Commit**

```bash
git add src/generators/enum.ts src/generators/task.ts tests/generators/enum-task.test.ts src/cli.ts
git commit -m "feat(generators): extract enum and task generators; CLI failures now exit 1"
```

---

### Task 3: stub generators — controller, service, middleware (framework-aware)

**Files:**
- Create: `src/generators/controller.ts`, `src/generators/service.ts`, `src/generators/middleware.ts`
- Create: `tests/generators/stubs.test.ts`
- Modify: `src/cli.ts` — controller (2481-2506), service (2509-2534), middleware (2537-2562) commands; delete `generateTypeScriptController` (667-808), `generateTypeScriptService` (811-854), `generateTypeScriptMiddleware` (857-889)

**Interfaces:**
- Consumes: `context.ts` exports.
- Produces:
  - `createController(opts: { projectRoot: string; name: string }): Promise<GeneratorResult>`
  - `createService(opts: { projectRoot: string; name: string }): Promise<GeneratorResult>`
  - `createMiddleware(opts: { projectRoot: string; name: string }): Promise<GeneratorResult>`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/generators/stubs.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { makeFakeProject } from '../helpers/fakeProject';
import { createController } from '../../src/generators/controller';
import { createService } from '../../src/generators/service';
import { createMiddleware } from '../../src/generators/middleware';

const roots: string[] = [];
afterEach(async () => { while (roots.length) await fs.remove(roots.pop()!); });

describe('createController', () => {
  it('generates an Express class controller in an express project', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    const result = await createController({ projectRoot: root, name: 'Payment' });
    const file = path.join(root, 'src', 'controllers', 'paymentController.ts');
    expect(result.files).toContain(file);
    const content = await fs.readFile(file, 'utf-8');
    expect(content).toContain(`from 'express'`);
    expect(content).toContain('export class PaymentController');
    expect(content).toContain('export default new PaymentController()');
    const barrel = await fs.readFile(path.join(root, 'src', 'controllers', 'index.ts'), 'utf-8');
    expect(barrel).toContain(`export { default as paymentController } from './paymentController';`);
  });
  it('generates an Elysia object-literal controller in an elysia project', async () => {
    const root = await makeFakeProject('elysia'); roots.push(root);
    await createController({ projectRoot: root, name: 'Payment' });
    const content = await fs.readFile(path.join(root, 'src', 'controllers', 'paymentController.ts'), 'utf-8');
    expect(content).not.toContain(`from 'express'`);
    expect(content).toContain('export const paymentController = {');
    expect(content).toContain(`from '../utils/respond'`);
  });
  it('rejects non-PascalCase names', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    await expect(createController({ projectRoot: root, name: 'bad name' }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('throws DUPLICATE if the controller exists', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    await createController({ projectRoot: root, name: 'Payment' });
    await expect(createController({ projectRoot: root, name: 'Payment' }))
      .rejects.toMatchObject({ code: 'DUPLICATE' });
  });
});

describe('createService', () => {
  it('generates the framework-neutral service stub for both frameworks', async () => {
    for (const fw of ['express', 'elysia'] as const) {
      const root = await makeFakeProject(fw); roots.push(root);
      const result = await createService({ projectRoot: root, name: 'Billing' });
      const file = path.join(root, 'src', 'services', 'billingService.ts');
      expect(result.files).toContain(file);
      const content = await fs.readFile(file, 'utf-8');
      expect(content).toContain('export class BillingService');
      expect(content).not.toContain(`from 'express'`);
    }
  });
});

describe('createMiddleware', () => {
  it('generates Express middleware in an express project', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    const result = await createMiddleware({ projectRoot: root, name: 'RateLimiter' });
    const file = path.join(root, 'src', 'middleware', 'rateLimiter.ts');
    expect(result.files).toContain(file);
    const content = await fs.readFile(file, 'utf-8');
    expect(content).toContain('NextFunction');
  });
  it('generates an Elysia plugin in an elysia project', async () => {
    const root = await makeFakeProject('elysia'); roots.push(root);
    await createMiddleware({ projectRoot: root, name: 'RateLimiter' });
    const content = await fs.readFile(path.join(root, 'src', 'middleware', 'rateLimiter.ts'), 'utf-8');
    expect(content).toContain(`new Elysia({ name: 'rateLimiter' })`);
    expect(content).not.toContain('NextFunction');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/generators/stubs.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the three generator modules**

Shared orchestration shape for all three (shown once here for `controller.ts`; `service.ts` and `middleware.ts` follow the same skeleton with their own paths/barrel lines):

```ts
import fs from 'fs-extra';
import path from 'path';
import {
  GeneratorResult, GeneratorError, resolveProject, capitalize, toCamelCase, toKebabCase,
  updateIndexExport, assertValidName, Framework,
} from './context';

export const createController = async (opts: { projectRoot: string; name: string }): Promise<GeneratorResult> => {
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, 'controller name (PascalCase)');
  const ctx = await resolveProject(opts.projectRoot);
  const camelName = toCamelCase(opts.name);
  const filePath = path.join(ctx.root, 'src', 'controllers', `${camelName}Controller.ts`);
  if (await fs.pathExists(filePath)) {
    throw new GeneratorError('DUPLICATE', `Controller already exists: ${filePath}`);
  }
  const content = ctx.framework === 'elysia'
    ? generateElysiaController(opts.name)
    : generateExpressController(opts.name);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
  await updateIndexExport(
    path.join(ctx.root, 'src', 'controllers'),
    `export { default as ${camelName}Controller } from './${camelName}Controller';`
  );
  return { files: [filePath], warnings: ctx.warnings };
};
```

- `generateExpressController` = `generateTypeScriptController` moved verbatim from `cli.ts:667-808`.
- `generateElysiaController` is NEW:

```ts
const generateElysiaController = (controllerName: string): string => {
  const capitalizedName = capitalize(controllerName);
  const camelCaseName = toCamelCase(controllerName);
  return `import { AppError } from '../utils/AppError';
import { success, paginated } from '../utils/respond';

export const ${camelCaseName}Controller = {
  /** List ${camelCaseName}s with pagination */
  async getAll({ query }: any) {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    // TODO: Implement actual data fetching logic
    const data: any[] = [];
    const total = 0;
    return paginated('${capitalizedName}s retrieved successfully', data, {
      page, limit, total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  },

  /** Get one ${camelCaseName} by id */
  async getById({ params }: any) {
    // TODO: Implement actual data fetching logic
    const data = null;
    if (!data) throw new AppError('${capitalizedName} not found', 404);
    return success('${capitalizedName} retrieved successfully', data);
  },

  /** Create a ${camelCaseName} */
  async create({ body, set }: any) {
    // TODO: Implement creation logic
    set.status = 201;
    return success('${capitalizedName} created successfully', body);
  },

  /** Update a ${camelCaseName} */
  async update({ params, body }: any) {
    // TODO: Implement update logic
    return success('${capitalizedName} updated successfully', { id: params.id, ...body });
  },

  /** Delete a ${camelCaseName} */
  async delete({ params }: any) {
    // TODO: Implement delete logic
    return success('${capitalizedName} deleted successfully');
  }
};

export default ${camelCaseName}Controller;
`;
};
```

`service.ts`: `generateTypeScriptService` moved verbatim from `cli.ts:811-854`, used for BOTH frameworks (it only imports `AppError`). Barrel line: `export * from './${camelName}Service';`. Output path `src/services/${camelName}Service.ts`.

`middleware.ts`: `generateExpressMiddleware` = `generateTypeScriptMiddleware` moved verbatim from `cli.ts:857-889`. Barrel line: `export { ${camelName} } from './${camelName}';`. Output path `src/middleware/${camelName}.ts`. Elysia variant NEW:

```ts
const generateElysiaMiddleware = (middlewareName: string): string => {
  const camelCaseName = toCamelCase(middlewareName);
  return `import { Elysia } from 'elysia';

/**
 * ${capitalize(middlewareName)} middleware plugin
 * Attach with .use(${camelCaseName}) on an Elysia instance or route group.
 */
export const ${camelCaseName} = new Elysia({ name: '${camelCaseName}' })
  .onBeforeHandle(({ request, set }) => {
    // TODO: Implement middleware logic here
    console.log(\`${capitalize(middlewareName)} middleware executed for \${request.method} \${new URL(request.url).pathname}\`);

    // Example: block the request by returning a response
    // set.status = 400;
    // return { success: false, message: '${capitalize(middlewareName)} validation failed' };
  });

export default ${camelCaseName};
`;
};
```

For the Elysia middleware the barrel line is the same named export. Elysia projects have no `src/middleware/index.ts` barrel by default — `updateIndexExport` creates it; that is acceptable (it is additive and unused files are harmless).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/generators/stubs.test.ts`
Expected: PASS.

- [ ] **Step 5: Rewire the CLI commands and delete the moved functions**

`controller`/`service`/`middleware` command actions (no prompts) become thin calls to the generators with the GeneratorError→exit(1) catch pattern from Task 2 Step 5, printing `result.files`/`result.warnings`. Delete `generateTypeScriptController`, `generateTypeScriptService`, `generateTypeScriptMiddleware` from `cli.ts`.

- [ ] **Step 6: Run existing CLI tests for these commands**

Run: `npx vitest run tests/commands.test.ts -t "controller"` then `-t "service"` then `-t "middleware"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/generators/controller.ts src/generators/service.ts src/generators/middleware.ts tests/generators/stubs.test.ts src/cli.ts
git commit -m "feat(generators): framework-aware controller/service/middleware stubs"
```

---

### Task 4: CRUD templates — model file + shared service

**Files:**
- Create: `src/generators/crud/modelFile.ts`, `src/generators/crud/service.ts`
- Create: `tests/generators/crud-express.test.ts` (starts here, extended in Task 5)

**Interfaces:**
- Consumes: `FieldSpec`, `capitalize`, `toCamelCase` from `context.ts`.
- Produces:
  - `generateTypeScriptModel(modelName: string, fields: FieldSpec[]): string`
  - `generateCRUDService(modelName: string, fields: FieldSpec[]): string`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/generators/crud-express.test.ts
import { describe, it, expect } from 'vitest';
import { generateTypeScriptModel } from '../../src/generators/crud/modelFile';
import { generateCRUDService } from '../../src/generators/crud/service';
import { FieldSpec } from '../../src/generators/context';

const fields: FieldSpec[] = [
  { name: 'title', type: 'String', required: true },
  { name: 'price', type: 'Number', index: true },
  { name: 'sku', type: 'String', unique: true, default: 'none' },
  { name: 'meta', type: 'JSON' },
];

describe('generateTypeScriptModel', () => {
  it('emits schema options including index and default', () => {
    const src = generateTypeScriptModel('Product', fields);
    expect(src).toContain('export interface IProduct extends Document');
    expect(src).toContain('title: { type: String,  required: true }');
    expect(src).toContain('index: true');
    expect(src).toContain(`default: 'none'`);
    expect(src).toContain(`model<IProduct>('Product', ProductSchema)`);
  });
  it('maps JSON fields to Schema.Types.Mixed with any TS type', () => {
    const src = generateTypeScriptModel('Product', fields);
    expect(src).toContain('meta: any;');
    expect(src).not.toContain('type: JSON');
  });
});

describe('generateCRUDService', () => {
  it('builds search only over String fields', () => {
    const src = generateCRUDService('Product', fields);
    expect(src).toContain(`['title', 'sku']`);
    expect(src).toContain(`import Product from '../models/Product'`);
    expect(src).toContain('export default new ProductService()');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/generators/crud-express.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement both template modules**

`crud/modelFile.ts`: `generateTypeScriptModel` moved from `cli.ts:608-645` with THREE deliberate fixes (spec: index/default support; JSON type):

1. In the options builder add, after the `unique` line: `if (field.index) options.push('index: true');`
2. The mongoose type for `JSON` fields: emit `Schema.Types.Mixed` instead of the raw `JSON` identifier — in the fields map use `const mongooseType = (field.type === 'Mixed' || field.type === 'JSON') ? 'Schema.Types.Mixed' : field.type;` and interpolate `type: ${mongooseType}`.
3. Typed signature: `(modelName: string, fields: FieldSpec[]): string` (was `any[]`).

The TS-interface mapping keeps its current fallbacks (`Mixed`/`JSON` → `any`).

`crud/service.ts`: `generateCRUDService` moved verbatim from `cli.ts:1035-1146`, typed signature `(modelName: string, fields: FieldSpec[]): string`. No behavioral change — the only field-dependent part (String-field search array) is unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/generators/crud-express.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generators/crud/modelFile.ts src/generators/crud/service.ts tests/generators/crud-express.test.ts
git commit -m "feat(generators): extract model-file and CRUD service templates (adds index/default support)"
```

---

### Task 5: CRUD templates — Express controller, routes, Joi validator

**Files:**
- Create: `src/generators/crud/express.ts`
- Modify: `tests/generators/crud-express.test.ts` (extend)

**Interfaces:**
- Consumes: `FieldSpec`, naming helpers from `context.ts`.
- Produces:
  - `generateCRUDController(modelName: string, fields: FieldSpec[]): string`
  - `generateJoiValidation(modelName: string, fields: FieldSpec[]): string`
  - `generateCRUDRoutes(modelName: string, fields: FieldSpec[], withTasks?: boolean): string`

- [ ] **Step 1: Extend the tests (failing)**

Append to `tests/generators/crud-express.test.ts`:

```ts
import { generateCRUDController, generateJoiValidation, generateCRUDRoutes } from '../../src/generators/crud/express';

describe('generateCRUDController (express)', () => {
  it('emits the class controller wired to the service', () => {
    const src = generateCRUDController('Product', fields);
    expect(src).toContain(`from 'express'`);
    expect(src).toContain(`import ProductService from '../services/productService'`);
    expect(src).toContain('export default new ProductController()');
  });
});

describe('generateJoiValidation', () => {
  it('emits create and update schemas with required/optional chains', () => {
    const src = generateJoiValidation('Product', fields);
    expect(src).toContain('export const createProductSchema');
    expect(src).toContain('title: Joi.string().required()');
    expect(src).toContain('export const updateProductSchema');
    expect(src).toContain('.min(1)');
  });
});

describe('generateCRUDRoutes (express)', () => {
  it('includes permission middleware when withTasks is true', () => {
    const src = generateCRUDRoutes('Product', fields, true);
    expect(src).toContain('checkPermission(Task.VIEW_PRODUCT)');
    expect(src).toContain('validate(createProductSchema)');
    expect(src).toContain('@swagger');
  });
  it('omits permission middleware when withTasks is false', () => {
    const src = generateCRUDRoutes('Product', fields, false);
    expect(src).not.toContain('checkPermission');
    expect(src).toContain(`router.get('/', auth, productController.getAll)`);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/generators/crud-express.test.ts`
Expected: new describes FAIL (module not found); earlier ones PASS.

- [ ] **Step 3: Implement `src/generators/crud/express.ts`**

Verbatim moves from `cli.ts`, typed signatures only:
- `generateCRUDController` from 892-1032 (full body including all five methods and swagger-relevant JSDoc).
- `generateCRUDService` is NOT here (Task 4). 
- `generateJoiValidation` from 1349-1393.
- `generateCRUDRoutes` from 1149-1346 **including the full swagger JSDoc blocks at 1175-1342 verbatim**. Signature `(modelName: string, fields: FieldSpec[], withTasks: boolean = false): string`.

Imports come from `../context`. If the file exceeds 500 lines (the swagger JSDoc is large), split the routes function into `src/generators/crud/expressRoutes.ts` and re-export it from `express.ts` so consumers import from one place.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/generators/crud-express.test.ts`
Expected: PASS.

- [ ] **Step 5: Repoint legacy source-grep assertions**

`tests/cli.test.ts` contains assertions that read `src/cli.ts` and grep for CRUD generator internals (`toCamelCase` usage in CRUD generators, `generateJoiValidation`). Update those `fs.readFileSync` targets from `src/cli.ts` to `src/generators/crud/express.ts` (and `src/generators/context.ts` for `crypto.randomBytes`/`generateSecret` when Task 9 removes them from cli.ts — check what still passes now, fix what breaks now).

Run: `npx vitest run tests/cli.test.ts`
Expected: PASS after repointing.

- [ ] **Step 6: Commit**

```bash
git add src/generators/crud/express.ts tests/generators/crud-express.test.ts tests/cli.test.ts
git commit -m "feat(generators): extract Express CRUD controller/routes/Joi templates"
```

---

### Task 6: CRUD templates — Elysia controller, routes, TypeBox validator (NEW code)

**Files:**
- Create: `src/generators/crud/elysia.ts`
- Create: `tests/generators/crud-elysia.test.ts`

**Interfaces:**
- Consumes: `FieldSpec`, naming helpers from `context.ts`.
- Produces:
  - `generateElysiaCrudController(modelName: string, fields: FieldSpec[]): string`
  - `generateTypeBoxValidator(modelName: string, fields: FieldSpec[]): string`
  - `generateElysiaCrudRoutes(modelName: string, fields: FieldSpec[], withTasks?: boolean): string`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/generators/crud-elysia.test.ts
import { describe, it, expect } from 'vitest';
import {
  generateElysiaCrudController, generateTypeBoxValidator, generateElysiaCrudRoutes,
} from '../../src/generators/crud/elysia';
import { FieldSpec } from '../../src/generators/context';

const fields: FieldSpec[] = [
  { name: 'title', type: 'String', required: true },
  { name: 'price', type: 'Number' },
  { name: 'active', type: 'Boolean' },
  { name: 'ownerId', type: 'ObjectId' },
];

describe('generateElysiaCrudController', () => {
  it('emits an object-literal controller that throws AppError and uses respond helpers', () => {
    const src = generateElysiaCrudController('Product', fields);
    expect(src).not.toContain(`from 'express'`);
    expect(src).toContain('export const productController = {');
    expect(src).toContain(`import ProductService from '../services/productService'`);
    expect(src).toContain(`throw new AppError('Product not found', 404)`);
    expect(src).toContain('set.status = 201');
    expect(src).toContain(`from '../utils/respond'`);
  });
});

describe('generateTypeBoxValidator', () => {
  it('maps field types to TypeBox and marks optional fields', () => {
    const src = generateTypeBoxValidator('Product', fields);
    expect(src).toContain(`import { t } from 'elysia'`);
    expect(src).toContain('export const createProductBody = t.Object({');
    expect(src).toContain('title: t.String()');
    expect(src).toContain('price: t.Optional(t.Number())');
    expect(src).toContain('ownerId: t.Optional(t.String())');
    expect(src).toContain('export const updateProductBody = t.Partial(createProductBody);');
  });
});

describe('generateElysiaCrudRoutes', () => {
  it('emits a prefixed Elysia router with auth macro and validators', () => {
    const src = generateElysiaCrudRoutes('Product', fields, true);
    expect(src).toContain(`new Elysia({ prefix: '/product' })`);
    expect(src).toContain('.use(authPlugin)');
    expect(src).toContain('auth: [Task.VIEW_PRODUCT]');
    expect(src).toContain('body: createProductBody');
    expect(src).toContain('params: idParam');
    expect(src).toContain('export const productRoutes');
  });
  it('uses auth: true when withTasks is false', () => {
    const src = generateElysiaCrudRoutes('Product', fields, false);
    expect(src).toContain('auth: true');
    expect(src).not.toContain('Task.');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/generators/crud-elysia.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/generators/crud/elysia.ts`**

Complete new module (mirrors the hand-written `templates/elysia` patterns: object-literal controllers using `success`/`paginated`, `throw AppError`, routes with `authPlugin` macro + `detail:` swagger + TypeBox schemas):

```ts
import { FieldSpec, capitalize, toCamelCase, toUpperSnakeCase } from '../context';

export const generateElysiaCrudController = (modelName: string, fields: FieldSpec[]): string => {
  const capitalizedName = capitalize(modelName);
  const camelCaseName = toCamelCase(modelName);
  return `import ${capitalizedName}Service from '../services/${camelCaseName}Service';
import { AppError } from '../utils/AppError';
import { success, paginated } from '../utils/respond';

export const ${camelCaseName}Controller = {
  /** List ${camelCaseName}s with pagination, search and sorting */
  async getAll({ query }: any) {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || parseInt(process.env.DEFAULT_PAGE_LIMIT || '10');
    const search = query.search as string | undefined;
    const sortBy = (query.sortBy as string) || 'createdAt';
    const sortOrder = ((query.sortOrder as string) === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';
    const result = await ${capitalizedName}Service.getAll({ page, limit, search, sortBy, sortOrder });
    return paginated('${capitalizedName}s retrieved successfully', result.data, result.pagination);
  },

  /** Get one ${camelCaseName} by id */
  async getById({ params }: any) {
    const item = await ${capitalizedName}Service.getById(params.id);
    if (!item) throw new AppError('${capitalizedName} not found', 404);
    return success('${capitalizedName} retrieved successfully', item);
  },

  /** Create a ${camelCaseName} */
  async create({ body, set }: any) {
    const item = await ${capitalizedName}Service.create(body);
    set.status = 201;
    return success('${capitalizedName} created successfully', item);
  },

  /** Update a ${camelCaseName} */
  async update({ params, body }: any) {
    const item = await ${capitalizedName}Service.update(params.id, body);
    if (!item) throw new AppError('${capitalizedName} not found', 404);
    return success('${capitalizedName} updated successfully', item);
  },

  /** Delete a ${camelCaseName} */
  async delete({ params }: any) {
    const deleted = await ${capitalizedName}Service.delete(params.id);
    if (!deleted) throw new AppError('${capitalizedName} not found', 404);
    return success('${capitalizedName} deleted successfully');
  }
};

export default ${camelCaseName}Controller;
`;
};

const typeBoxFor = (field: FieldSpec): string => {
  switch (field.type) {
    case 'String': return 't.String()';
    case 'Number': return 't.Number()';
    case 'Boolean': return 't.Boolean()';
    case 'Date': return `t.String({ format: 'date-time' })`;
    case 'ObjectId': return 't.String()';
    case 'Array': return 't.Array(t.Any())';
    default: return 't.Any()'; // Mixed, JSON
  }
};

export const generateTypeBoxValidator = (modelName: string, fields: FieldSpec[]): string => {
  const capitalizedName = capitalize(modelName);
  const props = fields.map((field) => {
    const base = typeBoxFor(field);
    const value = field.required ? base : `t.Optional(${base})`;
    return `  ${field.name}: ${value}`;
  }).join(',\n');
  return `import { t } from 'elysia';

export const create${capitalizedName}Body = t.Object({
${props}
});

export const update${capitalizedName}Body = t.Partial(create${capitalizedName}Body);
`;
};

export const generateElysiaCrudRoutes = (modelName: string, fields: FieldSpec[], withTasks: boolean = false): string => {
  const capitalizedName = capitalize(modelName);
  const camelCaseName = toCamelCase(modelName);
  const upperSnakeName = toUpperSnakeCase(modelName);
  const taskImport = withTasks ? `\nimport { Task } from '../enums/Task';` : '';
  const authFor = (op: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE'): string =>
    withTasks ? `[Task.${op}_${upperSnakeName}]` : 'true';
  return `import { Elysia, t } from 'elysia';
import { ${camelCaseName}Controller } from '../controllers/${camelCaseName}Controller';
import { authPlugin } from '../middleware/auth';${taskImport}
import { create${capitalizedName}Body, update${capitalizedName}Body } from '../validators/${camelCaseName}';

const tag = ['${capitalizedName}s'];
const secured = { security: [{ bearerAuth: [] }] };
const idParam = t.Object({ id: t.String() });

export const ${camelCaseName}Routes = new Elysia({ prefix: '/${camelCaseName}' })
  .use(authPlugin)
  .get('/', ${camelCaseName}Controller.getAll, {
    auth: ${authFor('VIEW')},
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      search: t.Optional(t.String()),
      sortBy: t.Optional(t.String()),
      sortOrder: t.Optional(t.String())
    }),
    detail: { tags: tag, summary: 'List ${capitalizedName}s', ...secured }
  })
  .get('/:id', ${camelCaseName}Controller.getById, {
    auth: ${authFor('VIEW')},
    params: idParam,
    detail: { tags: tag, summary: 'Get ${capitalizedName} by ID', ...secured }
  })
  .post('/', ${camelCaseName}Controller.create, {
    auth: ${authFor('CREATE')},
    body: create${capitalizedName}Body,
    detail: { tags: tag, summary: 'Create a ${capitalizedName}', ...secured }
  })
  .put('/:id', ${camelCaseName}Controller.update, {
    auth: ${authFor('UPDATE')},
    params: idParam,
    body: update${capitalizedName}Body,
    detail: { tags: tag, summary: 'Update a ${capitalizedName}', ...secured }
  })
  .delete('/:id', ${camelCaseName}Controller.delete, {
    auth: ${authFor('DELETE')},
    params: idParam,
    detail: { tags: tag, summary: 'Delete a ${capitalizedName}', ...secured }
  });

export default ${camelCaseName}Routes;
`;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/generators/crud-elysia.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generators/crud/elysia.ts tests/generators/crud-elysia.test.ts
git commit -m "feat(generators): add Elysia CRUD controller/routes/TypeBox validator templates"
```

---

### Task 7: `createModel` orchestration + route registration, CLI `model` command

**Files:**
- Create: `src/generators/model.ts`
- Create: `tests/generators/model.test.ts`
- Modify: `src/cli.ts` — model command (2222-2414); delete moved generator functions `generateTypeScriptModel` (608-645), `generateCRUDController` (892-1032), `generateCRUDService` (1035-1146), `generateCRUDRoutes` (1149-1346), `generateJoiValidation` (1349-1393), `updateMainRoutes` (1424-1471)

**Interfaces:**
- Consumes: Tasks 1-6 exports (`addTaskToEnum` from `./task`, all crud template functions).
- Produces:
  - `interface CreateModelOptions { projectRoot: string; name: string; fields: FieldSpec[]; crud?: boolean; tasks?: boolean; }`
  - `createModel(opts: CreateModelOptions): Promise<GeneratorResult>`
  - `registerRouteInIndex(projectRoot: string, framework: Framework, camelName: string): Promise<boolean>` (also used by Task 8's `editModel`)

- [ ] **Step 1: Write the failing tests**

```ts
// tests/generators/model.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { makeFakeProject } from '../helpers/fakeProject';
import { createModel } from '../../src/generators/model';
import { FieldSpec } from '../../src/generators/context';

const fields: FieldSpec[] = [
  { name: 'title', type: 'String', required: true },
  { name: 'price', type: 'Number', index: true },
];
const roots: string[] = [];
afterEach(async () => { while (roots.length) await fs.remove(roots.pop()!); });

describe('createModel (express)', () => {
  it('creates model only when crud=false', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    const result = await createModel({ projectRoot: root, name: 'Product', fields, crud: false });
    expect(await fs.pathExists(path.join(root, 'src', 'models', 'Product.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(root, 'src', 'controllers', 'productController.ts'))).toBe(false);
    expect(result.files.length).toBe(1);
  });
  it('creates the full express CRUD chain with tasks', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    const result = await createModel({ projectRoot: root, name: 'Product', fields, crud: true, tasks: true });
    for (const rel of [
      'src/models/Product.ts', 'src/controllers/productController.ts',
      'src/services/productService.ts', 'src/validators/product.ts', 'src/routes/product.ts',
    ]) {
      expect(await fs.pathExists(path.join(root, rel)), rel).toBe(true);
      expect(result.files).toContain(path.join(root, rel));
    }
    const routesIndex = await fs.readFile(path.join(root, 'src', 'routes', 'index.ts'), 'utf-8');
    expect(routesIndex).toContain(`import productRoutes from './product';`);
    expect(routesIndex).toContain(`router.use('/product', productRoutes);`);
    const taskEnum = await fs.readFile(path.join(root, 'src', 'enums', 'Task.ts'), 'utf-8');
    expect(taskEnum).toContain('VIEW_PRODUCT');
    expect(taskEnum).toContain('DELETE_PRODUCT');
    const routeFile = await fs.readFile(path.join(root, 'src', 'routes', 'product.ts'), 'utf-8');
    expect(routeFile).toContain('checkPermission(Task.VIEW_PRODUCT)');
  });
  it('every returned file exists on disk', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    const result = await createModel({ projectRoot: root, name: 'Order', fields, crud: true, tasks: false });
    for (const f of result.files) {
      expect(await fs.pathExists(f), f).toBe(true);
    }
  });
  it('throws DUPLICATE when the model exists', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    await createModel({ projectRoot: root, name: 'Product', fields });
    await expect(createModel({ projectRoot: root, name: 'Product', fields }))
      .rejects.toMatchObject({ code: 'DUPLICATE' });
  });
  it('rejects invalid field names', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    await expect(createModel({ projectRoot: root, name: 'Product', fields: [{ name: 'a\nb', type: 'String' }] }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});

describe('createModel (elysia)', () => {
  it('creates the elysia CRUD chain and registers the route in the chain', async () => {
    const root = await makeFakeProject('elysia'); roots.push(root);
    await createModel({ projectRoot: root, name: 'Product', fields, crud: true, tasks: true });
    const controller = await fs.readFile(path.join(root, 'src', 'controllers', 'productController.ts'), 'utf-8');
    expect(controller).not.toContain(`from 'express'`);
    expect(controller).toContain('export const productController = {');
    const validator = await fs.readFile(path.join(root, 'src', 'validators', 'product.ts'), 'utf-8');
    expect(validator).toContain('t.Object');
    const routesIndex = await fs.readFile(path.join(root, 'src', 'routes', 'index.ts'), 'utf-8');
    expect(routesIndex).toContain(`import { productRoutes } from './product';`);
    expect(routesIndex).toContain('.use(productRoutes);');
    expect(routesIndex.trimEnd().split('\n').filter(l => l.includes('.use(authRoutes);')).length).toBe(0); // semicolon moved
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/generators/model.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/generators/model.ts` (createModel + registration)**

```ts
import fs from 'fs-extra';
import path from 'path';
import {
  GeneratorResult, GeneratorError, resolveProject, capitalize, toCamelCase, toUpperSnakeCase,
  updateIndexExport, assertValidName, FieldSpec, Framework, FIELD_TYPES,
} from './context';
import { addTaskToEnum } from './task';
import { generateTypeScriptModel } from './crud/modelFile';
import { generateCRUDService } from './crud/service';
import { generateCRUDController, generateJoiValidation, generateCRUDRoutes } from './crud/express';
import { generateElysiaCrudController, generateTypeBoxValidator, generateElysiaCrudRoutes } from './crud/elysia';

export interface CreateModelOptions {
  projectRoot: string;
  name: string;
  fields: FieldSpec[];
  crud?: boolean;
  tasks?: boolean;
}

const validateFields = (fields: FieldSpec[]): void => {
  if (fields.length === 0) throw new GeneratorError('INVALID_INPUT', 'At least one field is required');
  for (const f of fields) {
    assertValidName(f.name, /^[a-zA-Z_][a-zA-Z0-9_]*$/, 'field name');
    if (!FIELD_TYPES.includes(f.type)) {
      throw new GeneratorError('INVALID_INPUT', `Unknown field type "${f.type}" (valid: ${FIELD_TYPES.join(', ')})`);
    }
    if (f.default !== undefined && /[\r\n]/.test(f.default)) {
      throw new GeneratorError('INVALID_INPUT', `Default value for ${f.name} must be a single line`);
    }
  }
};

// Express: moved verbatim from cli.ts:1424-1471 (updateMainRoutes), cwd → projectRoot param.
// Elysia: NEW — inserts `.use(xRoutes)` into the chain in routes/index.ts.
export const registerRouteInIndex = async (
  projectRoot: string, framework: Framework, camelName: string
): Promise<boolean> => {
  const indexPath = path.join(projectRoot, 'src', 'routes', 'index.ts');
  let content: string;
  try { content = await fs.readFile(indexPath, 'utf-8'); } catch { return false; }
  if (framework === 'express') {
    const importStatement = `import ${camelName}Routes from './${camelName}';`;
    const routeUsage = `router.use('/${camelName}', ${camelName}Routes);`;
    if (content.includes(importStatement)) return true;
    const lines = content.split('\n');
    let lastImportIndex = -1; let routerUseIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import') && lines[i].includes('from')) lastImportIndex = i;
      if (lines[i].includes('router.use') && lines[i].includes('Routes')) routerUseIndex = i;
    }
    if (lastImportIndex < 0 || routerUseIndex < 0) return false;
    lines.splice(lastImportIndex + 1, 0, importStatement);
    lines.splice(routerUseIndex + 2, 0, routeUsage); // +1 for inserted import, +1 to go after
    await fs.writeFile(indexPath, lines.join('\n'));
    return true;
  }
  // elysia
  const importStatement = `import { ${camelName}Routes } from './${camelName}';`;
  if (content.includes(importStatement)) return true;
  const lines = content.split('\n');
  let lastImportIndex = -1; let lastUseIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import') && lines[i].includes('from')) lastImportIndex = i;
    if (/^\s*\.use\(\w+Routes\);?\s*$/.test(lines[i])) lastUseIndex = i;
  }
  if (lastImportIndex < 0 || lastUseIndex < 0) return false;
  lines.splice(lastImportIndex + 1, 0, importStatement);
  lastUseIndex += 1;
  if (lines[lastUseIndex].trimEnd().endsWith(';')) {
    lines[lastUseIndex] = lines[lastUseIndex].replace(/;\s*$/, '');
    lines.splice(lastUseIndex + 1, 0, `  .use(${camelName}Routes);`);
  } else {
    lines.splice(lastUseIndex + 1, 0, `  .use(${camelName}Routes)`);
  }
  await fs.writeFile(indexPath, lines.join('\n'));
  return true;
};

export const createModel = async (opts: CreateModelOptions): Promise<GeneratorResult> => {
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, 'model name (PascalCase)');
  validateFields(opts.fields);
  const ctx = await resolveProject(opts.projectRoot);
  const capitalizedName = capitalize(opts.name);
  const camelName = toCamelCase(opts.name);
  const upperSnakeName = toUpperSnakeCase(opts.name);
  const files: string[] = [];
  const warnings: string[] = [...ctx.warnings];

  const modelPath = path.join(ctx.root, 'src', 'models', `${capitalizedName}.ts`);
  if (await fs.pathExists(modelPath)) {
    throw new GeneratorError('DUPLICATE', `Model already exists: ${modelPath}`);
  }
  await fs.ensureDir(path.dirname(modelPath));
  await fs.writeFile(modelPath, generateTypeScriptModel(opts.name, opts.fields));
  files.push(modelPath);
  await updateIndexExport(
    path.join(ctx.root, 'src', 'models'),
    `export { default as ${capitalizedName}, I${capitalizedName} } from './${capitalizedName}';`
  );

  if (!opts.crud) return { files, warnings };

  // RBAC tasks first, so routes stay consistent with the enum (legacy cli.ts:2312-2331 behavior)
  let withTasks = !!opts.tasks;
  if (withTasks) {
    const taskEntries = [
      { key: `VIEW_${upperSnakeName}`, desc: `View the list of ${camelName}s and ${camelName} details` },
      { key: `CREATE_${upperSnakeName}`, desc: `Create new ${camelName} records` },
      { key: `UPDATE_${upperSnakeName}`, desc: `Update existing ${camelName} records` },
      { key: `DELETE_${upperSnakeName}`, desc: `Delete ${camelName} records` },
    ];
    let added = 0;
    for (const entry of taskEntries) {
      if (await addTaskToEnum(ctx.root, entry.key, entry.desc)) added++;
    }
    if (added > 0) {
      files.push(path.join(ctx.root, 'src', 'enums', 'Task.ts'));
    } else {
      withTasks = false;
      warnings.push('No RBAC tasks were added (Task.ts missing or entries already exist) — routes generated without permission middleware');
    }
  }

  const isElysia = ctx.framework === 'elysia';
  const writes: Array<{ file: string; content: string; barrelDir?: string; barrelLine?: string }> = [
    {
      file: path.join(ctx.root, 'src', 'controllers', `${camelName}Controller.ts`),
      content: isElysia ? generateElysiaCrudController(opts.name, opts.fields) : generateCRUDController(opts.name, opts.fields),
      barrelDir: path.join(ctx.root, 'src', 'controllers'),
      barrelLine: `export { default as ${camelName}Controller } from './${camelName}Controller';`,
    },
    {
      file: path.join(ctx.root, 'src', 'services', `${camelName}Service.ts`),
      content: generateCRUDService(opts.name, opts.fields),
      barrelDir: path.join(ctx.root, 'src', 'services'),
      barrelLine: `export * from './${camelName}Service';`,
    },
    {
      file: path.join(ctx.root, 'src', 'validators', `${camelName}.ts`),
      content: isElysia ? generateTypeBoxValidator(opts.name, opts.fields) : generateJoiValidation(opts.name, opts.fields),
    },
    {
      file: path.join(ctx.root, 'src', 'routes', `${camelName}.ts`),
      content: isElysia ? generateElysiaCrudRoutes(opts.name, opts.fields, withTasks) : generateCRUDRoutes(opts.name, opts.fields, withTasks),
    },
  ];
  for (const w of writes) {
    await fs.ensureDir(path.dirname(w.file));
    await fs.writeFile(w.file, w.content);
    files.push(w.file);
    if (w.barrelDir && w.barrelLine) await updateIndexExport(w.barrelDir, w.barrelLine);
  }

  const registered = await registerRouteInIndex(ctx.root, ctx.framework, camelName);
  if (!registered) {
    warnings.push(
      ctx.framework === 'express'
        ? `Could not update src/routes/index.ts — add manually: router.use('/${camelName}', ${camelName}Routes);`
        : `Could not update src/routes/index.ts — add manually: .use(${camelName}Routes)`
    );
  }
  return { files, warnings };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/generators/model.test.ts`
Expected: PASS.

- [ ] **Step 5: Rewire the CLI `model` command**

Keep the interactive field loop byte-identical (all 6 prompts per field, same type menu 1-8, `done` sentinel, CRUD + tasks questions). Collect answers into `FieldSpec[]` — the "Add index?" answer now populates `index` (previously collected as `indexed` and discarded; the generator now emits it — call this out in the summary output). After `rl.close()`, call `createModel({ projectRoot: process.cwd(), name: modelName, fields, crud: generateCRUD, tasks: withTasks })`, print `result.files` and `result.warnings`, use the GeneratorError catch pattern (exit 1). Delete the six moved functions from `cli.ts` (list in **Files** above).

- [ ] **Step 6: Run existing interactive model tests**

Run: `npx vitest run tests/commands.test.ts -t model`
Expected: PASS (model without CRUD, model with CRUD, routes/index.ts updated).

- [ ] **Step 7: Commit**

```bash
git add src/generators/model.ts tests/generators/model.test.ts src/cli.ts
git commit -m "feat(generators): createModel orchestration with framework-aware CRUD chain"
```

---

### Task 8: `editModel` + CLI `model:edit`

**Files:**
- Modify: `src/generators/model.ts` (add `parseExistingModel`, `editModel`)
- Create: `tests/generators/edit-model.test.ts`
- Modify: `src/cli.ts` — model:edit command (2803-3029); delete `parseExistingModel` (177-217), `checkCRUDExists` (220-233), `createBackupWithNewCode` (236-263, dead), `readExistingSchemas` (266-276, dead)

**Interfaces:**
- Consumes: Task 7's module internals.
- Produces:
  - `parseExistingModel(projectRoot: string, name: string): Promise<FieldSpec[]>` — throws `IO_ERROR` if the model file is missing or unparsable
  - `interface EditModelOptions { projectRoot: string; name: string; addFields?: FieldSpec[]; removeFields?: string[]; updateCrud?: boolean; }`
  - `editModel(opts: EditModelOptions): Promise<GeneratorResult>`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/generators/edit-model.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { makeFakeProject } from '../helpers/fakeProject';
import { createModel, editModel, parseExistingModel } from '../../src/generators/model';
import { FieldSpec } from '../../src/generators/context';

const fields: FieldSpec[] = [{ name: 'title', type: 'String', required: true }];
const roots: string[] = [];
afterEach(async () => { while (roots.length) await fs.remove(roots.pop()!); });

describe('parseExistingModel', () => {
  it('round-trips fields written by createModel', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    await createModel({ projectRoot: root, name: 'Product', fields });
    const parsed = await parseExistingModel(root, 'Product');
    expect(parsed).toEqual([{ name: 'title', type: 'String', required: true, unique: false, default: undefined }]);
  });
  it('throws IO_ERROR for a missing model', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    await expect(parseExistingModel(root, 'Nope')).rejects.toMatchObject({ code: 'IO_ERROR' });
  });
});

describe('editModel', () => {
  it('adds a field and regenerates CRUD with .bak backups, preserving permissions', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    await createModel({ projectRoot: root, name: 'Product', fields, crud: true, tasks: true });
    const result = await editModel({
      projectRoot: root, name: 'Product',
      addFields: [{ name: 'price', type: 'Number' }], updateCrud: true,
    });
    const model = await fs.readFile(path.join(root, 'src', 'models', 'Product.ts'), 'utf-8');
    expect(model).toContain('price');
    for (const rel of ['src/controllers/productController.ts.bak', 'src/services/productService.ts.bak',
                       'src/routes/product.ts.bak', 'src/validators/product.ts.bak']) {
      expect(await fs.pathExists(path.join(root, rel)), rel).toBe(true);
    }
    // Fix for legacy bug: permission middleware must survive an edit
    const routeFile = await fs.readFile(path.join(root, 'src', 'routes', 'product.ts'), 'utf-8');
    expect(routeFile).toContain('checkPermission(Task.VIEW_PRODUCT)');
    // Fix for legacy bug: validator regenerated too
    const validator = await fs.readFile(path.join(root, 'src', 'validators', 'product.ts'), 'utf-8');
    expect(validator).toContain('price: Joi.number()');
    expect(result.files.length).toBeGreaterThanOrEqual(5);
  });
  it('removes a field', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    await createModel({ projectRoot: root, name: 'Product', fields: [...fields, { name: 'obsolete', type: 'String' }] });
    await editModel({ projectRoot: root, name: 'Product', removeFields: ['obsolete'] });
    const model = await fs.readFile(path.join(root, 'src', 'models', 'Product.ts'), 'utf-8');
    expect(model).not.toContain('obsolete');
  });
  it('throws INVALID_INPUT when removing a nonexistent field', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    await createModel({ projectRoot: root, name: 'Product', fields });
    await expect(editModel({ projectRoot: root, name: 'Product', removeFields: ['ghost'] }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('throws INVALID_INPUT when adding a duplicate field', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    await createModel({ projectRoot: root, name: 'Product', fields });
    await expect(editModel({ projectRoot: root, name: 'Product', addFields: [{ name: 'title', type: 'String' }] }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/generators/edit-model.test.ts`
Expected: FAIL — `editModel`/`parseExistingModel` not exported.

- [ ] **Step 3: Implement in `src/generators/model.ts`**

`parseExistingModel`: regex logic moved verbatim from `cli.ts:177-217` (cwd → projectRoot; missing file / no schema match → throw `GeneratorError('IO_ERROR', ...)` instead of returning empty). Note the legacy parser sets `unique: false` and `default: undefined` explicitly — the round-trip test above matches that shape.

`editModel` (new orchestration):

```ts
export interface EditModelOptions {
  projectRoot: string;
  name: string;
  addFields?: FieldSpec[];
  removeFields?: string[];
  updateCrud?: boolean;
}

export const editModel = async (opts: EditModelOptions): Promise<GeneratorResult> => {
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, 'model name (PascalCase)');
  const ctx = await resolveProject(opts.projectRoot);
  const capitalizedName = capitalize(opts.name);
  const camelName = toCamelCase(opts.name);
  const files: string[] = [];
  const warnings: string[] = [...ctx.warnings];

  let updatedFields = await parseExistingModel(ctx.root, opts.name);
  for (const removeName of opts.removeFields ?? []) {
    if (!updatedFields.some(f => f.name === removeName)) {
      throw new GeneratorError('INVALID_INPUT', `Field "${removeName}" does not exist on ${capitalizedName}`);
    }
    updatedFields = updatedFields.filter(f => f.name !== removeName);
  }
  if (opts.addFields?.length) {
    validateFields(opts.addFields);
    for (const f of opts.addFields) {
      if (updatedFields.some(existing => existing.name === f.name)) {
        throw new GeneratorError('INVALID_INPUT', `Field "${f.name}" already exists on ${capitalizedName}`);
      }
    }
    updatedFields = [...updatedFields, ...opts.addFields];
  }
  if (updatedFields.length === 0) {
    throw new GeneratorError('INVALID_INPUT', 'Cannot remove all fields from a model');
  }

  const modelPath = path.join(ctx.root, 'src', 'models', `${capitalizedName}.ts`);
  await fs.writeFile(modelPath, generateTypeScriptModel(opts.name, updatedFields));
  files.push(modelPath);

  if (opts.updateCrud) {
    const isElysia = ctx.framework === 'elysia';
    const routePath = path.join(ctx.root, 'src', 'routes', `${camelName}.ts`);
    // Legacy bug fix: detect whether the existing routes used RBAC so the regen keeps it
    let withTasks = false;
    if (await fs.pathExists(routePath)) {
      const existingRoutes = await fs.readFile(routePath, 'utf-8');
      withTasks = existingRoutes.includes('checkPermission(') || existingRoutes.includes('auth: [Task.');
    }
    const regens: Array<{ file: string; content: string }> = [
      { file: path.join(ctx.root, 'src', 'controllers', `${camelName}Controller.ts`),
        content: isElysia ? generateElysiaCrudController(opts.name, updatedFields) : generateCRUDController(opts.name, updatedFields) },
      { file: path.join(ctx.root, 'src', 'services', `${camelName}Service.ts`),
        content: generateCRUDService(opts.name, updatedFields) },
      { file: path.join(ctx.root, 'src', 'validators', `${camelName}.ts`),
        content: isElysia ? generateTypeBoxValidator(opts.name, updatedFields) : generateJoiValidation(opts.name, updatedFields) },
      { file: routePath,
        content: isElysia ? generateElysiaCrudRoutes(opts.name, updatedFields, withTasks) : generateCRUDRoutes(opts.name, updatedFields, withTasks) },
    ];
    for (const r of regens) {
      if (!(await fs.pathExists(r.file))) {
        warnings.push(`${path.relative(ctx.root, r.file)} did not exist — skipped`);
        continue;
      }
      const previous = await fs.readFile(r.file, 'utf-8');
      await fs.writeFile(r.file + '.bak', previous);
      await fs.writeFile(r.file, r.content);
      files.push(r.file);
    }
  }
  return { files, warnings };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/generators/edit-model.test.ts`
Expected: PASS.

- [ ] **Step 5: Rewire CLI `model:edit`**

Keep the interactive menu loop byte-identical (actions 1-4, sub-prompts). Track `addFields`/`removeFields` arrays from the user's menu actions; on Save (action 3) ask the existing "Update CRUD operations with new schema? (y/n)" when CRUD files exist (keep `checkCRUDExists` logic inline in cli.ts or reimplement as a 3-line pathExists check), then call `editModel`. "Model not found" now exits 1 (GeneratorError). Delete `parseExistingModel`, `checkCRUDExists`, `createBackupWithNewCode`, `readExistingSchemas` from `cli.ts`.

- [ ] **Step 6: Run existing model:edit tests**

Run: `npx vitest run tests/commands.test.ts -t "model:edit"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/generators/model.ts tests/generators/edit-model.test.ts src/cli.ts
git commit -m "feat(generators): editModel with permission-preserving CRUD regen and validator refresh"
```

---

### Task 9: `createProject` + CLI `new`, purge cli.ts dead code

**Files:**
- Create: `src/generators/project.ts`
- Create: `tests/generators/project.test.ts`
- Modify: `src/cli.ts` — new command (2565-2800); delete `generateEssentialFiles` (1474-2214), `projectTemplates` (279-605), `availableDataTypes` (63-74), `getVersion` (10-23, import from context instead), `generateSecret` (26-28)

**Interfaces:**
- Consumes: `context.ts` (`templatesDir`, `generateSecret`, `getVersion`, `GeneratorError`, `Framework`).
- Produces:
  - `interface CreateProjectOptions { name: string; framework?: Framework; directory?: string; skipInstall?: boolean; log?: (msg: string) => void; }`
  - `createProject(opts: CreateProjectOptions): Promise<GeneratorResult & { projectPath: string }>`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/generators/project.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { createProject } from '../../src/generators/project';

const dirs: string[] = [];
const tmp = async () => { const d = await fs.mkdtemp(path.join(os.tmpdir(), 'koti-proj-')); dirs.push(d); return d; };
afterEach(async () => { while (dirs.length) await fs.remove(dirs.pop()!); });

describe('createProject', () => {
  it('scaffolds an express project with secrets and koti.config.json (skipInstall)', async () => {
    const parent = await tmp();
    const result = await createProject({ name: 'my-api', framework: 'express', directory: parent, skipInstall: true });
    const root = path.join(parent, 'my-api');
    expect(result.projectPath).toBe(root);
    const config = await fs.readJson(path.join(root, 'koti.config.json'));
    expect(config.framework).toBe('express');
    const env = await fs.readFile(path.join(root, '.env'), 'utf-8');
    expect(env).not.toContain('REPLACE_WITH_AUTO_GENERATED_SECRET');
    expect(env).toMatch(/JWT_SECRET=[0-9a-f]{128}/);
    expect(await fs.pathExists(path.join(root, 'src', 'server.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(root, 'src', 'models', 'User.ts'))).toBe(true);   // shared layer
    expect(await fs.pathExists(path.join(root, 'src', 'routes', 'auth.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(root, 'node_modules'))).toBe(false);              // skipInstall honored
    const pkg = await fs.readJson(path.join(root, 'package.json'));
    expect(pkg.name).toBe('my-api');
    // Regression: generated express routes/index.ts must not reference getVersion()
    const routesIndex = await fs.readFile(path.join(root, 'src', 'routes', 'index.ts'), 'utf-8');
    expect(routesIndex).not.toContain('getVersion()');
  }, 60000);
  it('scaffolds an elysia project', async () => {
    const parent = await tmp();
    await createProject({ name: 'ely-api', framework: 'elysia', directory: parent, skipInstall: true });
    const root = path.join(parent, 'ely-api');
    expect((await fs.readJson(path.join(root, 'koti.config.json'))).framework).toBe('elysia');
    const server = await fs.readFile(path.join(root, 'src', 'server.ts'), 'utf-8');
    expect(server).toContain('Elysia');
    expect(await fs.pathExists(path.join(root, 'src', 'models', 'User.ts'))).toBe(true);
  }, 60000);
  it('rejects bad names, bad frameworks, and existing targets', async () => {
    const parent = await tmp();
    await expect(createProject({ name: 'Bad Name', directory: parent, skipInstall: true }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(createProject({ name: 'ok', framework: 'fastify' as any, directory: parent, skipInstall: true }))
      .rejects.toMatchObject({ code: 'UNSUPPORTED_FRAMEWORK' });
    await fs.ensureDir(path.join(parent, 'taken'));
    await fs.writeFile(path.join(parent, 'taken', 'x.txt'), 'x');
    await expect(createProject({ name: 'taken', directory: parent, skipInstall: true }))
      .rejects.toMatchObject({ code: 'DUPLICATE' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/generators/project.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/generators/project.ts`**

Move the `new` command's generation pipeline (`cli.ts:2565-2754`) and the LIVE parts of `generateEssentialFiles` (`indexRouteContent` 1478-1534, `authRouteContent` 1536-1718, express-only write 1723-1729, .env secret injection 2000-2039/2211-2213) into `createProject`. The ~700 lines of dead template literals in `generateEssentialFiles` (1732-2197: authController/authMiddleware/errorHandler/authService/tokenUtils) are DELETED, not moved. Deliberate changes from legacy:

1. Signature/validation first: name must match `/^[a-z0-9-]+$/` (`INVALID_INPUT`), framework must be in `FRAMEWORKS` (`UNSUPPORTED_FRAMEWORK`, default `'express'`), `directory` (default `process.cwd()`) must exist and be a directory (`INVALID_INPUT`); target `path.join(directory, name)` must NOT already exist non-empty (`DUPLICATE`) — this replaces the old ensureDir-then-race pattern.
2. `skipInstall: true` skips the install step entirely (the parameter finally works).
3. Install is `spawn`-based, not `execSync`, with an `error` handler and kill-on-timeout:

```ts
import { spawn } from 'child_process';

const runInstall = (cwd: string, cmd: string, timeoutMs: number, log?: (m: string) => void): Promise<boolean> =>
  new Promise((resolve) => {
    const child = spawn(cmd, ['install'], { cwd, stdio: 'ignore', shell: process.platform === 'win32' });
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(false); }, timeoutMs);
    child.on('error', () => { clearTimeout(timer); resolve(false); });   // fixes crash-the-server vector
    child.on('close', (code) => { clearTimeout(timer); resolve(code === 0); });
  });

// in createProject, when !opts.skipInstall:
//   bun first (150s), npm fallback (150s); on both failing push a warning
//   'Dependencies not installed — run "bun install" (or npm install) inside the project'
//   and never throw. files/warnings semantics as elsewhere.
```

4. The generated express `routes/index.ts` template (old 1478-1534) has a bug: it embeds `version: getVersion()` (a function that does not exist in the generated project). Replace that interpolation with the koti version as a string literal at generation time: `` version: '${getVersion()}' `` — the generated file then contains e.g. `version: '3.1.0'`.
5. `koti.config.json` write and template copy/`{{PROJECT_NAME}}` replacement logic move verbatim (paths via `templatesDir()` instead of `__dirname` directly).
6. Return `{ projectPath, files, warnings }` where `files` lists the top-level artifacts written (`package.json`, `.env`, `koti.config.json`, `src/` noted as a tree count warning-free) — precise rule: push `projectPath` itself plus every file `createProject` explicitly writes (not the recursive template copies).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/generators/project.test.ts`
Expected: PASS.

- [ ] **Step 5: Rewire CLI `new` and purge dead code**

The `new` command keeps: kebab-case arg validation message, the TTY framework prompt (byte-identical), `--framework` flag validation (invalid → red + exit 1), the next-steps/disclaimer console block (moved into the action, printed from `result`). It calls `createProject({ name, framework, log: (m) => console.log(m) })` and prints warnings. Delete from `cli.ts`: `generateEssentialFiles` (1474-2214), `projectTemplates` (279-605), `availableDataTypes` (63-74), local `getVersion` (10-23) and `generateSecret` (26-28) — import both from `./generators/context`. `program.version(getVersion())` now uses the import. After this task `cli.ts` should be roughly 900-1100 lines (prompt flows + colors + readline helpers + command wiring only). Check: `wc -l src/cli.ts`.

- [ ] **Step 6: Repoint remaining legacy assertions and run the full suite**

`tests/cli.test.ts` greps `src/cli.ts` for `generateSecret`/`crypto.randomBytes` — repoint those reads to `src/generators/context.ts`. Then:

Run: `npm test`
Expected: ALL PASS — including the long-running `koti new` integration tests (they exercise the real bun/npm install path; 180-200s timeouts).

- [ ] **Step 7: Commit**

```bash
git add src/generators/project.ts tests/generators/project.test.ts src/cli.ts tests/cli.test.ts
git commit -m "feat(generators): createProject with skipInstall, hardened install, dead-code purge (-~1500 lines)"
```

---

### Task 10: MCP server rewrite — 9 tools calling generators in-process

**Files:**
- Modify: `src/mcp-server.ts` (full rewrite of tool/resource internals; registration structure stays)

**Interfaces:**
- Consumes: all generator modules; `getVersion`, `GeneratorError`, `resolveProject`, `FIELD_TYPES` from `context.ts`.
- Produces: MCP tools `create_project`, `create_model`, `edit_model` (NEW), `create_controller`, `create_service`, `create_middleware`, `create_enum`, `create_task`, `seed_database`; resources/prompts as below. (Task 11's integration test consumes these tool names and shapes.)

- [ ] **Step 1: Rewrite the server**

Delete: `runKotiCommand`, `stripAnsi`, local `getVersion`, local `isKotiProject`. Keep: `walkDir`, `getExistingModels`, `getExistingTasks`, server/transport bootstrap. Add at top:

```ts
import {
  GeneratorError, getVersion, resolveProject, FIELD_TYPES, FieldSpec,
} from './generators/context';
import { createProject } from './generators/project';
import { createModel, editModel } from './generators/model';
import { createEnum } from './generators/enum';
import { createTask } from './generators/task';
import { createController } from './generators/controller';
import { createService } from './generators/service';
import { createMiddleware } from './generators/middleware';

// Project root for RESOURCES (client-spawned stdio servers have a meaningless cwd)
const rootArgIdx = process.argv.indexOf('--project-root');
const PROJECT_ROOT =
  (rootArgIdx >= 0 && process.argv[rootArgIdx + 1]) ||
  process.env.KOTI_PROJECT_ROOT ||
  process.cwd();

const ok = (text: string, files: string[] = [], warnings: string[] = []) => ({
  content: [{
    type: 'text' as const,
    text: [text,
      files.length ? `\nFiles created/updated:\n${files.map(f => `  - ${f}`).join('\n')}` : '',
      warnings.length ? `\nWarnings:\n${warnings.map(w => `  ⚠ ${w}`).join('\n')}` : '',
    ].filter(Boolean).join('\n'),
  }],
});

const fail = (error: unknown) => ({
  isError: true,
  content: [{
    type: 'text' as const,
    text: error instanceof GeneratorError
      ? `[${error.code}] ${error.message}`
      : `Unexpected error: ${(error as Error).message}`,
  }],
});

const requireAbsolute = (p: string, what: string): string => {
  if (!path.isAbsolute(p)) {
    throw new GeneratorError('INVALID_INPUT', `${what} must be an absolute path (got "${p}")`);
  }
  return p;
};
```

Tool handlers (all follow this pattern — full list of schema changes below):

```ts
server.registerTool(
  'create_project',
  {
    title: 'Create Project',
    description: 'Scaffold a complete Bun + MongoDB API project with your choice of Express or Elysia framework (JWT auth, RBAC, audit, documents/S3, tinyURL, Swagger, email).',
    inputSchema: {
      projectName: z.string().regex(/^[a-z0-9-]+$/, 'Must be kebab-case (e.g. "my-api")')
        .describe('Project name in kebab-case (used as directory name and DB name)'),
      framework: z.enum(['express', 'elysia']).optional().default('express')
        .describe('Web framework for the generated project'),
      directory: z.string().optional()
        .describe('ABSOLUTE parent directory to create the project in. Defaults to the server process cwd.'),
      skipInstall: z.boolean().optional().default(false)
        .describe('Skip running bun/npm install after scaffolding'),
    },
    annotations: { title: 'Create Project', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ projectName, framework, directory, skipInstall }) => {
    try {
      if (directory !== undefined) requireAbsolute(directory, 'directory');
      const result = await createProject({ name: projectName, framework, directory, skipInstall });
      return ok(`Project "${projectName}" created at ${result.projectPath} (framework: ${framework}).`, result.files, result.warnings);
    } catch (error) { return fail(error); }
  }
);
```

Remaining tools — schema deltas vs the legacy server, all handlers use the try/`ok(...)`/`fail(...)` pattern and `requireAbsolute(projectPath, 'projectPath')`:

- `create_model`: `type: z.enum(['String','Number','Date','Boolean','ObjectId','Array','Mixed','JSON'])` (the 8 real types — `Decimal128`/`Map`/`Schema` and the dead `ref` param are REMOVED); field `name` gains `.regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)`; per-field `index: z.boolean().optional().default(false)` and `default: z.string().optional()` are ADDED. Handler maps fields to `FieldSpec[]` and calls `createModel({ projectRoot: projectPath, name: modelName, fields, crud: generateCrud, tasks: generateTasks })`.
- `edit_model` (NEW): `modelName` (PascalCase regex), `addFields` (same field object array as create_model, optional), `removeFields: z.array(z.string()).optional()`, `updateCrud: z.boolean().optional().default(true)`, `projectPath`. Calls `editModel`. Description: 'Add or remove fields on an existing model; regenerates CRUD files with .bak backups.'
- `create_enum`: keys already validated by the generator; handler calls `createEnum`. (No more stdin `1`/`2` — the always-failing path is gone by construction.)
- `create_task`: `taskName` regex widened to `/^[A-Z][A-Z0-9_]*$/` (digits allowed, must start with a letter); handler calls `createTask` — duplicate/missing-Task.ts/unparsable now surface as `[DUPLICATE]`/`[IO_ERROR]` errors instead of fabricated successes.
- `create_controller`/`create_service`/`create_middleware`: name gains `.regex(/^[A-Z][a-zA-Z0-9]*$/)` for controller/service; middleware accepts `/^[A-Za-z][a-zA-Z0-9]*$/` (the CLI camelCases it — pass through and let the generator normalize via `toCamelCase`). Handlers call the respective generators.
- `seed_database`: handler validates the project first (`await resolveProject(projectPath)` — closes the run-anything-vector), then async spawn instead of execSync:

```ts
const runSeed = (cwd: string, script: string): Promise<{ code: number | null; output: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', script], { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
    let output = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new GeneratorError('IO_ERROR', `Seed timed out after 120s.\nOutput so far:\n${output}`));
    }, 120_000);
    child.stdout!.on('data', (d) => { output += d.toString(); });
    child.stderr!.on('data', (d) => { output += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); reject(new GeneratorError('IO_ERROR', `Failed to spawn npm: ${err.message}`)); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, output }); });
  });
// handler: const { code, output } = await runSeed(projectPath, seedType === 'roles' ? 'seed:roles' : 'seed');
// code !== 0 → return fail(new GeneratorError('IO_ERROR', `Seeding failed (exit ${code}):\n${output}`));
// else → ok(`Database seeded (${seedType}).\n${output}`)
```

Resources: replace every `process.cwd()` with `PROJECT_ROOT` (3 sites). Replace the `isKotiProject` check in `project-structure` with `try { await resolveProject(PROJECT_ROOT) } catch { return 'Not a Koti project...' }`.

Prompts: in `scaffold-api`, change the text line `I want to create a new Bun + Express + MongoDB API project` → `I want to create a new Bun + MongoDB API project (Express or Elysia — ask me which, or default to Express)` and add step `1.5` mentioning the `framework` parameter. `add-crud-model` text unchanged.

Server version line stays `new McpServer({ name: 'koti-mcp', version: getVersion() })` (now the context import).

- [ ] **Step 2: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean compile; `dist/cli.js` and `dist/mcp-server.js` rebuilt.

- [ ] **Step 3: Manual smoke (quick)**

Run: `printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n' | node dist/mcp-server.js | head -5`
Expected: initialize result then a tools/list result naming all 9 tools.

- [ ] **Step 4: Commit**

```bash
git add src/mcp-server.ts
git commit -m "feat(mcp): rewrite server on shared generators — 9 tools, real errors, no stdin puppeteering"
```

---

### Task 11: MCP stdio integration test

**Files:**
- Create: `tests/helpers/mcpClient.ts`, `tests/mcp-server.test.ts`

**Interfaces:**
- Consumes: the built `dist/mcp-server.js` from Task 10.
- Produces: the regression net that would have caught the entire v3.0 breakage class.

- [ ] **Step 1: Write the helper and the test**

```ts
// tests/helpers/mcpClient.ts
import { spawn, ChildProcess } from 'child_process';

export class McpTestClient {
  private child: ChildProcess;
  private buffer = '';
  private pending = new Map<number, (msg: any) => void>();
  private nextId = 1;

  constructor(serverPath: string, env: Record<string, string> = {}) {
    this.child = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
    this.child.stdout!.on('data', (d) => {
      this.buffer += d.toString();
      let idx;
      while ((idx = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, idx);
        this.buffer = this.buffer.slice(idx + 1);
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined && this.pending.has(msg.id)) {
            this.pending.get(msg.id)!(msg);
            this.pending.delete(msg.id);
          }
        } catch { /* non-JSON line on stdout — ignore */ }
      }
    });
  }

  request(method: string, params: any = {}): Promise<any> {
    const id = this.nextId++;
    const promise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), 90_000);
      this.pending.set(id, (msg) => { clearTimeout(timer); resolve(msg); });
    });
    this.child.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    return promise;
  }

  notify(method: string, params: any = {}): void {
    this.child.stdin!.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  }

  async init(): Promise<any> {
    const res = await this.request('initialize', {
      protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'vitest', version: '1.0' },
    });
    this.notify('notifications/initialized');
    return res;
  }

  callTool(name: string, args: any): Promise<any> {
    return this.request('tools/call', { name, arguments: args });
  }

  kill(): void { this.child.kill(); }
}
```

```ts
// tests/mcp-server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { McpTestClient } from './helpers/mcpClient';

const SERVER = path.join(__dirname, '..', 'dist', 'mcp-server.js');
let client: McpTestClient;
let workDir: string;
let projectPath: string;

beforeAll(async () => {
  execSync('npm run build', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'koti-mcp-it-'));
  projectPath = path.join(workDir, 'it-api');
  client = new McpTestClient(SERVER, { KOTI_PROJECT_ROOT: projectPath });
  const init = await client.init();
  expect(init.result.serverInfo.name).toBe('koti-mcp');
}, 180_000);

afterAll(async () => {
  client?.kill();
  if (workDir) await fs.remove(workDir);
});

describe('koti-mcp end to end', () => {
  it('lists all 9 tools', async () => {
    const res = await client.request('tools/list');
    const names = res.result.tools.map((t: any) => t.name).sort();
    expect(names).toEqual([
      'create_controller', 'create_enum', 'create_middleware', 'create_model', 'create_project',
      'create_service', 'create_task', 'edit_model', 'seed_database',
    ]);
  });

  it('create_project scaffolds an elysia project without installing', async () => {
    const res = await client.callTool('create_project', {
      projectName: 'it-api', framework: 'elysia', directory: workDir, skipInstall: true,
    });
    expect(res.result.isError).toBeFalsy();
    expect((await fs.readJson(path.join(projectPath, 'koti.config.json'))).framework).toBe('elysia');
    expect(await fs.pathExists(path.join(projectPath, 'node_modules'))).toBe(false);
  }, 120_000);

  it('create_model generates a real elysia CRUD chain — files exist on disk', async () => {
    const res = await client.callTool('create_model', {
      modelName: 'Product',
      fields: [
        { name: 'title', type: 'String', required: true },
        { name: 'price', type: 'Number', index: true },
      ],
      generateCrud: true, generateTasks: true, projectPath,
    });
    expect(res.result.isError).toBeFalsy();
    for (const rel of ['src/models/Product.ts', 'src/controllers/productController.ts',
                       'src/services/productService.ts', 'src/validators/product.ts', 'src/routes/product.ts']) {
      expect(await fs.pathExists(path.join(projectPath, rel)), rel).toBe(true);
    }
    const controller = await fs.readFile(path.join(projectPath, 'src', 'controllers', 'productController.ts'), 'utf-8');
    expect(controller).not.toContain(`from 'express'`);
    expect(res.result.content[0].text).toContain('src/models/Product.ts'.split('/').join(path.sep));
  });

  it('create_enum actually creates the enum (the legacy always-failed case)', async () => {
    const res = await client.callTool('create_enum', {
      enumName: 'OrderStatus', enumType: 'string',
      values: [{ key: 'PENDING', value: 'pending' }], projectPath,
    });
    expect(res.result.isError).toBeFalsy();
    expect(await fs.pathExists(path.join(projectPath, 'src', 'enums', 'OrderStatus.ts'))).toBe(true);
  });

  it('duplicate create_enum returns isError with DUPLICATE, not fake success', async () => {
    const res = await client.callTool('create_enum', {
      enumName: 'OrderStatus', enumType: 'string',
      values: [{ key: 'PENDING', value: 'pending' }], projectPath,
    });
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].text).toContain('DUPLICATE');
  });

  it('edit_model adds a field with backups', async () => {
    const res = await client.callTool('edit_model', {
      modelName: 'Product', addFields: [{ name: 'stock', type: 'Number' }], updateCrud: true, projectPath,
    });
    expect(res.result.isError).toBeFalsy();
    expect(await fs.pathExists(path.join(projectPath, 'src', 'controllers', 'productController.ts.bak'))).toBe(true);
    const model = await fs.readFile(path.join(projectPath, 'src', 'models', 'Product.ts'), 'utf-8');
    expect(model).toContain('stock');
  });

  it('create_task rejects bad projectPath with a typed error (no crash, no hang)', async () => {
    const res = await client.callTool('create_task', {
      taskName: 'MANAGE_X', description: 'x', projectPath: path.join(workDir, 'does-not-exist'),
    });
    expect(res.result.isError).toBe(true);
    // server must still be alive:
    const alive = await client.request('tools/list');
    expect(alive.result.tools.length).toBe(9);
  });

  it('resources resolve against KOTI_PROJECT_ROOT', async () => {
    const res = await client.request('resources/read', { uri: 'koti://project/models' });
    expect(res.result.contents[0].text).toContain('Product');
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `npx vitest run tests/mcp-server.test.ts`
Expected: PASS (all 8 its). This test is the spec's success criterion #1 and #2 in executable form.

- [ ] **Step 3: Run the whole suite**

Run: `npm test`
Expected: ALL PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/helpers/mcpClient.ts tests/mcp-server.test.ts
git commit -m "test(mcp): JSON-RPC stdio integration test covering all 9 tools and resources"
```

---

### Task 12: Distribution — version sync, 3.1.0 bump, fresh .mcpb, docs

**Files:**
- Modify: `scripts/update-version.js` (full rewrite below), `version.json`, `manifest.json`, `MCP_DISTRIBUTION_GUIDE.md`, `README.md`
- Delete: `koti-mcp-2.0.3.mcpb`
- Create (generated): `koti-mcp-3.1.0.mcpb`

- [ ] **Step 1: Rewrite `scripts/update-version.js`**

```js
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const versionPath = path.join(root, 'version.json');
const { version } = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

console.log(`Updating all files to version ${version}...`);

const updateJsonVersion = (file) => {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) {
    console.log(`⏭ Skipped ${file} (not found)`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  data.version = version;
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
  console.log(`✓ Updated ${file}`);
};

updateJsonVersion('package.json');
updateJsonVersion('manifest.json');
updateJsonVersion('npm-package.json');

const readmePath = path.join(root, 'README.md');
if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, 'utf8');
  readme = readme.replace(/npm install -g koti@[\d.]+/g, `npm install -g koti@${version}`);
  fs.writeFileSync(readmePath, readme);
  console.log('✓ Updated README.md');
}

console.log(`\n🎉 All files updated to version ${version}!`);
```

- [ ] **Step 2: Bump to 3.1.0 and sync**

Run:
```bash
node -e "const fs=require('fs');const v=JSON.parse(fs.readFileSync('version.json','utf8'));v.version='3.1.0';fs.writeFileSync('version.json',JSON.stringify(v,null,2)+'\n')"
npm run update-version
node -e "const a=['package.json','manifest.json','version.json'].map(f=>JSON.parse(require('fs').readFileSync(f,'utf8')).version); if(new Set(a).size!==1||a[0]!=='3.1.0'){console.error('MISMATCH',a);process.exit(1)}; console.log('versions ok', a[0])"
```
Expected: `versions ok 3.1.0`.

- [ ] **Step 3: Update `manifest.json` tool metadata**

Read `manifest.json`; if it declares a `tools` array, replace it with the 9 tools (names + one-line descriptions matching Task 10's registrations, including `edit_model` and create_project's framework support); update any long-form `description` that says "Express" alone to "Express or Elysia". Keep everything else (entry point, icon, author) as-is.

- [ ] **Step 4: Rebuild the .mcpb and remove the stale one**

Run:
```bash
npm run build && npm run pack:mcpb
git rm koti-mcp-2.0.3.mcpb
ls koti-mcp-3.1.0.mcpb
```
Expected: `koti-mcp-3.1.0.mcpb` exists; the 2.0.3 bundle is staged for deletion. (If `.mcpb` files should not live in git at all, `git rm` the old one and add `*.mcpb` to `.gitignore` instead of committing the new binary — decide by whether 2.0.3 was tracked: it was, so keep tracking the new one for release parity.)

- [ ] **Step 5: Rewrite `MCP_DISTRIBUTION_GUIDE.md`**

Replace the invented install channels (`npx @anthropic-ai/koti-mcp`, `npx koti-mcp`, `koti --mcp` — none exist) with the three real ones:

```markdown
# Koti MCP Server — Distribution & Install Guide

The MCP server ships inside the `koti` npm package as the `koti-mcp` binary.

## 1. npm (recommended)
    npm install -g koti        # installs both `koti` (CLI) and `koti-mcp` (MCP server)

### Claude Code
    claude mcp add koti -- koti-mcp

### Claude Desktop (claude_desktop_config.json)
    {
      "mcpServers": {
        "koti": {
          "command": "koti-mcp",
          "env": { "KOTI_PROJECT_ROOT": "/absolute/path/to/your/project" }
        }
      }
    }

`KOTI_PROJECT_ROOT` (or the `--project-root` server argument) tells the resources
(project-structure, models-list, tasks-list) which project to describe. Tools always
take an explicit absolute `projectPath`/`directory` argument.

## 2. One-click bundle (Claude Desktop)
Download `koti-mcp-<version>.mcpb` from the repo/releases and open it with Claude
Desktop. Rebuild with `npm run pack:mcpb` (requires manifest.json version ==
package.json version).

## 3. From source
    git clone https://github.com/mynenikoteshwarrao/BunExpressSetup && cd BunExpressSetup
    npm install && npm run build
    claude mcp add koti -- node /absolute/path/to/BunExpressSetup/dist/mcp-server.js

## Tools (9)
create_project (framework: express|elysia), create_model, edit_model, create_enum,
create_task, create_controller, create_service, create_middleware, seed_database.
All mutating tools return the exact list of files written; failures return typed
errors ([INVALID_INPUT], [DUPLICATE], [NOT_KOTI_PROJECT], [IO_ERROR], ...).
```

- [ ] **Step 6: Add the README MCP section**

Insert after the main feature list in `README.md`:

```markdown
## MCP Server (use Koti from Claude)

Koti ships an MCP server so AI agents can scaffold and grow projects directly:

    npm install -g koti
    claude mcp add koti -- koti-mcp

9 tools: `create_project` (Express or Elysia), `create_model` (+CRUD +RBAC),
`edit_model`, `create_enum`, `create_task`, `create_controller`, `create_service`,
`create_middleware`, `seed_database`. Resources describe the project pointed to by
`KOTI_PROJECT_ROOT`. See MCP_DISTRIBUTION_GUIDE.md for Claude Desktop setup.
```

- [ ] **Step 7: Verify and commit**

Run: `npm test` (the version-consistency test in `tests/cli.test.ts` must pass with 3.1.0)
Expected: ALL PASS.

```bash
git add scripts/update-version.js version.json package.json manifest.json npm-package.json MCP_DISTRIBUTION_GUIDE.md README.md koti-mcp-3.1.0.mcpb
git commit -m "release: v3.1.0 — version sync tooling, fresh .mcpb, real install docs"
```

---

### Task 13: Final verification sweep

**Files:** none new — verification only.

- [ ] **Step 1: Full clean build + suite**

Run: `rm -rf dist && npm run build && npx tsc --noEmit && npm test`
Expected: build clean, typecheck clean, ALL tests pass.

- [ ] **Step 2: Live CLI smoke (both frameworks)**

Run in a scratch directory (NOT the repo):
```bash
node <repo>/dist/cli.js new smoke-express --framework express   # let install run or Ctrl-C after scaffold
node <repo>/dist/cli.js new smoke-elysia --framework elysia
cd smoke-elysia && node <repo>/dist/cli.js controller Payment && grep -L "from 'express'" src/controllers/paymentController.ts
```
Expected: both projects scaffold; the Elysia project's generated controller contains no Express imports.

- [ ] **Step 3: Live MCP smoke against the packaged layout**

Run: `npx vitest run tests/mcp-server.test.ts`
Expected: PASS (exercises dist/ exactly as an installed package would).

- [ ] **Step 4: Line-count and hygiene check**

Run: `wc -l src/cli.ts src/mcp-server.ts src/generators/*.ts src/generators/crud/*.ts`
Expected: every generator file < 500 lines; `cli.ts` dramatically reduced; if any file exceeds 500, split it before closing the task. Also confirm `git status` shows no stray files (`.test-output`, scratch projects) staged.

- [ ] **Step 5: Commit anything outstanding and summarize**

```bash
git status --short   # expect clean or only intended files
```
Report: files count before/after for cli.ts, test totals, and the spec's five success criteria each checked off.

---

## Self-Review Results

- **Spec coverage:** shared core (Tasks 1-9), framework-aware sub-generators incl. Elysia templates (3, 6, 7), 9-tool MCP surface with edit_model/framework/skipInstall/validation (10), typed errors & no fabricated success (all + 11), resources root resolution (10, 11), seed hardening (10), three test layers (unit: 1-9; MCP integration: 11; CLI: existing suite kept green + repointed), distribution: version sync/mcpb/guide/README (12), success criteria verified (11, 13). Legacy bugs fixed en route and called out inline: generated routes/index.ts `getVersion()` compile bug (Task 9), `indexed` collected-but-discarded (Tasks 4, 7), model:edit permission-drop + validator drift (Task 8), `task`/`addTaskToEnum` duplication (Task 2).
- **Placeholder scan:** no TBDs; verbatim moves always carry exact source line ranges per the stated convention.
- **Type consistency:** `FieldSpec`/`GeneratorResult`/`GeneratorError` defined once in Task 1 and imported everywhere; generator signatures in later tasks match their Task-1/interface declarations; MCP tool names in Task 11's test match Task 10's registrations.
