import fs from 'fs-extra';
import path from 'path';
import {
  GeneratorResult, GeneratorError, resolveProject, capitalize, toCamelCase, toKebabCase,
  updateIndexExport, assertValidName,
} from './context';

// Generate TypeScript Controller
// moved verbatim from cli.ts:591-732 (generateTypeScriptController)
const generateExpressController = (controllerName: string): string => {
  const capitalizedName = capitalize(controllerName);
  const camelCaseName = toCamelCase(controllerName);

  return `import { Request, Response, NextFunction } from 'express';
import { ApiResponse, PaginatedResponse, AuthenticatedRequest } from '../types/api';
import { AppError } from '../utils/AppError';

export class ${capitalizedName}Controller {
  /**
   * Get all ${controllerName}s with pagination
   * @route GET /api/${toKebabCase(controllerName)}
   */
  public async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // TODO: Implement actual data fetching logic
      const data = []; // Replace with actual data fetching
      const total = 0; // Replace with actual count

      const response: PaginatedResponse = {
        success: true,
        message: '${capitalizedName}s retrieved successfully',
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error fetching ${controllerName}s\`, 500));
    }
  }

  /**
   * Get single ${controllerName} by ID
   * @route GET /api/${toKebabCase(controllerName)}/:id
   */
  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Implement actual data fetching logic
      const data = null; // Replace with actual data fetching

      if (!data) {
        return next(new AppError('${capitalizedName} not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} retrieved successfully',
        data
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error fetching ${controllerName}\`, 500));
    }
  }

  /**
   * Create new ${controllerName}
   * @route POST /api/${toKebabCase(controllerName)}
   */
  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { body } = req;

      // TODO: Implement validation and creation logic
      const data = body; // Replace with actual creation logic

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} created successfully',
        data
      };

      res.status(201).json(response);
    } catch (error) {
      next(new AppError(\`Error creating ${controllerName}\`, 400));
    }
  }

  /**
   * Update ${controllerName} by ID
   * @route PUT /api/${toKebabCase(controllerName)}/:id
   */
  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { body } = req;

      // TODO: Implement actual update logic
      const data = body; // Replace with actual update logic

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} updated successfully',
        data
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error updating ${controllerName}\`, 400));
    }
  }

  /**
   * Delete ${controllerName} by ID
   * @route DELETE /api/${toKebabCase(controllerName)}/:id
   */
  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Implement actual deletion logic

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error deleting ${controllerName}\`, 400));
    }
  }
}

export default new ${capitalizedName}Controller();
`;
};

const generateElysiaController = (controllerName: string): string => {
  const capitalizedName = capitalize(controllerName);
  const camelCaseName = toCamelCase(controllerName);
  return `import { AppError } from '../utils/AppError';
import { success, paginated } from '../utils/respond';

export const ${camelCaseName}Controller = {
  /** List ${camelCaseName}s with pagination */
  async getAll({ query }: any) {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    // TODO: Implement actual data fetching logic
    const data: any[] = [];
    const total = 0;
    return paginated('${capitalizedName}s retrieved successfully', data, {
      page, limit, total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  },

  /** Get one ${camelCaseName} by id */
  async getById({ params }: any) {
    // TODO: Implement actual data fetching logic
    const data = null;
    if (!data) throw new AppError('${capitalizedName} not found', 404);
    return success('${capitalizedName} retrieved successfully', data);
  },

  /** Create a ${camelCaseName} */
  async create({ body, set }: any) {
    // TODO: Implement creation logic
    set.status = 201;
    return success('${capitalizedName} created successfully', body);
  },

  /** Update a ${camelCaseName} */
  async update({ params, body }: any) {
    // TODO: Implement update logic
    return success('${capitalizedName} updated successfully', { id: params.id, ...body });
  },

  /** Delete a ${camelCaseName} */
  async delete({ params }: any) {
    // TODO: Implement delete logic
    return success('${capitalizedName} deleted successfully');
  }
};

export default ${camelCaseName}Controller;
`;
};

export const createController = async (opts: { projectRoot: string; name: string }): Promise<GeneratorResult> => {
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, 'controller name (PascalCase)');
  const ctx = await resolveProject(opts.projectRoot);
  const camelName = toCamelCase(opts.name);
  const filePath = path.join(ctx.root, 'src', 'controllers', `${camelName}Controller.ts`);
  if (await fs.pathExists(filePath)) {
    throw new GeneratorError('DUPLICATE', `Controller already exists: ${filePath}`);
  }
  const content = ctx.framework === 'elysia'
    ? generateElysiaController(opts.name)
    : generateExpressController(opts.name);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
  await updateIndexExport(
    path.join(ctx.root, 'src', 'controllers'),
    `export { default as ${camelName}Controller } from './${camelName}Controller';`
  );
  return { files: [filePath], warnings: ctx.warnings };
};
