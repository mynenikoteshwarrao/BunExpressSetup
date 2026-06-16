/**
 * Task Enum — defines all permission tasks in the system.
 *
 * Each task represents a single permission that can be assigned to a role.
 * Roles group tasks together, and users are assigned one or more roles.
 *
 * The SUPER_ADMIN task is special: it bypasses all authorization checks.
 * Only the "Super Admin" role should have this task.
 *
 * Developers add new tasks here as the application grows. Use the CLI
 * command `koti task <name>` to add a new task with its description.
 */

export enum Task {
  /** Grants unrestricted access to all operations. Only for the Super Admin role. */
  SUPER_ADMIN = 'SUPER_ADMIN',

  /** View the list of users and user details */
  VIEW_USERS = 'VIEW_USERS',

  /** Create new user accounts */
  CREATE_USER = 'CREATE_USER',

  /** Update existing user accounts */
  UPDATE_USER = 'UPDATE_USER',

  /** Soft-delete or deactivate user accounts */
  DELETE_USER = 'DELETE_USER',

  /** Assign or remove roles from users */
  MANAGE_USER_ROLES = 'MANAGE_USER_ROLES',
}

/**
 * Human-readable descriptions for each task.
 * Kept in sync with the Task enum — every task must have a description entry.
 */
export const TaskDescriptions: Record<Task, string> = {
  [Task.SUPER_ADMIN]: 'Grants unrestricted access to all operations',
  [Task.VIEW_USERS]: 'View the list of users and user details',
  [Task.CREATE_USER]: 'Create new user accounts',
  [Task.UPDATE_USER]: 'Update existing user accounts',
  [Task.DELETE_USER]: 'Soft-delete or deactivate user accounts',
  [Task.MANAGE_USER_ROLES]: 'Assign or remove roles from users',
};
