import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express-api';
import { AppError } from '../utils/AppError';
import { Task } from '../enums/Task';
import User from '../models/User';
import { IRole } from '../models/Role';

/**
 * Permission check middleware — verifies the authenticated user
 * holds at least one role that contains the required task(s).
 *
 * This middleware is INDEPENDENT from the `auth` middleware.
 * `auth` handles authentication (is the user who they claim to be?).
 * `checkPermission` handles authorization (does the user have permission?).
 *
 * Use `auth` alone when a route only requires the user to be logged in.
 * Chain `auth` + `checkPermission` when a route needs specific permissions.
 *
 * The SUPER_ADMIN task acts as a wildcard — any role that includes it
 * automatically satisfies every permission check.
 *
 * Usage in routes:
 *   import { auth } from '../middleware/auth';
 *   import { checkPermission } from '../middleware/checkPermission';
 *   import { Task } from '../enums/Task';
 *
 *   // Only needs authentication (no specific permission)
 *   router.get('/profile', auth, controller.getProfile);
 *
 *   // Needs authentication + specific permission
 *   router.get('/users', auth, checkPermission(Task.VIEW_USERS), controller.getAll);
 *
 *   // Needs authentication + one of multiple permissions
 *   router.put('/users/:id', auth, checkPermission(Task.UPDATE_USER, Task.MANAGE_USER_ROLES), controller.update);
 */
export const checkPermission = (...requiredTasks: Task[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Auth middleware must run before this — verify user is present
      if (!req.user?.id) {
        return next(new AppError('Unauthorized: Authentication required before permission check', 401));
      }

      // Fetch user with populated roles
      const user = await User.findById(req.user.id)
        .populate<{ roles: IRole[] }>('roles');

      if (!user) {
        return next(new AppError('Unauthorized: User not found', 401));
      }

      if (!user.roles || user.roles.length === 0) {
        return next(new AppError('Forbidden: No roles assigned to this user', 403));
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

      // SUPER_ADMIN bypasses every permission check
      if (userTasks.has(Task.SUPER_ADMIN)) {
        return next();
      }

      // Check that the user holds at least one of the required tasks
      const hasPermission = requiredTasks.some(task => userTasks.has(task));

      if (!hasPermission) {
        return next(new AppError('Forbidden: You do not have the required permissions', 403));
      }

      next();
    } catch (error) {
      next(new AppError('Permission check failed', 500));
    }
  };
};

export default checkPermission;
