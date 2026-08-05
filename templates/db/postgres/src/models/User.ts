import { pgTable, uuid, text, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password'),                      // null for OAuth-only accounts; excluded from default selects
  firstName: text('first_name'),
  lastName: text('last_name'),
  profilePicture: text('profile_picture'),
  profileImageUrl: text('profile_image_url'),
  googleId: text('google_id'),
  authProvider: text('auth_provider').notNull().default('local'),  // 'local' | 'google'
  isActive: boolean('is_active').notNull().default(true),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  refreshTokens: text('refresh_tokens').array().notNull().default(sql`'{}'`),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: timestamp('password_reset_expires', { withTimezone: true }),
  emailVerificationToken: text('email_verification_token'),
  lastLogin: timestamp('last_login', { withTimezone: true }),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  // Mongoose `sparse: true` unique — many rows may have no googleId.
  uniqueIndex('users_google_id_unique').on(t.googleId).where(sql`${t.googleId} IS NOT NULL`),
  index('users_is_active_idx').on(t.isActive),
  index('users_is_deleted_idx').on(t.isDeleted),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
