import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api';
import { AppError } from '../utils/AppError';
import * as userService from '../services/userService';

class UserController {
  /**
   * Get paginated list of users
   * @route GET /api/users
   */
  public async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        isActive,
      } = req.query as Record<string, string>;

      const result = await userService.getUsers({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        search,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      });

      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single user by ID
   * @route GET /api/users/:id
   */
  public async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.id);

      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new user
   * @route POST /api/users
   */
  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password, firstName, lastName, roles } = req.body;

      if (!username || !email || !password) {
        return next(new AppError('Username, email, and password are required', 400));
      }

      const user = await userService.createUser({
        username,
        email,
        password,
        firstName,
        lastName,
        roles,
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing user
   * @route PUT /api/users/:id
   */
  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, firstName, lastName, isActive } = req.body;

      const user = await userService.updateUser(req.params.id, {
        username,
        email,
        firstName,
        lastName,
        isActive,
      });

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Soft-delete a user
   * @route DELETE /api/users/:id
   */
  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const deletedBy = req.user!.id;

      await userService.deleteUser(req.params.id, deletedBy);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign roles to a user
   * @route PUT /api/users/:id/roles
   */
  public async assignRoles(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roles } = req.body;

      if (!Array.isArray(roles)) {
        return next(new AppError('roles must be an array of role IDs', 400));
      }

      const user = await userService.assignRoles(req.params.id, roles);

      res.json({
        success: true,
        message: 'Roles assigned successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
