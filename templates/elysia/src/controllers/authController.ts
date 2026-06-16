import { AppError } from '../utils/AppError';
import * as authService from '../services/authService';
import { documentService, UploadedFile } from '../services/documentService';
import { success } from '../utils/respond';
import {
  isGoogleAuthEnabled,
  getGoogleAuthUrl,
  exchangeCodeForProfile
} from '../config/oauth';

/** Convert an Elysia/web File into the framework-neutral UploadedFile DTO. */
const toUploadedFile = async (file: File): Promise<UploadedFile> => ({
  buffer: Buffer.from(await file.arrayBuffer()),
  originalname: file.name,
  mimetype: file.type,
  size: file.size
});

export const authController = {
  async register({ body, set }: any) {
    const { username, email, password, firstName, lastName } = body;
    const result = await authService.signup({ username, email, password, firstName, lastName });
    if (result.message) {
      throw new AppError(result.message, 400);
    }
    set.status = 201;
    return success('User registered successfully', { user: result.user });
  },

  async login({ body }: any) {
    const { email, password } = body;
    const result = await authService.login(email, password);
    return success('Login successful', result);
  },

  async forgotPassword({ body }: any) {
    await authService.forgotPassword(body.email);
    return success('Password reset instructions sent to your email');
  },

  async resetPassword({ body }: any) {
    await authService.resetPassword(body.token, body.newPassword);
    return success('Password reset successful');
  },

  async refreshToken({ body }: any) {
    const result = await authService.refreshAccessToken(body.refreshToken);
    return success('Token refreshed successfully', result);
  },

  async logout({ body }: any) {
    if (body?.refreshToken) {
      await authService.logout(body.refreshToken);
    }
    return success('Logged out successfully');
  },

  async getProfile({ user }: any) {
    const found = await authService.getUserById(user.id);
    if (!found) {
      throw new AppError('User not found', 404);
    }
    return success('Profile retrieved successfully', { user: found });
  },

  async verifyEmail({ body }: any) {
    await authService.verifyEmailToken(body.token);
    return success('Email verified successfully');
  },

  async resendVerification({ body }: any) {
    await authService.resendEmailVerification(body.email);
    return success('Verification email sent');
  },

  // Google OAuth — redirect to Google's consent screen.
  googleAuth({ redirect, set }: any) {
    if (!isGoogleAuthEnabled()) {
      throw new AppError('Google authentication is not enabled', 404);
    }
    return redirect(getGoogleAuthUrl());
  },

  // Google OAuth callback — exchange code, issue our JWTs, redirect to frontend.
  async googleCallback({ query, redirect }: any) {
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5000';
    try {
      if (!isGoogleAuthEnabled()) {
        throw new AppError('Google authentication is not enabled', 404);
      }
      const code = query?.code;
      if (!code) {
        return redirect(`${frontend}/login?error=auth_failed`);
      }
      const profile = await exchangeCodeForProfile(code);
      const result = await authService.googleAuth({
        googleId: profile.id,
        email: profile.email || '',
        username: profile.displayName || `user_${profile.id}`,
        firstName: profile.firstName,
        lastName: profile.lastName,
        profilePicture: profile.picture
      });
      return redirect(
        `${frontend}/auth/callback?token=${result.accessToken}&refresh=${result.refreshToken}`
      );
    } catch {
      return redirect(`${frontend}/login?error=auth_failed`);
    }
  },

  async uploadProfileImage({ user, body }: any) {
    const file = body?.profileImage as File | undefined;
    if (!file) {
      throw new AppError('No file provided', 400);
    }
    if (!file.type.startsWith('image/')) {
      throw new AppError('Only image files are allowed for profile pictures', 400);
    }
    const uploaded = await toUploadedFile(file);
    const result = await documentService.uploadProfileImage(user.id, uploaded);
    await authService.updateUserProfile(user.id, { profileImageUrl: result.profileImageUrl } as any);
    return success('Profile image uploaded successfully', result);
  }
};

export default authController;
