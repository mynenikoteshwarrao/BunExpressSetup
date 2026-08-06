import { pgTable, uuid, primaryKey, index } from 'drizzle-orm/pg-core';
import { users } from './User';
import { roles } from './Role';

/**
 * Join table for the Mongoose `User.roles: ObjectId[] ref Role` array —
 * a proper many-to-many with foreign keys.
 */
export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.userId, t.roleId] }),
  index('user_roles_role_id_idx').on(t.roleId),
]);

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
