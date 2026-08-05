import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { makeFakeProject } from '../helpers/fakeProject';
import { createModel, importManifestFromSource } from '../../src/generators/model';
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

describe('models manifest', () => {
  it('createModel records the model in the koti.config.json manifest', async () => {
    const root = await makeFakeProject('express', 'mongodb'); roots.push(root);
    await createModel({
      projectRoot: root, name: 'Product',
      fields: [{ name: 'title', type: 'String', required: true }], crud: true, tasks: false,
    });
    const cfg = JSON.parse(await fs.readFile(path.join(root, 'koti.config.json'), 'utf8'));
    expect(cfg.models.Product).toEqual({
      fields: [{ name: 'title', type: 'String', required: true }], crud: true, rbacTasks: false,
    });
  });

  it('importManifestFromSource skips built-ins and index.ts, tolerates parse failures', async () => {
    const root = await makeFakeProject('express', 'mongodb'); roots.push(root);
    // simulate a pre-3.2 project: user model on disk, no manifest
    await createModel({ projectRoot: root, name: 'Legacy', fields: [{ name: 'note', type: 'String' }], crud: false, tasks: false });
    const cfg = JSON.parse(await fs.readFile(path.join(root, 'koti.config.json'), 'utf8'));
    delete cfg.models;
    await fs.writeFile(path.join(root, 'koti.config.json'), JSON.stringify(cfg));
    await fs.copy(
      path.join(__dirname, '..', '..', 'templates', 'db', 'mongodb', 'src', 'models', 'User.ts'),
      path.join(root, 'src/models/User.ts'),
    ); // built-in present
    await fs.writeFile(path.join(root, 'src/models/Broken.ts'), 'not a schema at all');
    const { imported, warnings } = await importManifestFromSource(root);
    expect(imported).toEqual(['Legacy']);
    expect(warnings.some(w => w.includes('Broken'))).toBe(true);
  });
});

describe('createModel (postgres)', () => {
  it('emits a drizzle model + service, a star barrel line, and records the manifest', async () => {
    const root = await makeFakeProject('express', 'postgres'); roots.push(root);
    await createModel({ projectRoot: root, name: 'Product', fields, crud: true, tasks: false });

    const model = await fs.readFile(path.join(root, 'src', 'models', 'Product.ts'), 'utf-8');
    expect(model).toContain(`pgTable('products'`);
    expect(model).not.toContain(`from 'mongoose'`);

    const service = await fs.readFile(path.join(root, 'src', 'services', 'productService.ts'), 'utf-8');
    expect(service).toContain('ilike(products.title, like)');
    expect(service).not.toContain('countDocuments');

    const barrel = await fs.readFile(path.join(root, 'src', 'models', 'index.ts'), 'utf-8');
    expect(barrel).toContain(`export * from './Product';`);
    expect(barrel).not.toContain('IProduct');

    const validator = await fs.readFile(path.join(root, 'src', 'validators', 'product.ts'), 'utf-8');
    expect(validator).toContain('Joi.string()');   // route/validator export names stay frozen

    const cfg = JSON.parse(await fs.readFile(path.join(root, 'koti.config.json'), 'utf8'));
    expect(cfg.models.Product).toEqual({ fields, crud: true, rbacTasks: false });
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
