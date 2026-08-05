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

  it('create_project accepts database: postgres', async () => {
    const res = await client.callTool('create_project', {
      projectName: 'pg-api', framework: 'express', database: 'postgres', directory: workDir, skipInstall: true,
    });
    expect(res.result.isError).toBeFalsy();
    const cfg = await fs.readJson(path.join(workDir, 'pg-api', 'koti.config.json'));
    expect(cfg.database).toBe('postgres');
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
