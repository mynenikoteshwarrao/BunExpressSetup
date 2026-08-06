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
