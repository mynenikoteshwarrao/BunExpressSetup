import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { createProject } from '../../src/generators/project';
import { createModel } from '../../src/generators/model';
import { switchDatabase } from '../../src/generators/switchDb';
import { Database, Framework } from '../../src/generators/context';
import { globTsFiles } from '../helpers/glob';

const dirs: string[] = [];
afterEach(async () => { while (dirs.length) await fs.remove(dirs.pop()!); });

const scaffold = async (framework: Framework, database: Database): Promise<string> => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'koti-switch-'));
  dirs.push(parent);
  const { projectPath } = await createProject({
    name: `${framework}-${database}-app`, framework, database, directory: parent, skipInstall: true,
  });
  return projectPath;
};

const read = (root: string, rel: string) => fs.readFile(path.join(root, rel), 'utf8');
const readJson = (root: string, rel: string) => fs.readJson(path.join(root, rel));
const writeJson = (root: string, rel: string, data: unknown) => fs.writeJson(path.join(root, rel), data, { spaces: 2 });

describe('switchDatabase', () => {
  it('mongo -> postgres: swaps db layer, regenerates models, rewrites deps/env/config', async () => {
    const root = await scaffold('express', 'mongodb');
    await createModel({
      projectRoot: root, name: 'Product',
      fields: [{ name: 'title', type: 'String', required: true }], crud: true, tasks: false,
    });

    await switchDatabase(root, 'postgres');

    expect(await read(root, 'src/config/database.ts')).toContain('drizzle');
    expect(await read(root, 'src/models/Product.ts')).toContain("pgTable('products'");
    expect(await fs.pathExists(path.join(root, 'src/models/Product.ts.bak'))).toBe(true);
    expect(await fs.pathExists(path.join(root, 'src/validators/product.ts.bak'))).toBe(true);
    expect(await fs.pathExists(path.join(root, 'src/services/productService.ts.bak'))).toBe(true);

    const pkg = await readJson(root, 'package.json');
    expect(pkg.dependencies['drizzle-orm']).toBeDefined();
    expect(pkg.dependencies.mongoose).toBeUndefined();
    expect(pkg.scripts['db:migrate']).toBeDefined();

    expect(await read(root, '.env')).toMatch(/# MONGODB_URI=/);
    expect(await read(root, '.env')).toMatch(/DATABASE_URL=postgres:/);
    expect((await readJson(root, 'koti.config.json')).database).toBe('postgres');
    expect(await fs.pathExists(path.join(root, 'drizzle.config.ts'))).toBe(true);

    for (const f of await globTsFiles(path.join(root, 'src'))) {
      if (f.endsWith('.bak')) continue;
      expect(await fs.readFile(f, 'utf8'), f).not.toMatch(/from 'mongoose'/);
    }
  }, 60000);

  it('round-trips postgres -> mongodb -> postgres with barrels keeping built-ins', async () => {
    const root = await scaffold('elysia', 'postgres');
    await createModel({
      projectRoot: root, name: 'Item',
      fields: [{ name: 'label', type: 'String' }], crud: true, tasks: false,
    });

    // A fresh drizzle/ is byte-identical to the template, so "the directory is
    // back" proves nothing about which branch restored it. The sentinel exists
    // only in this project's history — it can only survive via the .bak.
    await fs.writeFile(path.join(root, 'drizzle/0001_sentinel.sql'), '-- project-specific migration\n');

    await switchDatabase(root, 'mongodb');
    expect(await read(root, 'src/models/Item.ts')).toContain('new Schema<');
    expect(await readJson(root, 'koti.config.json')).toMatchObject({ database: 'mongodb' });

    // The mongodb layer is a filename-subset of the postgres one, so the
    // overlay alone cannot displace postgres-only files. Left live they still
    // import drizzle-orm, whose dependency has just been removed — the project
    // stops typechecking.
    const pkgAfterMongo = await readJson(root, 'package.json');
    for (const dep of ['drizzle-orm', 'pg']) expect(pkgAfterMongo.dependencies[dep], dep).toBeUndefined();
    for (const dep of ['drizzle-kit', '@types/pg']) expect(pkgAfterMongo.devDependencies?.[dep], dep).toBeUndefined();
    for (const s of ['db:generate', 'db:migrate']) expect(pkgAfterMongo.scripts[s], s).toBeUndefined();
    expect(pkgAfterMongo.dependencies.mongoose).toBeDefined();

    for (const gone of ['drizzle.config.ts', 'drizzle', 'src/models/UserRole.ts', 'src/services/serialize.ts', 'src/scripts/cleanupUrls.ts']) {
      expect(await fs.pathExists(path.join(root, gone)), `${gone} is still live`).toBe(false);
      expect(await fs.pathExists(path.join(root, `${gone}.bak`)), `${gone} was not backed up`).toBe(true);
    }

    const envAfterMongo = await read(root, '.env');
    expect(envAfterMongo).toMatch(/MONGODB_URI=mongodb:/);
    expect(envAfterMongo).toMatch(/# DATABASE_URL=/);

    for (const f of await globTsFiles(path.join(root, 'src'))) {
      if (f.endsWith('.bak')) continue;
      expect(await fs.readFile(f, 'utf8'), f).not.toMatch(/from 'drizzle-orm/);
    }

    await switchDatabase(root, 'postgres');
    const barrel = await read(root, 'src/models/index.ts');
    for (const b of ['User', 'Role', 'AuditLog', 'Document', 'TinyUrl', 'Item']) {
      expect(barrel, `barrel lost ${b}`).toContain(b);
    }
    expect(await read(root, 'src/models/Item.ts')).toContain("pgTable('items'");
    expect(await fs.pathExists(path.join(root, 'drizzle/meta/_journal.json'))).toBe(true);
    expect(
      await fs.pathExists(path.join(root, 'drizzle/0001_sentinel.sql')),
      'migration history came from the template, not the .bak',
    ).toBe(true);
    for (const gone of ['src/models/UserRole.ts', 'src/services/serialize.ts', 'src/scripts/cleanupUrls.ts']) {
      expect(await fs.pathExists(path.join(root, gone)), `${gone} was not restored`).toBe(true);
    }
  }, 60000);

  it('pre-3.2 mongo project (no manifest): imports user models, skips built-ins, survives junk', async () => {
    const root = await scaffold('express', 'mongodb');
    await createModel({
      projectRoot: root, name: 'Legacy', fields: [{ name: 'note', type: 'String' }], crud: false, tasks: false,
    });
    const cfg = await readJson(root, 'koti.config.json');
    delete cfg.models; delete cfg.database;
    await writeJson(root, 'koti.config.json', cfg);
    await fs.writeFile(path.join(root, 'src/models/Junk.ts'), 'nonsense');

    const { warnings } = await switchDatabase(root, 'postgres');

    expect(await read(root, 'src/models/Legacy.ts')).toContain('pgTable');
    // built-ins come from the overlay, never regenerated as generic CRUD
    expect(await read(root, 'src/services/userService.ts')).toContain('drizzle-orm');
    expect(warnings.some(w => w.includes('Junk'))).toBe(true);

    // The import persists the manifest mid-switch; step 8 must not write a
    // pre-import snapshot back over it, or the project can never switch again.
    const after = await readJson(root, 'koti.config.json');
    expect(after.database).toBe('postgres');
    expect(after.models?.Legacy?.fields).toBeDefined();

    await expect(switchDatabase(root, 'mongodb')).resolves.toBeTruthy();
  }, 60000);

  it('rejects no-op and manifest-less postgres sources', async () => {
    const root = await scaffold('express', 'mongodb');
    await expect(switchDatabase(root, 'mongodb')).rejects.toMatchObject({ code: 'INVALID_INPUT' });

    const pgRoot = await scaffold('express', 'postgres');
    const cfg = await readJson(pgRoot, 'koti.config.json');
    delete cfg.models;
    await writeJson(pgRoot, 'koti.config.json', cfg);
    // spec 6.4: drizzle sources are never parsed, so this must be a hard error
    await expect(switchDatabase(pgRoot, 'mongodb')).rejects.toMatchObject({ code: 'IO_ERROR' });
  }, 60000);
});
