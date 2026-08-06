import { Elysia } from 'elysia';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/tokenUtils';
import { Task } from '../enums/Task';
import { getUserWithRoles } from '../services/userService';
import { AuthUser } from '../types/api';

/**
 * Authentication + authorization as a SINGLE Elysia macro.
 *
 * Why combined (intentional divergence from the Express two-middleware split
 * `auth` + `checkPermission`): in Elysia, an auth `resolve` and a separate RBAC
 * `beforeHandle` registered as different macros are not guaranteed to run in a
 * stable order across versions, so the RBAC hook could see `user === undefined`.
 * Doing both in one `resolve` removes the ordering hazard entirely while
 * preserving identical behavior:
 *   { auth: true }            → authenticated only (parity with `auth`)
 *   { auth: [Task.VIEW_USERS] } → authenticated + permission (parity with
 *                                 `auth` + `checkPermission(...)`)
 *
 * Token-shape fix: the JWT payload field is `userId`, but controllers/RBAC read
 * `user.id`, so we map it here. `verifyAccessToken` is async and is awaited
 * (the Express `auth.ts` omits the await — a latent bug fixed here on purpose).
 */

const authenticate = async (authHeader: string | undefined): Promise<AuthUser> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Unauthorized: No token provided', 401);
  }
  const token = authHeader.slice('Bearer '.length);
  const decoded = await verifyAccessToken(token);
  if (!decoded) {
    throw new AppError('Unauthorized: Invalid token', 401);
  }
  return {
    id: decoded.userId,
    email: decoded.email ?? '',
    username: decoded.username ?? ''
  };
};

const assertPermission = async (userId: string, requiredTasks: Task[]): Promise<void> => {
  const user = await getUserWithRoles(userId);
  if (!user) {
    throw new AppError('Unauthorized: User not found', 401);
  }
  if (!user.roles || user.roles.length === 0) {
    throw new AppError('Forbidden: No roles assigned', 403);
  }

  const userTasks = new Set<string>();
  for (const role of user.roles) {
    if (role.isActive) {
      for (const task of role.tasks) userTasks.add(task);
    }
  }

  // SUPER_ADMIN is a wildcard that satisfies every check.
  if (userTasks.has(Task.SUPER_ADMIN)) return;

  const hasPermission = requiredTasks.some((task) => userTasks.has(task));
  if (!hasPermission) {
    throw new AppError('Forbidden: Insufficient permissions', 403);
  }
};

export const authPlugin = new Elysia({ name: 'koti-auth' }).macro({
  auth(value: boolean | Task[]) {
    if (value === false) return {};
    const tasks = Array.isArray(value) ? value : [];
    return {
      async resolve({ headers }: { headers: Record<string, string | undefined> }) {
        const user = await authenticate(headers['authorization']);
        if (tasks.length > 0) {
          await assertPermission(user.id, tasks);
        }
        return { user };
      }
    };
  }
});

export default authPlugin;
