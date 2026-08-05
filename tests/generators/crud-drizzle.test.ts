import { describe, it, expect } from 'vitest';
import { generateDrizzleModel } from '../../src/generators/crud/drizzle/modelFile';
import { generateDrizzleCRUDService } from '../../src/generators/crud/drizzle/service';
import { FieldSpec } from '../../src/generators/context';
import { generateJoiValidation } from '../../src/generators/crud/express';
import { generateTypeBoxValidator } from '../../src/generators/crud/elysia';

const fields: FieldSpec[] = [
  { name: 'title', type: 'String', required: true },
  { name: 'price', type: 'Number', index: true },
  { name: 'sku', type: 'String', unique: true, default: 'none' },
  { name: 'meta', type: 'JSON' },
  { name: 'tags', type: 'Array' },
];

describe('generateDrizzleModel', () => {
  it('names the table as the snake_case plural and exports inferred types', () => {
    const src = generateDrizzleModel('UserProfile', [{ name: 'bio', type: 'String' }]);
    expect(src).toContain(`export const userProfiles = pgTable('user_profiles'`);
    expect(src).toContain('export type UserProfile = typeof userProfiles.$inferSelect;');
    expect(src).toContain('export type NewUserProfile = typeof userProfiles.$inferInsert;');
  });

  it('pluralizes names ending in y, s and ch', () => {
    expect(generateDrizzleModel('Category', [{ name: 'a', type: 'String' }])).toContain(`pgTable('categories'`);
    expect(generateDrizzleModel('Address', [{ name: 'a', type: 'String' }])).toContain(`pgTable('addresses'`);
    expect(generateDrizzleModel('Batch', [{ name: 'a', type: 'String' }])).toContain(`pgTable('batches'`);
  });

  it('gives every table a uuid primary key and timestamptz audit columns', () => {
    const src = generateDrizzleModel('Product', fields);
    expect(src).toContain("id: uuid('id').primaryKey().default(sql`gen_random_uuid()`)");
    expect(src).toContain("createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()");
    expect(src).toContain('$onUpdate(() => new Date())');
  });

  it('maps every field type to its drizzle column', () => {
    const all: FieldSpec[] = [
      { name: 'a', type: 'String' }, { name: 'b', type: 'Number' }, { name: 'c', type: 'Date' },
      { name: 'd', type: 'Boolean' }, { name: 'e', type: 'ObjectId' }, { name: 'f', type: 'Array' },
      { name: 'g', type: 'Mixed' }, { name: 'h', type: 'JSON' },
    ];
    const src = generateDrizzleModel('Thing', all);
    expect(src).toContain("a: text('a')");
    expect(src).toContain("b: doublePrecision('b')");
    expect(src).toContain("c: timestamp('c', { withTimezone: true })");
    expect(src).toContain("d: boolean('d')");
    expect(src).toContain("e: uuid('e')");
    expect(src).toContain("f: jsonb('f').$type<any[]>()");
    expect(src).toContain("g: jsonb('g')");
    expect(src).toContain("h: jsonb('h')");
  });

  it('emits notNull, unique and an index entry for the table', () => {
    const src = generateDrizzleModel('Product', fields);
    expect(src).toContain("title: text('title').notNull()");
    expect(src).toContain("sku: text('sku').unique()");
    expect(src).toContain("index('products_price_idx').on(t.price)");
  });

  it('maps defaults per type and turns Date.now into defaultNow()', () => {
    const src = generateDrizzleModel('Product', [
      { name: 'sku', type: 'String', default: 'none' },
      { name: 'qty', type: 'Number', default: '5' },
      { name: 'live', type: 'Boolean', default: 'true' },
      { name: 'seenAt', type: 'Date', default: 'Date.now' },
      { name: 'tags', type: 'Array', default: '[]' },
    ]);
    expect(src).toContain(".default('none')");
    expect(src).toContain('.default(5)');
    expect(src).toContain('.default(true)');
    expect(src).toContain('.defaultNow()');
    expect(src).toContain(".default(sql`'[]'::jsonb`)");
  });

  it('warns and omits the default when it cannot be mapped, instead of throwing', () => {
    const warnings: string[] = [];
    const src = generateDrizzleModel('Product', [{ name: 'qty', type: 'Number', default: 'NaNish' }], warnings);
    expect(src).toContain("qty: doublePrecision('qty'),");   // the id PK default still stands
    expect(warnings.join('\n')).toMatch(/qty/);
  });
});

describe('generateDrizzleCRUDService', () => {
  it('searches String fields with ilike and paginates with count', () => {
    const src = generateDrizzleCRUDService('Product', fields);
    expect(src).toContain('ilike(products.title, like)');
    expect(src).toContain('ilike(products.sku, like)');
    expect(src).not.toContain('ilike(products.price');
    expect(src).toContain('count()');
  });

  it('keeps the mongoose service API surface', () => {
    const src = generateDrizzleCRUDService('Product', fields);
    for (const method of ['getAll', 'getById', 'create', 'update', 'delete']) {
      expect(src, `missing ${method}`).toContain(`async ${method}(`);
    }
    expect(src).toContain('export class ProductService');
    expect(src).toContain('export default new ProductService();');
    expect(src).toContain('PaginationResult');
  });

  it('resolves rows by id with eq', () => {
    const src = generateDrizzleCRUDService('Product', fields);
    expect(src).toContain('eq(products.id, id)');
  });
});

describe('validator tightening is per-database', () => {
  const withRef: FieldSpec[] = [{ name: 'ownerId', type: 'ObjectId', required: true }];

  it('joi tightens ObjectId to uuid only on postgres', () => {
    expect(generateJoiValidation('Product', withRef, 'postgres')).toContain('Joi.string().uuid()');
    const mongo = generateJoiValidation('Product', withRef, 'mongodb');
    expect(mongo).toContain('Joi.string()');
    expect(mongo).not.toContain('.uuid()');
  });

  it('typebox tightens ObjectId to uuid only on postgres', () => {
    expect(generateTypeBoxValidator('Product', withRef, 'postgres')).toContain(`t.String({ format: 'uuid' })`);
    const mongo = generateTypeBoxValidator('Product', withRef, 'mongodb');
    expect(mongo).toContain('t.String()');
    expect(mongo).not.toContain('uuid');
  });

  it('defaults to the mongodb behaviour when no database is passed', () => {
    expect(generateJoiValidation('Product', withRef)).not.toContain('.uuid()');
    expect(generateTypeBoxValidator('Product', withRef)).not.toContain('uuid');
  });
});
