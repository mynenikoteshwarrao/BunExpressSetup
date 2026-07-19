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
    expect(parsed).toEqual([{ name: 'title', type: 'String', required: true, unique: false, index: false, default: undefined }]);
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
  it('preserves index: true through a round-trip edit and backs up the model file', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    await createModel({
      projectRoot: root, name: 'Product',
      fields: [...fields, { name: 'price', type: 'Number', index: true }],
    });
    await editModel({
      projectRoot: root, name: 'Product',
      addFields: [{ name: 'sku', type: 'String' }],
    });
    const model = await fs.readFile(path.join(root, 'src', 'models', 'Product.ts'), 'utf-8');
    expect(model).toContain('index: true');
    expect(await fs.pathExists(path.join(root, 'src', 'models', 'Product.ts.bak'))).toBe(true);
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
