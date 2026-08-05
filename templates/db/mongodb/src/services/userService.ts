import { Types } from 'mongoose';
import User, { IUser } from '../models/User';
import Role, { IRole } from '../models/Role';
import { AppError } from '../utils/AppError';

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

  const query: any = { isDeleted: false };

  if (typeof isActive === 'boolean') {
    query.isActive = isActive;
  }

  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [users, total] = await Promise.all([
    User.find(query)
      .populate<{ roles: IRole[] }>('roles', 'name description tasks isActive')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    users,
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
 * Get a single user by ID with populated roles.
 */
export const getUserById = async (userId: string) => {
  const user = await User.findOne({ _id: userId, isDeleted: false })
    .populate<{ roles: IRole[] }>('roles', 'name description tasks isActive')
    .lean();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

/**
 * Create a new user (admin action).
 */
export const createUser = async (data: ICreateUserInput) => {
  const existing = await User.findOne({
    $or: [{ email: data.email }, { username: data.username }],
  });

  if (existing) {
    if (existing.email === data.email) {
      throw new AppError('A user with this email already exists', 409);
    }
    throw new AppError('This username is already taken', 409);
  }

  // Validate role IDs if provided
  if (data.roles && data.roles.length > 0) {
    const validRoles = await Role.find({
      _id: { $in: data.roles },
      isActive: true,
    });
    if (validRoles.length !== data.roles.length) {
      throw new AppError('One or more role IDs are invalid or inactive', 400);
    }
  }

  const user = new User({
    username: data.username,
    email: data.email,
    password: data.password,
    firstName: data.firstName,
    lastName: data.lastName,
    roles: data.roles || [],
    authProvider: 'local',
    isEmailVerified: false,
    isActive: true,
  });

  await user.save();

  // Return without sensitive fields
  return getUserById(user._id.toString());
};

/**
 * Update an existing user.
 */
export const updateUser = async (userId: string, data: IUpdateUserInput) => {
  const user = await User.findOne({ _id: userId, isDeleted: false });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check unique constraints if username or email is being changed
  if (data.username && data.username !== user.username) {
    const existing = await User.findOne({ username: data.username });
    if (existing) {
      throw new AppError('This username is already taken', 409);
    }
  }

  if (data.email && data.email !== user.email) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw new AppError('A user with this email already exists', 409);
    }
  }

  Object.assign(user, data);
  await user.save();

  return getUserById(userId);
};

/**
 * Soft-delete a user.
 */
export const deleteUser = async (userId: string, deletedBy: string) => {
  const user = await User.findOne({ _id: userId, isDeleted: false });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.isDeleted = true;
  user.deletedAt = new Date();
  user.deletedBy = new Types.ObjectId(deletedBy);
  user.isActive = false;
  await user.save();
};

/**
 * Assign roles to a user (replaces existing roles).
 */
export const assignRoles = async (userId: string, roleIds: string[]) => {
  const user = await User.findOne({ _id: userId, isDeleted: false });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Validate all role IDs
  const validRoles = await Role.find({
    _id: { $in: roleIds },
    isActive: true,
  });

  if (validRoles.length !== roleIds.length) {
    throw new AppError('One or more role IDs are invalid or inactive', 400);
  }

  user.roles = roleIds.map(id => new Types.ObjectId(id));
  await user.save();

  return getUserById(userId);
};

/**
 * Load a user's active-role tasks for RBAC checks.
 * Returns null when the user does not exist.
 */
export const getUserWithRoles = async (id: string): Promise<UserWithRoles | null> => {
  const user = await User.findById(id).populate<{ roles: IRole[] }>('roles').lean();
  if (!user) return null;
  return {
    id: String(user._id),
    isActive: user.isActive,
    roles: (user.roles ?? []).map(r => ({
      name: r.name,
      tasks: r.tasks ?? [],
      isActive: r.isActive ?? true,
    })),
  };
};
