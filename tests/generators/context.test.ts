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
