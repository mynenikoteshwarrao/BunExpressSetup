import { User } from '../models/User';

/**
 * Keeper of the wire contract: the Mongoose layer strips these in the User
 * schema's `toJSON` transform, so the Postgres layer must strip them here.
 * Responses are byte-for-byte key-identical across both databases.
 */
const SECRET_FIELDS = [
  'password',
  'refreshTokens',
  'passwordResetToken',
  'passwordResetExpires',
  'emailVerificationToken',
] as const;

export type SecretField = (typeof SECRET_FIELDS)[number];
export type PublicUser = Omit<User, SecretField>;

export function toPublic<T extends Record<string, unknown>>(row: T): Omit<T, SecretField> {
  const out = { ...row };
  for (const k of SECRET_FIELDS) delete (out as Record<string, unknown>)[k];
  return out as Omit<T, SecretField>;
}

/** Columns to select when a query must never expose secrets. */
export const publicUserColumns = {
  id: true, username: true, email: true, firstName: true, lastName: true,
  profilePicture: true, profileImageUrl: true, googleId: true, authProvider: true,
  isActive: true, isEmailVerified: true, lastLogin: true, isDeleted: true,
  deletedAt: true, deletedBy: true, createdAt: true, updatedAt: true,
} as const;
