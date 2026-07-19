import { describe, it, expect } from 'vitest';
import { generateTypeScriptModel } from '../../src/generators/crud/modelFile';
import { generateCRUDService } from '../../src/generators/crud/service';
import { FieldSpec } from '../../src/generators/context';

const fields: FieldSpec[] = [
  { name: 'title', type: 'String', required: true },
  { name: 'price', type: 'Number', index: true },
  { name: 'sku', type: 'String', unique: true, default: 'none' },
  { name: 'meta', type: 'JSON' },
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
});

describe('generateCRUDService', () => {
  it('builds search only over String fields', () => {
    const src = generateCRUDService('Product', fields);
    expect(src).toContain(`['title', 'sku']`);
    expect(src).toContain(`import Product from '../models/Product'`);
    expect(src).toContain('export default new ProductService()');
  });
});
