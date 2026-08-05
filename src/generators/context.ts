import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

export type Framework = 'express' | 'elysia';
export const FRAMEWORKS: readonly Framework[] = ['express', 'elysia'] as const;

export type Database = 'mongodb' | 'postgres';
export const DATABASES: readonly Database[] = ['mongodb', 'postgres'] as const;

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
  | 'UNSUPPORTED_FRAMEWORK' | 'UNSUPPORTED_DATABASE' | 'IO_ERROR' | 'INSTALL_FAILED';

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
  database: Database;
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

/**
 * Wraps a value as a single-quoted TypeScript literal. Every emitter that
 * inlines user input (field defaults, most of all) has to go through this —
 * an unescaped apostrophe ends the literal and the generated file stops parsing.
 */
export const jsQuoted = (raw: string): string =>
  `'${raw.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
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
      let framework: Framework = 'express';
      if (config.framework === 'express' || config.framework === 'elysia') {
        framework = config.framework;
      } else {
        warnings.push(`Unknown framework "${config.framework}" in koti.config.json — defaulting to express`);
      }
      let database: Database;
      if (config.database === undefined) {
        database = 'mongodb';
        warnings.push('koti.config.json has no "database" key (pre-3.2 project) — assuming mongodb. Run koti db:switch or add the key to silence this.');
      } else if (!DATABASES.includes(config.database)) {
        throw new GeneratorError('UNSUPPORTED_DATABASE', `Unknown database "${config.database}" in koti.config.json. Supported: ${DATABASES.join(', ')}`);
      } else {
        database = config.database;
      }
      return { root, framework, database, warnings };
    } catch (err) {
      if (err instanceof GeneratorError) throw err;
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
  const database: Database = deps['drizzle-orm'] || deps.pg ? 'postgres' : 'mongodb';
  if (deps.elysia) {
    warnings.push('No koti.config.json — framework "elysia" inferred from dependencies');
    return { root, framework: 'elysia', database, warnings };
  }
  if (deps.express || deps.mongoose || deps.pg || deps['drizzle-orm']) {
    warnings.push('No koti.config.json — framework "express" inferred from dependencies');
    return { root, framework: 'express', database, warnings };
  }
  throw new GeneratorError('NOT_KOTI_PROJECT', `${root} is not a Koti project (no koti.config.json and no express/elysia/mongoose/drizzle-orm/pg dependency)`);
};

// --- Models manifest (koti.config.json "models" key) ---
// Regeneration (koti model:edit, koti db:switch) reads this instead of
// regex-parsing generated source, which cannot work across DB idioms.

export interface ModelManifestEntry {
  fields: FieldSpec[];
  crud: boolean;
  rbacTasks: boolean;
}

/** Built-in models shipped by the db layers — never imported into the manifest. */
export const BUILTIN_MODELS = ['User', 'Role', 'AuditLog', 'Document', 'TinyUrl'] as const;

export const readModelManifest = async (root: string): Promise<Record<string, ModelManifestEntry>> => {
  try {
    const config = await fs.readJson(path.join(root, 'koti.config.json'));
    const models = config?.models;
    return models && typeof models === 'object' ? models as Record<string, ModelManifestEntry> : {};
  } catch {
    return {};
  }
};

export const upsertModelManifest = async (
  root: string, name: string, entry: ModelManifestEntry
): Promise<void> => {
  const configPath = path.join(root, 'koti.config.json');
  let config: Record<string, unknown> = {};
  try {
    config = await fs.readJson(configPath);
  } catch {
    throw new GeneratorError('IO_ERROR', `Could not read ${configPath} to record the models manifest`);
  }
  const models = (config.models && typeof config.models === 'object' ? config.models : {}) as Record<string, ModelManifestEntry>;
  models[name] = entry;
  config.models = models;
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
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
