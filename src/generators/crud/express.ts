import { FieldSpec, Database, capitalize, toCamelCase, toUpperSnakeCase } from '../context';

// Generate CRUD Controller
// moved verbatim from cli.ts:594-734 (generateCRUDController), typed signature (FieldSpec[] instead of any[])
export const generateCRUDController = (modelName: string, fields: FieldSpec[]): string => {
  const capitalizedName = capitalize(modelName);
  const camelCaseName = toCamelCase(modelName);

  return `import { Request, Response, NextFunction } from 'express';
import { ApiResponse, PaginatedResponse, AuthenticatedRequest } from '../types/api';
import { AppError } from '../utils/AppError';
import ${capitalizedName}Service from '../services/${camelCaseName}Service';

export class ${capitalizedName}Controller {
  /**
   * Get all ${capitalizedName}s with pagination
   * @route GET /api/${camelCaseName}
   */
  public async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || parseInt(process.env.DEFAULT_PAGE_LIMIT || '10');
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

      const result = await ${capitalizedName}Service.getAll({
        page,
        limit,
        search,
        sortBy,
        sortOrder
      });

      const response: PaginatedResponse = {
        success: true,
        message: '${capitalizedName}s retrieved successfully',
        data: result.data,
        pagination: result.pagination
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error fetching ${capitalizedName}s\`, 500));
    }
  }

  /**
   * Get single ${capitalizedName} by ID
   * @route GET /api/${camelCaseName}/:id
   */
  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const ${camelCaseName} = await ${capitalizedName}Service.getById(id);

      if (!${camelCaseName}) {
        return next(new AppError('${capitalizedName} not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} retrieved successfully',
        data: ${camelCaseName}
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error fetching ${capitalizedName}\`, 500));
    }
  }

  /**
   * Create new ${capitalizedName}
   * @route POST /api/${camelCaseName}
   */
  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ${camelCaseName} = await ${capitalizedName}Service.create(req.body);

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} created successfully',
        data: ${camelCaseName}
      };

      res.status(201).json(response);
    } catch (error) {
      next(new AppError(\`Error creating ${capitalizedName}\`, 400));
    }
  }

  /**
   * Update ${capitalizedName} by ID
   * @route PUT /api/${camelCaseName}/:id
   */
  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const ${camelCaseName} = await ${capitalizedName}Service.update(id, req.body);

      if (!${camelCaseName}) {
        return next(new AppError('${capitalizedName} not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} updated successfully',
        data: ${camelCaseName}
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error updating ${capitalizedName}\`, 400));
    }
  }

  /**
   * Delete ${capitalizedName} by ID
   * @route DELETE /api/${camelCaseName}/:id
   */
  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await ${capitalizedName}Service.delete(id);

      if (!deleted) {
        return next(new AppError('${capitalizedName} not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} deleted successfully',
        data: null
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error deleting ${capitalizedName}\`, 500));
    }
  }
}

export default new ${capitalizedName}Controller();`;
};

// Generate Joi validation schema for a model
// moved verbatim from cli.ts:1051-1095 (generateJoiValidation), typed signature (FieldSpec[] instead of any[])
// `database` only tightens ObjectId fields, and only on postgres, where ids
// really are uuids. Mongodb keeps plain-string validation — 24-hex tightening
// would change what existing projects accept.
export const generateJoiValidation = (modelName: string, fields: FieldSpec[], database: Database = 'mongodb'): string => {
  const capitalizedName = capitalize(modelName);
  const objectIdType = database === 'postgres' ? 'Joi.string().uuid()' : 'Joi.string()';

  const joiFields = fields.map(field => {
    let joiType = 'Joi.string()';
    switch (field.type) {
      case 'String': joiType = 'Joi.string()'; break;
      case 'Number': joiType = 'Joi.number()'; break;
      case 'Boolean': joiType = 'Joi.boolean()'; break;
      case 'Date': joiType = 'Joi.date()'; break;
      case 'Array': joiType = 'Joi.array()'; break;
      case 'ObjectId': joiType = objectIdType; break;
      default: joiType = 'Joi.any()'; break;
    }

    const chain = [joiType];
    if (field.required) chain.push('.required()');
    else chain.push('.optional()');

    return `  ${field.name}: ${chain.join('')}`;
  }).join(',\n');

  return `import Joi from 'joi';

export const create${capitalizedName}Schema = Joi.object({
${joiFields}
});

export const update${capitalizedName}Schema = Joi.object({
${fields.map(field => {
    let joiType = 'Joi.string()';
    switch (field.type) {
      case 'String': joiType = 'Joi.string()'; break;
      case 'Number': joiType = 'Joi.number()'; break;
      case 'Boolean': joiType = 'Joi.boolean()'; break;
      case 'Date': joiType = 'Joi.date()'; break;
      case 'Array': joiType = 'Joi.array()'; break;
      case 'ObjectId': joiType = objectIdType; break;
      default: joiType = 'Joi.any()'; break;
    }
    return `  ${field.name}: ${joiType}.optional()`;
  }).join(',\n')}
}).min(1);
`;
};

// Generate CRUD Routes
// moved verbatim from cli.ts:851-1048 (generateCRUDRoutes), typed signature (FieldSpec[] instead of any[])
export const generateCRUDRoutes = (modelName: string, fields: FieldSpec[] = [], withTasks: boolean = false): string => {
  const capitalizedName = capitalize(modelName);
  const camelCaseName = toCamelCase(modelName);
  const upperSnakeName = toUpperSnakeCase(modelName);

  const hasValidation = fields.length > 0;
  const validationImport = hasValidation
    ? `\nimport { validate } from '../middleware/validation';\nimport { create${capitalizedName}Schema, update${capitalizedName}Schema } from '../validators/${camelCaseName}';`
    : '';

  const permissionImport = withTasks
    ? `\nimport { checkPermission } from '../middleware/checkPermission';\nimport { Task } from '../enums/Task';`
    : '';

  // Permission middleware snippets for each route
  const viewPerm = withTasks ? `checkPermission(Task.VIEW_${upperSnakeName}), ` : '';
  const createPerm = withTasks ? `checkPermission(Task.CREATE_${upperSnakeName}), ` : '';
  const updatePerm = withTasks ? `checkPermission(Task.UPDATE_${upperSnakeName}), ` : '';
  const deletePerm = withTasks ? `checkPermission(Task.DELETE_${upperSnakeName}), ` : '';

  return `import { Router } from 'express';
import ${camelCaseName}Controller from '../controllers/${camelCaseName}Controller';
import { auth } from '../middleware/auth';${validationImport}${permissionImport}

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ${capitalizedName}:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the ${camelCaseName}
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * /api/${camelCaseName}:
 *   get:
 *     summary: Get all ${camelCaseName}s with pagination
 *     tags: [${capitalizedName}]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of ${camelCaseName}s
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/', auth, ${viewPerm}${camelCaseName}Controller.getAll);

/**
 * @swagger
 * /api/${camelCaseName}/{id}:
 *   get:
 *     summary: Get ${camelCaseName} by ID
 *     tags: [${capitalizedName}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ${capitalizedName} ID
 *     responses:
 *       200:
 *         description: ${capitalizedName} details
 *       404:
 *         description: ${capitalizedName} not found
 */
router.get('/:id', auth, ${viewPerm}${camelCaseName}Controller.getById);

/**
 * @swagger
 * /api/${camelCaseName}:
 *   post:
 *     summary: Create new ${camelCaseName}
 *     tags: [${capitalizedName}]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/${capitalizedName}'
 *     responses:
 *       201:
 *         description: ${capitalizedName} created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth, ${createPerm}${hasValidation ? `validate(create${capitalizedName}Schema), ` : ''}${camelCaseName}Controller.create);

/**
 * @swagger
 * /api/${camelCaseName}/{id}:
 *   put:
 *     summary: Update ${camelCaseName} by ID
 *     tags: [${capitalizedName}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ${capitalizedName} ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/${capitalizedName}'
 *     responses:
 *       200:
 *         description: ${capitalizedName} updated successfully
 *       404:
 *         description: ${capitalizedName} not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', auth, ${updatePerm}${hasValidation ? `validate(update${capitalizedName}Schema), ` : ''}${camelCaseName}Controller.update);

/**
 * @swagger
 * /api/${camelCaseName}/{id}:
 *   delete:
 *     summary: Delete ${camelCaseName} by ID
 *     tags: [${capitalizedName}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ${capitalizedName} ID
 *     responses:
 *       200:
 *         description: ${capitalizedName} deleted successfully
 *       404:
 *         description: ${capitalizedName} not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', auth, ${deletePerm}${camelCaseName}Controller.delete);

export default router;`;
};
