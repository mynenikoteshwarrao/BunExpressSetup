import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '../config/database';
import { users } from '../models/User';
import { roles } from '../models/Role';
import { userRoles } from '../models/UserRole';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokenUtils';
import { AppError } from '../utils/AppError';
import { sendEmail, emailTemplates } from '../config/email';
import { normalizeEmail, normalizeUsername } from './normalize';
import { PublicUser, toPublic } from './serialize';

export interface IUserSignup {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface IUserLogin {
  email: string;
  password: string;
}

export interface IAuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface IGoogleUserData {
  googleId: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
}

// Mongoose hashes in a `pre('save')` hook; with Drizzle there is no schema
// hook, so hashing is explicit at every write that touches a password.
const saltRounds = (): number => Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

export const hashPassword = async (plain: string): Promise<string> => bcrypt.hash(plain, saltRounds());

export const comparePassword = async (plain: string, hash: string | null): Promise<boolean> =>
  hash ? bcrypt.compare(plain, hash) : false;

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

/** Append a refresh token to a user's list without reading it back first. */
const addRefreshToken = async (userId: string, token: string): Promise<void> => {
  await db.update(users)
    .set({ refreshTokens: sql`array_append(${users.refreshTokens}, ${token})`, lastLogin: new Date() })
    .where(eq(users.id, userId));
};

export const login = async (email: string, password: string): Promise<IAuthResult & { roles: any[]; tasks: string[] }> => {
  // Login is the one read that needs the hidden password column.
  const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact support.', 401);
  }

  const passwordMatches = await comparePassword(password, user.password);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  const userId = user.id;
  const accessToken = await generateAccessToken({ userId });
  const refreshToken = await generateRefreshToken({ userId });

  await addRefreshToken(userId, refreshToken);

  const roleRows = await db
    .select({ id: roles.id, name: roles.name, description: roles.description, tasks: roles.tasks, isActive: roles.isActive })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const activeRoles = roleRows.filter(r => r.isActive);
  const tasks = [...new Set(activeRoles.flatMap(r => r.tasks ?? []))];

  return {
    user: toPublic(user),
    accessToken,
    refreshToken,
    roles: activeRoles,
    tasks,
  };
};

export const signup = async (userData: IUserSignup): Promise<{ user?: PublicUser; message?: string }> => {
  try {
    const email = normalizeEmail(userData.email);
    const username = normalizeUsername(userData.username);

    const existing = await db.select({ email: users.email }).from(users)
      .where(sql`${users.email} = ${email} OR ${users.username} = ${username}`).limit(1);

    if (existing.length > 0) {
      if (existing[0].email === email) {
        return { message: 'User already exists with this email' };
      }
      return { message: 'Username is already taken' };
    }

    const [newUser] = await db.insert(users).values({
      username,
      email,
      password: await hashPassword(userData.password),
      firstName: userData.firstName,
      lastName: userData.lastName,
      authProvider: 'local',
      isEmailVerified: false,
    }).returning();

    try {
      const welcomeTemplate = emailTemplates.welcomeEmail(username);
      await sendEmail({
        to: email,
        subject: welcomeTemplate.subject,
        html: welcomeTemplate.html,
        text: welcomeTemplate.text
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't throw error for email failure
    }

    return { user: toPublic(newUser) };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError('Signup failed: ' + error.message, 400);
  }
};

/**
 * Single home for the Google upsert: find by googleId → link by email →
 * create. Passport (Express) and the Elysia oauth controller both delegate here.
 */
export const googleAuth = async (googleUserData: IGoogleUserData): Promise<IAuthResult> => {
  const user = await db.transaction(async (tx) => {
    const [byGoogleId] = await tx.select().from(users).where(eq(users.googleId, googleUserData.googleId)).limit(1);
    if (byGoogleId) return byGoogleId;

    const [byEmail] = await tx.select().from(users).where(eq(users.email, normalizeEmail(googleUserData.email))).limit(1);
    if (byEmail) {
      const [linked] = await tx.update(users).set({
        googleId: googleUserData.googleId,
        authProvider: 'google',
        isEmailVerified: true,
        profilePicture: byEmail.profilePicture ?? googleUserData.profilePicture,
      }).where(eq(users.id, byEmail.id)).returning();
      return linked;
    }

    const [created] = await tx.insert(users).values({
      googleId: googleUserData.googleId,
      username: normalizeUsername(googleUserData.username),
      email: normalizeEmail(googleUserData.email),
      firstName: googleUserData.firstName,
      lastName: googleUserData.lastName,
      profilePicture: googleUserData.profilePicture,
      authProvider: 'google',
      isEmailVerified: true,
      isActive: true,
    }).returning();
    return created;
  });

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact support.', 401);
  }

  const accessToken = await generateAccessToken({ userId: user.id });
  const refreshToken = await generateRefreshToken({ userId: user.id });

  await addRefreshToken(user.id, refreshToken);

  return {
    user: toPublic(user),
    accessToken,
    refreshToken
  };
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const hashedToken = sha256(token);

  const [user] = await db.select().from(users)
    .where(and(eq(users.passwordResetToken, hashedToken), gt(users.passwordResetExpires, new Date())))
    .limit(1);

  if (!user) {
    throw new AppError('Token is invalid or has expired', 400);
  }

  await db.update(users).set({
    password: await hashPassword(newPassword),
    passwordResetToken: null,
    passwordResetExpires: null,
    refreshTokens: [],   // Clear all refresh tokens
  }).where(eq(users.id, user.id));

  try {
    const confirmationTemplate = emailTemplates.passwordResetConfirmation(user.username);
    await sendEmail({
      to: user.email,
      subject: confirmationTemplate.subject,
      html: confirmationTemplate.html,
      text: confirmationTemplate.text
    });
  } catch (emailError) {
    console.error('Failed to send password reset confirmation email:', emailError);
  }
};

export const forgotPassword = async (email: string): Promise<void> => {
  const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);

  if (!user) {
    // Don't reveal if email exists
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  await db.update(users).set({
    passwordResetToken: sha256(resetToken),
    passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
  }).where(eq(users.id, user.id));

  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const resetTemplate = emailTemplates.resetPasswordEmail(resetToken, resetUrl);

    await sendEmail({
      to: user.email,
      subject: resetTemplate.subject,
      html: resetTemplate.html,
      text: resetTemplate.text
    });
  } catch (error) {
    await db.update(users)
      .set({ passwordResetToken: null, passwordResetExpires: null })
      .where(eq(users.id, user.id));

    throw new AppError('There was an error sending the email. Try again later.', 500);
  }
};

export const refreshAccessToken = async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
  const decoded = await verifyRefreshToken(refreshToken);

  if (!decoded || !decoded.userId) {
    throw new AppError('Invalid refresh token', 401);
  }

  const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);

  if (!user || !user.refreshTokens.includes(refreshToken)) {
    throw new AppError('Invalid refresh token', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401);
  }

  const newAccessToken = await generateAccessToken({ userId: decoded.userId });
  const newRefreshToken = await generateRefreshToken({ userId: decoded.userId });

  // Rotate: drop the presented token, keep the rest, add the new one.
  const rotated = user.refreshTokens.filter(token => token !== refreshToken).concat(newRefreshToken);
  await db.update(users).set({ refreshTokens: rotated }).where(eq(users.id, user.id));

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
};

export const logout = async (refreshToken: string): Promise<void> => {
  const decoded = await verifyRefreshToken(refreshToken);

  if (decoded && decoded.userId) {
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);

    if (user) {
      await db.update(users)
        .set({ refreshTokens: user.refreshTokens.filter(token => token !== refreshToken) })
        .where(eq(users.id, user.id));
    }
  }
};

export const getUserById = async (userId: string): Promise<PublicUser | null> => {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ? toPublic(user) : null;
};

export const verifyEmailToken = async (token: string): Promise<void> => {
  const hashedToken = sha256(token);

  const [user] = await db.select({ id: users.id }).from(users)
    .where(eq(users.emailVerificationToken, hashedToken)).limit(1);

  if (!user) {
    throw new AppError('Token is invalid', 400);
  }

  await db.update(users)
    .set({ isEmailVerified: true, emailVerificationToken: null })
    .where(eq(users.id, user.id));
};

export const resendEmailVerification = async (email: string): Promise<void> => {
  const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isEmailVerified) {
    throw new AppError('Email is already verified', 400);
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  await db.update(users)
    .set({ emailVerificationToken: sha256(verificationToken) })
    .where(eq(users.id, user.id));

  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Email Verification',
      html: `
        <h2>Email Verification</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
      text: `Please verify your email by visiting: ${verificationUrl}`
    });
  } catch (error) {
    await db.update(users)
      .set({ emailVerificationToken: null })
      .where(eq(users.id, user.id));

    throw new AppError('Failed to send verification email', 500);
  }
};

// Update user profile
export const updateUserProfile = async (userId: string, updates: Partial<typeof users.$inferInsert>): Promise<PublicUser | null> => {
  const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
  return updated ? toPublic(updated) : null;
};
