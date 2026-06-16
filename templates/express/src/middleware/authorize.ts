import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express-api';
import { AppError } from '../utils/AppError';
import { Task } from '../enums/Task';
import User from '../models/User';
import Role, { IRole } from '../models/Role';

/**
 * Authorization middleware — checks whether the authenticated user
 * holds at least one role that contains the required task.
 *
 * The SUPER_ADMIN task acts as a wildcard: any role that includes it
 * automatically satisfies every task check.
 *
 * Usage in routes:
 *   import { authorize } from '../middleware/authorize';
 *   import { Task } from '../enums/Task';
 *
 *   router.get('/admin/users', auth, authorize(Task.MANAGE_USERS), controller);
 *   router.delete('/admin/data', auth, authorize(Task.DELETE_DATA), controller);
 */
export const authorize = (...requiredTasks: Task[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        return next(new AppError('Unauthorized: Authentication required', 401));
      }

      // Fetch user with populated roles
      const user = await User.findById(req.user.id).populate<{ roles: IRole[] }>('roles');

      if (!user) {
        return next(new AppError('Unauthorized: User not found', 401));
      }

      if (!user.roles || user.roles.length === 0) {
        return next(new AppError('Forbidden: No roles assigned', 403));
      }

      // Collect all tasks from the user's active roles
      const userTasks = new Set<string>();
      for (const role of user.roles) {
        if (role.isActive) {
          for (const task of role.tasks) {
            userTasks.add(task);
          }
        }
      }

      // SUPER_ADMIN bypasses every check
      if (userTasks.has(Task.SUPER_ADMIN)) {
        return next();
      }

      // Check that the user has at least one of the required tasks
      const hasPermission = requiredTasks.some(task => userTasks.has(task));

      if (!hasPermission) {
        return next(new AppError('Forbidden: Insufficient permissions', 403));
      }

      next();
    } catch (error) {
      next(new AppError('Authorization check failed', 500));
    }
  };
};

export default authorize;
