import { FieldSpec, FieldType, capitalize, toCamelCase } from '../../context';

const toSnakeCase = (str: string): string =>
  str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/** Naive English pluralizer — enough for identifier naming, not for prose. */
const pluralize = (word: string): string => {
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
};

/** `UserProfile` -> `user_profiles` (the SQL table name). */
export const tableNameFor = (modelName: string): string => pluralize(toSnakeCase(modelName));

/** `UserProfile` -> `userProfiles` (the exported drizzle table const). */
export const tableConstFor = (modelName: string): string => pluralize(toCamelCase(modelName));

const COLUMN_BUILDER: Record<FieldType, string> = {
  String: 'text',
  Number: 'doublePrecision',
  Date: 'timestamp',
  Boolean: 'boolean',
  ObjectId: 'uuid',
  Array: 'jsonb',
  Mixed: 'jsonb',
  JSON: 'jsonb',
};

const columnFor = (field: FieldSpec): string => {
  const col = toSnakeCase(field.name);
  switch (field.type) {
    case 'Date': return `timestamp('${col}', { withTimezone: true })`;
    case 'Array': return `jsonb('${col}').$type<any[]>()`;
    default: return `${COLUMN_BUILDER[field.type]}('${col}')`;
  }
};

/**
 * Mongo accepts defaults Postgres has no column-level equivalent for, and a
 * db:switch must not die on one — an unmappable default is dropped with a
 * warning rather than throwing.
 */
const defaultFor = (field: FieldSpec, warnings: string[]): string => {
  const raw = field.default;
  if (raw === undefined || raw === '') return '';
  const skip = (why: string): string => {
    warnings.push(`Field "${field.name}": default ${JSON.stringify(raw)} ${why} — emitted without a default`);
    return '';
  };

  switch (field.type) {
    case 'String':
      return `.default('${raw.replace(/'/g, "''")}')`;
    case 'Number': {
      const n = Number(raw);
      return Number.isFinite(n) ? `.default(${n})` : skip('is not a number');
    }
    case 'Boolean':
      if (raw === 'true' || raw === 'false') return `.default(${raw})`;
      return skip('is not a boolean');
    case 'Date':
      if (/^(Date\.now\(?\)?|now)$/.test(raw)) return '.defaultNow()';
      return skip('is not Date.now');
    case 'Array':
    case 'Mixed':
    case 'JSON':
      try {
        JSON.parse(raw);
      } catch {
        return skip('is not valid JSON');
      }
      return `.default(sql\`'${raw.replace(/'/g, "''")}'::jsonb\`)`;
    default:
      return skip('has no postgres equivalent');
  }
};

/**
 * Emits a Drizzle pgTable for a model. `warnings` collects non-fatal mapping
 * problems (see defaultFor); the caller surfaces them on the generator result.
 */
export const generateDrizzleModel = (modelName: string, fields: FieldSpec[], warnings: string[] = []): string => {
  const capitalizedName = capitalize(modelName);
  const table = tableNameFor(modelName);
  const tableConst = tableConstFor(modelName);

  const columns = fields.map(field => {
    const chain = [columnFor(field)];
    if (field.required) chain.push('.notNull()');
    if (field.unique) chain.push('.unique()');
    chain.push(defaultFor(field, warnings));
    return `  ${field.name}: ${chain.join('')},`;
  });

  const indexed = fields.filter(f => f.index);
  const tableExtras = indexed.length > 0
    ? `, (t) => [\n${indexed.map(f => `  index('${table}_${toSnakeCase(f.name)}_idx').on(t.${f.name}),`).join('\n')}\n]`
    : '';

  const builders = new Set<string>(['pgTable', 'uuid', 'timestamp']);
  for (const f of fields) builders.add(COLUMN_BUILDER[f.type]);
  if (indexed.length > 0) builders.add('index');
  // Stable import order, not insertion order, so regenerating a model is a no-op.
  const IMPORT_ORDER = ['pgTable', 'uuid', 'text', 'doublePrecision', 'boolean', 'timestamp', 'jsonb', 'index'];
  const imports = IMPORT_ORDER.filter(b => builders.has(b)).join(', ');

  return `import { ${imports} } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const ${tableConst} = pgTable('${table}', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
${columns.join('\n')}
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}${tableExtras});

export type ${capitalizedName} = typeof ${tableConst}.$inferSelect;
export type New${capitalizedName} = typeof ${tableConst}.$inferInsert;
`;
};
