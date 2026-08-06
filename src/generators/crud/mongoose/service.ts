import { FieldSpec, capitalize, toCamelCase } from '../../context';

// Generate CRUD Service
// moved verbatim from cli.ts:737-848 (generateCRUDService), typed signature (FieldSpec[] instead of any[])
export const generateCRUDService = (modelName: string, fields: FieldSpec[]): string => {
  const capitalizedName = capitalize(modelName);
  const camelCaseName = toCamelCase(modelName);

  return `import { AppError } from '../utils/AppError';
import ${capitalizedName} from '../models/${capitalizedName}';
import { PaginationResult, QueryOptions } from '../types/api';

export class ${capitalizedName}Service {
  /**
   * Get all ${capitalizedName}s with pagination and search
   */
  public async getAll(options: QueryOptions): Promise<{ data: any[]; pagination: PaginationResult }> {
    try {
      const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;

      // Build search query
      let query: any = {};
      if (search) {
        const searchFields = [${fields.filter(f => f.type === 'String').map(f => `'${f.name}'`).join(', ')}];
        if (searchFields.length > 0) {
          query.$or = searchFields.map(field => ({
            [field]: { $regex: search, $options: 'i' }
          }));
        }
      }

      // Execute queries
      const [data, total] = await Promise.all([
        ${capitalizedName}.find(query)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ${capitalizedName}.countDocuments(query)
      ]);

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
      const ${camelCaseName} = await ${capitalizedName}.findById(id).lean();
      return ${camelCaseName};
    } catch (error) {
      throw new AppError(\`Error fetching ${capitalizedName}: \${error}\`, 500);
    }
  }

  /**
   * Create new ${capitalizedName}
   */
  public async create(data: any): Promise<any> {
    try {
      const ${camelCaseName} = new ${capitalizedName}(data);
      await ${camelCaseName}.save();
      return ${camelCaseName}.toObject();
    } catch (error) {
      throw new AppError(\`Error creating ${capitalizedName}: \${error}\`, 400);
    }
  }

  /**
   * Update ${capitalizedName} by ID
   */
  public async update(id: string, data: any): Promise<any> {
    try {
      const ${camelCaseName} = await ${capitalizedName}.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).lean();
      return ${camelCaseName};
    } catch (error) {
      throw new AppError(\`Error updating ${capitalizedName}: \${error}\`, 400);
    }
  }

  /**
   * Delete ${capitalizedName} by ID
   */
  public async delete(id: string): Promise<boolean> {
    try {
      const result = await ${capitalizedName}.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      throw new AppError(\`Error deleting ${capitalizedName}: \${error}\`, 500);
    }
  }
}

export default new ${capitalizedName}Service();`;
};
