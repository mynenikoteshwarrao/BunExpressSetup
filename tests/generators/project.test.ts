import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { createProject } from '../../src/generators/project';

const dirs: string[] = [];
const tmp = async () => { const d = await fs.mkdtemp(path.join(os.tmpdir(), 'koti-proj-')); dirs.push(d); return d; };
afterEach(async () => { while (dirs.length) await fs.remove(dirs.pop()!); });

const createTestProject = async (framework: 'express' | 'elysia' = 'express'): Promise<string> => {
  const parent = await tmp();
  const { projectPath } = await createProject({ name: `${framework}-app`, framework, directory: parent, skipInstall: true });
  return projectPath;
};

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
  it('scaffolded express project still contains the db-owned files', async () => {
    const dir = await createTestProject('express');
    for (const f of ['src/config/database.ts', 'src/models/User.ts', 'src/services/authService.ts', 'src/seeds/seed.ts']) {
      expect(await fs.pathExists(path.join(dir, f))).toBe(true);
    }
    expect(await fs.pathExists(path.join(dir, 'src/middleware/auditMiddleware.ts'))).toBe(false);
  }, 60000);
  it('scaffold merges db deps and env fragment (mongodb)', async () => {
    const dir = await createTestProject('express');
    const pkg = JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies.mongoose).toBeDefined();
    expect(pkg.devDependencies['@types/mongoose']).toBeUndefined();
    const env = await fs.readFile(path.join(dir, '.env'), 'utf8');
    expect(env).toMatch(/MONGODB_URI=mongodb:\/\/localhost:27017\//);
    expect(env).not.toContain('REPLACE_WITH_AUTO_GENERATED_SECRET'); // secret contract intact
    const readme = await fs.readFile(path.join(dir, 'README.md'), 'utf8');
    expect(readme).not.toContain('<!-- DB_SETUP -->'); // marker swapped for the db's setup prose
    expect(readme).toContain('Start MongoDB');
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
