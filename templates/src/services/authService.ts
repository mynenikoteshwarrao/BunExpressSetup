import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Types } from 'mongoose';
import User, { IUser } from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokenUtils';
import { AppError } from '../utils/AppError';
import { sendEmail, emailTemplates } from '../config/email';

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
  user: IUser;
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

export const login = async (email: string, password: string): Promise<IAuthResult> => {
  const user = await User.findByEmailWithPassword(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact support.', 401);
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  const userId = (user._id as Types.ObjectId).toString();
  const accessToken = await generateAccessToken({ userId });
  const refreshToken = await generateRefreshToken({ userId });

  // Store refresh token
  user.refreshTokens.push(refreshToken);
  user.lastLogin = new Date();
  await user.save();

  const { password: _, refreshTokens: __, ...userWithoutSensitiveData } = user.toObject();
  
  return { 
    user: userWithoutSensitiveData as IUser, 
    accessToken, 
    refreshToken 
  };
};

export const signup = async (userData: IUserSignup): Promise<{ user?: IUser; message?: string }> => {
  try {
    const existingUser = await User.findOne({ 
      $or: [
        { email: userData.email },
        { username: userData.username }
      ]
    });

    if (existingUser) {
      if (existingUser.email === userData.email) {
        return { message: 'User already exists with this email' };
      }
      return { message: 'Username is already taken' };
    }

    const newUser = new User({
      ...userData,
      authProvider: 'local',
      isEmailVerified: false
    });

    await newUser.save();

    // Send welcome email
    try {
      const welcomeTemplate = emailTemplates.welcomeEmail(userData.username);
      await sendEmail({
        to: userData.email,
        subject: welcomeTemplate.subject,
        html: welcomeTemplate.html,
        text: welcomeTemplate.text
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't throw error for email failure
    }

    const { password: _, refreshTokens: __, ...userWithoutSensitiveData } = newUser.toObject();
    return { user: userWithoutSensitiveData as IUser };
  } catch (error: any) {
    throw new AppError('Signup failed: ' + error.message, 400);
  }
};

export const googleAuth = async (googleUserData: IGoogleUserData): Promise<IAuthResult> => {
  let user = await User.findOne({ googleId: googleUserData.googleId });

  if (!user) {
    // Check if user exists with same email
    user = await User.findOne({ email: googleUserData.email });
    
    if (user) {
      // Link Google account to existing user
      user.googleId = googleUserData.googleId;
      user.authProvider = 'google';
      user.isEmailVerified = true;
      if (googleUserData.profilePicture && !user.profilePicture) {
        user.profilePicture = googleUserData.profilePicture;
      }
      await user.save();
    } else {
      // Create new user
      user = new User({
        googleId: googleUserData.googleId,
        username: googleUserData.username,
        email: googleUserData.email,
        firstName: googleUserData.firstName,
        lastName: googleUserData.lastName,
        profilePicture: googleUserData.profilePicture,
        authProvider: 'google',
        isEmailVerified: true,
        isActive: true
      });
      await user.save();
    }
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact support.', 401);
  }

  const userId = (user._id as Types.ObjectId).toString();
  const accessToken = await generateAccessToken({ userId });
  const refreshToken = await generateRefreshToken({ userId });

  // Store refresh token
  user.refreshTokens.push(refreshToken);
  user.lastLogin = new Date();
  await user.save();

  const { password: _, refreshTokens: __, ...userWithoutSensitiveData } = user.toObject();
  
  return { 
    user: userWithoutSensitiveData as IUser, 
    accessToken, 
    refreshToken 
  };
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new AppError('Token is invalid or has expired', 400);
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // Clear all refresh tokens

  await user.save();

  // Send password reset confirmation email
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
  const user = await User.findOne({ email });
  
  if (!user) {
    // Don't reveal if email exists
    return;
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

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
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    
    throw new AppError('There was an error sending the email. Try again later.', 500);
  }
};

export const refreshAccessToken = async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
  const decoded = await verifyRefreshToken(refreshToken);
  
  if (!decoded || !decoded.userId) {
    throw new AppError('Invalid refresh token', 401);
  }

  const user = await User.findById(decoded.userId).select('+refreshTokens');
  
  if (!user || !user.refreshTokens.includes(refreshToken)) {
    throw new AppError('Invalid refresh token', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401);
  }

  // Remove old refresh token and generate new tokens
  user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
  
  const newAccessToken = await generateAccessToken({ userId: decoded.userId });
  const newRefreshToken = await generateRefreshToken({ userId: decoded.userId });
  
  user.refreshTokens.push(newRefreshToken);
  await user.save();

  return { 
    accessToken: newAccessToken, 
    refreshToken: newRefreshToken 
  };
};

export const logout = async (refreshToken: string): Promise<void> => {
  const decoded = await verifyRefreshToken(refreshToken);
  
  if (decoded && decoded.userId) {
    const user = await User.findById(decoded.userId).select('+refreshTokens');
    
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
      await user.save();
    }
  }
};

export const getUserById = async (userId: string): Promise<IUser | null> => {
  const user = await User.findById(userId);
  return user;
};

export const verifyEmailToken = async (token: string): Promise<void> => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const user = await User.findOne({
    emailVerificationToken: hashedToken
  }).select('+emailVerificationToken');

  if (!user) {
    throw new AppError('Token is invalid', 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();
};

export const resendEmailVerification = async (email: string): Promise<void> => {
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isEmailVerified) {
    throw new AppError('Email is already verified', 400);
  }

  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

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
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });
    
    throw new AppError('Failed to send verification email', 500);
  }
};

// Update user profile
export const updateUserProfile = async (userId: string, updates: Partial<IUser>): Promise<IUser | null> => {
  return await User.findByIdAndUpdate(userId, updates, { new: true }).lean();
};