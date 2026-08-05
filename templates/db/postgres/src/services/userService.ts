import { and, asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { db } from '../config/database';
import { users } from '../models/User';
import { roles } from '../models/Role';
import { userRoles } from '../models/UserRole';
import { AppError } from '../utils/AppError';
import { hashPassword } from './authService';
import { normalizeEmail, normalizeUsername } from './normalize';
import { PublicUser, toPublic } from './serialize';

export interface ICreateUserInput {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
}

export interface IUpdateUserInput {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

/**
 * Minimal user shape the RBAC middleware needs. Both db layers expose
 * `getUserWithRoles` with this exact signature — it is the auth-path seam
 * that keeps the middleware framework-only.
 */
export interface UserWithRoles {
  id: string;
  isActive: boolean;
  roles: Array<{ name: string; tasks: string[]; isActive: boolean }>;
}

export interface IUserListOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
}

const SORTABLE = {
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  username: users.username,
  email: users.email,
  lastLogin: users.lastLogin,
} as const;

/** Roles attached to a set of users, in one round trip. */
const rolesByUser = async (userIds: string[]) => {
  const map = new Map<string, Array<typeof roles.$inferSelect>>();
  if (userIds.length === 0) return map;
  const rows = await db
    .select({ userId: userRoles.userId, role: roles })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(inArray(userRoles.userId, userIds));
  for (const row of rows) {
    const list = map.get(row.userId) ?? [];
    list.push(row.role);
    map.set(row.userId, list);
  }
  return map;
};

/**
 * Get paginated list of users with optional search and filters.
 */
export const getUsers = async (options: IUserListOptions = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    isActive,
  } = options;

  const filters = [eq(users.isDeleted, false)];
  if (typeof isActive === 'boolean') filters.push(eq(users.isActive, isActive));
  if (search) {
    const like = `%${search}%`;
    filters.push(
      or(
        ilike(users.username, like),
        ilike(users.email, like),
        ilike(users.firstName, like),
        ilike(users.lastName, like),
      )!,
    );
  }
  const where = and(...filters);

  const sortColumn = SORTABLE[sortBy as keyof typeof SORTABLE] ?? users.createdAt;
  const offset = (page - 1) * limit;

  const [rows, totals] = await Promise.all([
    db.select().from(users).where(where)
      .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(limit).offset(offset),
    db.select({ value: count() }).from(users).where(where),
  ]);

  const total = totals[0]?.value ?? 0;
  const roleMap = await rolesByUser(rows.map(r => r.id));

  return {
    users: rows.map(row => ({ ...toPublic(row), roles: roleMap.get(row.id) ?? [] })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

/**
 * Get a single user by ID with their roles.
 */
export const getUserById = async (userId: string) => {
  const [row] = await db.select().from(users)
    .where(and(eq(users.id, userId), eq(users.isDeleted, false))).limit(1);

  if (!row) {
    throw new AppError('User not found', 404);
  }

  const roleMap = await rolesByUser([row.id]);
  return { ...toPublic(row), roles: roleMap.get(row.id) ?? [] };
};

/**
 * Create a new user (admin action). The insert and the role assignment are
 * one transaction — a user must never exist without its intended roles.
 */
export const createUser = async (data: ICreateUserInput) => {
  const email = normalizeEmail(data.email);
  const username = normalizeUsername(data.username);

  const existing = await db.select({ id: users.id, email: users.email }).from(users)
    .where(or(eq(users.email, email), eq(users.username, username))).limit(1);

  if (existing.length > 0) {
    if (existing[0].email === email) {
      throw new AppError('A user with this email already exists', 409);
    }
    throw new AppError('This username is already taken', 409);
  }

  if (data.roles && data.roles.length > 0) {
    const validRoles = await db.select({ id: roles.id }).from(roles)
      .where(and(inArray(roles.id, data.roles), eq(roles.isActive, true)));
    if (validRoles.length !== data.roles.length) {
      throw new AppError('One or more role IDs are invalid or inactive', 400);
    }
  }

  // There is no pre('save') hook here — every write that touches a password
  // hashes explicitly, exactly as authService.register does.
  const password = await hashPassword(data.password);

  const created = await db.transaction(async (tx) => {
    const [row] = await tx.insert(users).values({
      username,
      email,
      password,
      firstName: data.firstName,
      lastName: data.lastName,
      authProvider: 'local',
      isEmailVerified: false,
      isActive: true,
    }).returning();

    if (data.roles && data.roles.length > 0) {
      await tx.insert(userRoles).values(data.roles.map(roleId => ({ userId: row.id, roleId })));
    }
    return row;
  });

  return getUserById(created.id);
};

/**
 * Update an existing user.
 */
export const updateUser = async (userId: string, data: IUpdateUserInput) => {
  const [user] = await db.select().from(users)
    .where(and(eq(users.id, userId), eq(users.isDeleted, false))).limit(1);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const changes = { ...data };
  if (changes.username !== undefined) changes.username = normalizeUsername(changes.username);
  if (changes.email !== undefined) changes.email = normalizeEmail(changes.email);

  if (changes.username && changes.username !== user.username) {
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, changes.username)).limit(1);
    if (taken) {
      throw new AppError('This username is already taken', 409);
    }
  }

  if (changes.email && changes.email !== user.email) {
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, changes.email)).limit(1);
    if (taken) {
      throw new AppError('A user with this email already exists', 409);
    }
  }

  await db.update(users).set(changes).where(eq(users.id, userId));

  return getUserById(userId);
};

/**
 * Soft-delete a user.
 */
export const deleteUser = async (userId: string, deletedBy: string) => {
  const [user] = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.id, userId), eq(users.isDeleted, false))).limit(1);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  await db.update(users)
    .set({ isDeleted: true, deletedAt: new Date(), deletedBy, isActive: false })
    .where(eq(users.id, userId));
};

/**
 * Assign roles to a user (replaces existing roles) — one transaction so the
 * user is never left role-less if the insert fails.
 */
export const assignRoles = async (userId: string, roleIds: string[]) => {
  const [user] = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.id, userId), eq(users.isDeleted, false))).limit(1);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const validRoles = await db.select({ id: roles.id }).from(roles)
    .where(and(inArray(roles.id, roleIds), eq(roles.isActive, true)));

  if (validRoles.length !== roleIds.length) {
    throw new AppError('One or more role IDs are invalid or inactive', 400);
  }

  await db.transaction(async (tx) => {
    await tx.delete(userRoles).where(eq(userRoles.userId, userId));
    if (roleIds.length > 0) {
      await tx.insert(userRoles).values(roleIds.map(roleId => ({ userId, roleId })));
    }
  });

  return getUserById(userId);
};

/**
 * Load a user's active-role tasks for RBAC checks.
 * Returns null when the user does not exist.
 */
export const getUserWithRoles = async (id: string): Promise<UserWithRoles | null> => {
  const [user] = await db.select({ id: users.id, isActive: users.isActive }).from(users)
    .where(eq(users.id, id)).limit(1);
  if (!user) return null;

  const rows = await db.select({ name: roles.name, tasks: roles.tasks, isActive: roles.isActive })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, id));

  return {
    id: user.id,
    isActive: user.isActive,
    roles: rows.map(r => ({ name: r.name, tasks: r.tasks ?? [], isActive: r.isActive })),
  };
};

export type { PublicUser };
