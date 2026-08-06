import { FieldSpec, capitalize, toCamelCase } from '../../context';
import { tableConstFor } from './modelFile';

/**
 * Drizzle twin of crud/mongoose/service.ts. Same exported class, same method
 * names, same response envelope — controllers and routes are framework-axis
 * files and must not notice which database they are talking to.
 */
export const generateDrizzleCRUDService = (modelName: string, fields: FieldSpec[]): string => {
  const capitalizedName = capitalize(modelName);
  const camelCaseName = toCamelCase(modelName);
  const table = tableConstFor(modelName);

  const stringFields = fields.filter(f => f.type === 'String');
  const searchBlock = stringFields.length > 0
    ? `
      // Build search query (ILIKE is the postgres equivalent of mongo's $regex)
      let where;
      if (search) {
        const like = \`%\${search}%\`;
        where = or(${stringFields.map(f => `ilike(${table}.${f.name}, like)`).join(', ')});
      }
`
    : `
      const where = undefined;   // no String fields to search
`;

  const sortable = ['createdAt', 'updatedAt', ...fields.map(f => f.name)]
    .map(name => `  ${name}: ${table}.${name},`)
    .join('\n');

  return `import { count, asc, desc, eq, ilike, or } from 'drizzle-orm';
import { AppError } from '../utils/AppError';
import { db } from '../config/database';
import { ${table} } from '../models/${capitalizedName}';
import { PaginationResult, QueryOptions } from '../types/api';

const SORTABLE = {
${sortable}
} as const;

export class ${capitalizedName}Service {
  /**
   * Get all ${capitalizedName}s with pagination and search
   */
  public async getAll(options: QueryOptions): Promise<{ data: any[]; pagination: PaginationResult }> {
    try {
      const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const offset = (page - 1) * limit;
${searchBlock}
      const sortColumn = SORTABLE[sortBy as keyof typeof SORTABLE] ?? ${table}.createdAt;

      // Execute queries
      const [data, totals] = await Promise.all([
        db.select().from(${table}).where(where)
          .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(${table}).where(where)
      ]);

      const total = totals[0]?.value ?? 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new AppError(\`Error fetching ${capitalizedName}s: \${error}\`, 500);
    }
  }

  /**
   * Get ${capitalizedName} by ID
   */
  public async getById(id: string): Promise<any> {
    try {
      const [${camelCaseName}] = await db.select().from(${table}).where(eq(${table}.id, id)).limit(1);
      return ${camelCaseName} ?? null;
    } catch (error) {
      throw new AppError(\`Error fetching ${capitalizedName}: \${error}\`, 500);
    }
  }

  /**
   * Create new ${capitalizedName}
   */
  public async create(data: any): Promise<any> {
    try {
      const [${camelCaseName}] = await db.insert(${table}).values(data).returning();
      return ${camelCaseName};
    } catch (error) {
      throw new AppError(\`Error creating ${capitalizedName}: \${error}\`, 400);
    }
  }

  /**
   * Update ${capitalizedName} by ID
   */
  public async update(id: string, data: any): Promise<any> {
    try {
      const [${camelCaseName}] = await db.update(${table})
        .set({ ...data, updatedAt: new Date() })
        .where(eq(${table}.id, id))
        .returning();
      return ${camelCaseName} ?? null;
    } catch (error) {
      throw new AppError(\`Error updating ${capitalizedName}: \${error}\`, 400);
    }
  }

  /**
   * Delete ${capitalizedName} by ID
   */
  public async delete(id: string): Promise<boolean> {
    try {
      const deleted = await db.delete(${table}).where(eq(${table}.id, id)).returning({ id: ${table}.id });
      return deleted.length > 0;
    } catch (error) {
      throw new AppError(\`Error deleting ${capitalizedName}: \${error}\`, 500);
    }
  }
}

export default new ${capitalizedName}Service();`;
};
