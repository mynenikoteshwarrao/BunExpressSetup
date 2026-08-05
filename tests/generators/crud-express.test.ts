import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { generateTypeScriptModel } from '../../src/generators/crud/mongoose/modelFile';
import { generateCRUDService } from '../../src/generators/crud/mongoose/service';
import { FieldSpec } from '../../src/generators/context';
import { generateCRUDController, generateJoiValidation, generateCRUDRoutes } from '../../src/generators/crud/express';

const fields: FieldSpec[] = [
  { name: 'title', type: 'String', required: true },
  { name: 'price', type: 'Number', index: true },
  { name: 'sku', type: 'String', unique: true, default: 'none' },
  { name: 'meta', type: 'JSON' },
  { name: 'tags', type: 'Array' },
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
  it('emits Array fields as the mongoose array-of-mixed form, typed any[] on the interface', () => {
    const src = generateTypeScriptModel('Product', fields);
    expect(src).toContain('tags: [{ type: Schema.Types.Mixed }]');
    expect(src).toContain('tags: any[];');
    expect(src).not.toContain('tags: { type: Array }');
  });
  // Same hazard the drizzle emitter had: an unescaped apostrophe closes the
  // literal and the generated model stops parsing.
  it('escapes defaults for the TypeScript literal they are emitted into', () => {
    const src = generateTypeScriptModel('Product', [{ name: 'owner', type: 'String', default: "O'Brien" }]);
    expect(src).toContain("default: 'O\\'Brien'");
    const emitted = ts.transpileModule(src, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2020 } });
    expect(emitted.diagnostics?.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')) ?? []).toEqual([]);
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

describe('generateTypeScriptModel ObjectId emission', () => {
  it('emits Schema.Types.ObjectId for ObjectId fields (regression: bare ObjectId was unbound)', () => {
    const out = generateTypeScriptModel('Order', [{ name: 'ownerId', type: 'ObjectId', required: true }]);
    expect(out).toContain('ownerId: { type: Schema.Types.ObjectId,  required: true }');
    expect(out).not.toMatch(/type: ObjectId[,\s}]/);
    expect(out).toContain('ownerId: Types.ObjectId;'); // interface side unchanged
  });
});
