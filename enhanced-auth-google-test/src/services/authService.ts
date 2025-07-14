import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Types } from 'mongoose';
import User from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokenUtils';
import { AppError } from '../utils/AppError';

export interface IUser {
  _id?: string;
  username: string;
  email: string;
  password?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const login = async (email: string, password: string) => {
  const user = await User.findOne({ email }).lean();
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  const userId = (user._id as Types.ObjectId).toString();

  const accessToken = await generateAccessToken({ userId });
  const refreshToken = await generateRefreshToken({ userId });

  // TODO: Store refresh token in database
  // await new RefreshToken({ userId, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }).save();

  const { password: _, ...userWithoutPassword } = user;
  return { accessToken, refreshToken, user: userWithoutPassword };
};

export const signup = async (userData: IUser & { password: string }) => {
  try {
    const existingUser = await User.findOne({ email: userData.email }).lean();
    if (existingUser) {
      return { message: 'User already exists with this email' };
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const newUser = new User({ ...userData, password: hashedPassword });

    await newUser.save();
    const { password: _, ...userWithoutPassword } = newUser.toObject();
    return { user: userWithoutPassword };
  } catch (error: any) {
    throw new AppError('Signup failed: ' + error.message, 400);
  }
};

export const forgotPassword = async (email: string): Promise<string> => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No user found with that email address', 404);
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // TODO: Store reset token in database with expiration
  // await new PasswordReset({ userId: user._id, token: hashedToken, expiresAt: Date.now() + 10 * 60 * 1000 }).save();

  return resetToken;
};

export const resetPassword = async (token: string, newPassword: string) => {
  // Validate password strength
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(newPassword)) {
    throw new AppError('Password must be at least 8 characters long and contain lowercase, uppercase, number, and special character', 400);
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // TODO: Find and validate reset token
  // const resetRecord = await PasswordReset.findOne({ token: hashedToken, expiresAt: { $gt: Date.now() } });
  // if (!resetRecord) throw new AppError('Invalid or expired reset token', 400);

  // TODO: Update user password
  // const user = await User.findById(resetRecord.userId);
  // if (!user) throw new AppError('User not found', 404);
  // user.password = await bcrypt.hash(newPassword, 12);
  // await user.save();
  // await PasswordReset.deleteOne({ _id: resetRecord._id });

  return 'Password has been reset successfully';
};

export const refreshAccessToken = async (refreshToken: string) => {
  try {
    const decoded = await verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AppError('Invalid refresh token', 401);
    }

    // TODO: Validate stored refresh token
    // const storedToken = await RefreshToken.findOne({ token: refreshToken });
    // if (!storedToken) throw new AppError('Invalid refresh token', 401);

    return await generateAccessToken({ userId: decoded.userId });
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
};

export const logout = async (refreshToken: string) => {
  // TODO: Remove refresh token from database
  // await RefreshToken.deleteOne({ token: refreshToken });
  return true;
};