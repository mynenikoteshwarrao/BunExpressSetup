import { FieldSpec, capitalize, toCamelCase, toUpperSnakeCase } from '../context';

export const generateElysiaCrudController = (modelName: string, fields: FieldSpec[]): string => {
  const capitalizedName = capitalize(modelName);
  const camelCaseName = toCamelCase(modelName);
  return `import ${capitalizedName}Service from '../services/${camelCaseName}Service';
import { AppError } from '../utils/AppError';
import { success, paginated } from '../utils/respond';

export const ${camelCaseName}Controller = {
  /** List ${camelCaseName}s with pagination, search and sorting */
  async getAll({ query }: any) {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || parseInt(process.env.DEFAULT_PAGE_LIMIT || '10');
    const search = query.search as string | undefined;
    const sortBy = (query.sortBy as string) || 'createdAt';
    const sortOrder = ((query.sortOrder as string) === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';
    const result = await ${capitalizedName}Service.getAll({ page, limit, search, sortBy, sortOrder });
    return paginated('${capitalizedName}s retrieved successfully', result.data, result.pagination);
  },

  /** Get one ${camelCaseName} by id */
  async getById({ params }: any) {
    const item = await ${capitalizedName}Service.getById(params.id);
    if (!item) throw new AppError('${capitalizedName} not found', 404);
    return success('${capitalizedName} retrieved successfully', item);
  },

  /** Create a ${camelCaseName} */
  async create({ body, set }: any) {
    const item = await ${capitalizedName}Service.create(body);
    set.status = 201;
    return success('${capitalizedName} created successfully', item);
  },

  /** Update a ${camelCaseName} */
  async update({ params, body }: any) {
    const item = await ${capitalizedName}Service.update(params.id, body);
    if (!item) throw new AppError('${capitalizedName} not found', 404);
    return success('${capitalizedName} updated successfully', item);
  },

  /** Delete a ${camelCaseName} */
  async delete({ params }: any) {
    const deleted = await ${capitalizedName}Service.delete(params.id);
    if (!deleted) throw new AppError('${capitalizedName} not found', 404);
    return success('${capitalizedName} deleted successfully');
  }
};

export default ${camelCaseName}Controller;
`;
};

const typeBoxFor = (field: FieldSpec): string => {
  switch (field.type) {
    case 'String': return 't.String()';
    case 'Number': return 't.Number()';
    case 'Boolean': return 't.Boolean()';
    case 'Date': return `t.String({ format: 'date-time' })`;
    case 'ObjectId': return 't.String()';
    case 'Array': return 't.Array(t.Any())';
    default: return 't.Any()'; // Mixed, JSON
  }
};

export const generateTypeBoxValidator = (modelName: string, fields: FieldSpec[]): string => {
  const capitalizedName = capitalize(modelName);
  const props = fields.map((field) => {
    const base = typeBoxFor(field);
    const value = field.required ? base : `t.Optional(${base})`;
    return `  ${field.name}: ${value}`;
  }).join(',\n');
  return `import { t } from 'elysia';

export const create${capitalizedName}Body = t.Object({
${props}
});

export const update${capitalizedName}Body = t.Partial(create${capitalizedName}Body);
`;
};

export const generateElysiaCrudRoutes = (modelName: string, fields: FieldSpec[], withTasks: boolean = false): string => {
  const capitalizedName = capitalize(modelName);
  const camelCaseName = toCamelCase(modelName);
  const upperSnakeName = toUpperSnakeCase(modelName);
  const taskImport = withTasks ? `\nimport { Task } from '../enums/Task';` : '';
  const authFor = (op: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE'): string =>
    withTasks ? `[Task.${op}_${upperSnakeName}]` : 'true';
  return `import { Elysia, t } from 'elysia';
import { ${camelCaseName}Controller } from '../controllers/${camelCaseName}Controller';
import { authPlugin } from '../middleware/auth';${taskImport}
import { create${capitalizedName}Body, update${capitalizedName}Body } from '../validators/${camelCaseName}';

const tag = ['${capitalizedName}s'];
const secured = { security: [{ bearerAuth: [] }] };
const idParam = t.Object({ id: t.String() });

export const ${camelCaseName}Routes = new Elysia({ prefix: '/${camelCaseName}' })
  .use(authPlugin)
  .get('/', ${camelCaseName}Controller.getAll, {
    auth: ${authFor('VIEW')},
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      search: t.Optional(t.String()),
      sortBy: t.Optional(t.String()),
      sortOrder: t.Optional(t.String())
    }),
    detail: { tags: tag, summary: 'List ${capitalizedName}s', ...secured }
  })
  .get('/:id', ${camelCaseName}Controller.getById, {
    auth: ${authFor('VIEW')},
    params: idParam,
    detail: { tags: tag, summary: 'Get ${capitalizedName} by ID', ...secured }
  })
  .post('/', ${camelCaseName}Controller.create, {
    auth: ${authFor('CREATE')},
    body: create${capitalizedName}Body,
    detail: { tags: tag, summary: 'Create a ${capitalizedName}', ...secured }
  })
  .put('/:id', ${camelCaseName}Controller.update, {
    auth: ${authFor('UPDATE')},
    params: idParam,
    body: update${capitalizedName}Body,
    detail: { tags: tag, summary: 'Update a ${capitalizedName}', ...secured }
  })
  .delete('/:id', ${camelCaseName}Controller.delete, {
    auth: ${authFor('DELETE')},
    params: idParam,
    detail: { tags: tag, summary: 'Delete a ${capitalizedName}', ...secured }
  });

export default ${camelCaseName}Routes;
`;
};
