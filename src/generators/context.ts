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
