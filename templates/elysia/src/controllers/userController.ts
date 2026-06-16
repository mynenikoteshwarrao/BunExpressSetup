import * as userService from '../services/userService';
import { AppError } from '../utils/AppError';
import { success } from '../utils/respond';

export const userController = {
  async getAll({ query }: any) {
    const {
      page = '1',
      limit = '20',
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive
    } = query;

    const result = await userService.getUsers({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc',
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    });

    return {
      success: true,
      message: 'Users retrieved successfully',
      data: result.users,
      pagination: result.pagination
    };
  },

  async getById({ params }: any) {
    const user = await userService.getUserById(params.id);
    return success('User retrieved successfully', user);
  },

  async create({ body, set }: any) {
    const { username, email, password, firstName, lastName, roles } = body;
    if (!username || !email || !password) {
      throw new AppError('Username, email, and password are required', 400);
    }
    const user = await userService.createUser({ username, email, password, firstName, lastName, roles });
    set.status = 201;
    return success('User created successfully', user);
  },

  async update({ params, body }: any) {
    const { username, email, firstName, lastName, isActive } = body;
    const user = await userService.updateUser(params.id, { username, email, firstName, lastName, isActive });
    return success('User updated successfully', user);
  },

  async delete({ params, user }: any) {
    await userService.deleteUser(params.id, user.id);
    return success('User deleted successfully');
  },

  async assignRoles({ params, body }: any) {
    const { roles } = body;
    if (!Array.isArray(roles)) {
      throw new AppError('roles must be an array of role IDs', 400);
    }
    const updated = await userService.assignRoles(params.id, roles);
    return success('Roles assigned successfully', updated);
  }
};

export default userController;
