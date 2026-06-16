import { Elysia, t } from 'elysia';
import { userController } from '../controllers/userController';
import { authPlugin } from '../middleware/auth';
import { Task } from '../enums/Task';

const tag = ['Users'];
const secured = { security: [{ bearerAuth: [] }] };
const idParam = t.Object({ id: t.String() });

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(authPlugin)
  .get('/', userController.getAll, {
    auth: [Task.VIEW_USERS],
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      search: t.Optional(t.String()),
      sortBy: t.Optional(t.String()),
      sortOrder: t.Optional(t.String()),
      isActive: t.Optional(t.String())
    }),
    detail: { tags: tag, summary: 'Get paginated list of users', ...secured }
  })
  .get('/:id', userController.getById, {
    auth: [Task.VIEW_USERS],
    params: idParam,
    detail: { tags: tag, summary: 'Get user by ID', ...secured }
  })
  .post('/', userController.create, {
    auth: [Task.CREATE_USER],
    body: t.Object({
      username: t.String(),
      email: t.String({ format: 'email' }),
      password: t.String(),
      firstName: t.Optional(t.String()),
      lastName: t.Optional(t.String()),
      roles: t.Optional(t.Array(t.String()))
    }),
    detail: { tags: tag, summary: 'Create a new user', ...secured }
  })
  .put('/:id', userController.update, {
    auth: [Task.UPDATE_USER],
    params: idParam,
    body: t.Object({
      username: t.Optional(t.String()),
      email: t.Optional(t.String({ format: 'email' })),
      firstName: t.Optional(t.String()),
      lastName: t.Optional(t.String()),
      isActive: t.Optional(t.Boolean())
    }),
    detail: { tags: tag, summary: 'Update an existing user', ...secured }
  })
  .delete('/:id', userController.delete, {
    auth: [Task.DELETE_USER],
    params: idParam,
    detail: { tags: tag, summary: 'Soft-delete a user', ...secured }
  })
  .put('/:id/roles', userController.assignRoles, {
    auth: [Task.MANAGE_USER_ROLES],
    params: idParam,
    body: t.Object({ roles: t.Array(t.String()) }),
    detail: { tags: tag, summary: 'Assign roles to a user', ...secured }
  });

export default userRoutes;
