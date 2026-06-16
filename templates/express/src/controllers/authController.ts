import { Request, Response, NextFunction } from 'express';
import { ApiResponse, LoginRequest, RegisterRequest } from '../types/api';
import { AuthenticatedRequest } from '../types/express-api';
import { AppError } from '../utils/AppError';
import * as authService from '../services/authService';
import { documentService } from '../services/documentService';
import passport from '../config/passport';

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface VerifyEmailRequest {
  token: string;
}

interface ResendVerificationRequest {
  email: string;
}

class AuthController {
  /**
   * Register new user
   * @route POST /api/auth/register
   */
  public async register(req: Request<{}, any, RegisterRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password, firstName, lastName } = req.body;

      if (!username || !email || !password) {
        return next(new AppError('Username, email, and password are required', 400));
      }

      const result = await authService.signup({ username, email, password, firstName, lastName });

      if (result.message) {
        return next(new AppError(result.message, 400));
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user: result.user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   * @route POST /api/auth/login
   */
  public async login(req: Request<{}, any, LoginRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new AppError('Email and password are required', 400));
      }

      const result = await authService.login(email, password);

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Google OAuth login
   * @route GET /api/auth/google
   */
  public googleAuth = passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  });

  /**
   * Google OAuth callback
   * @route GET /api/auth/google/callback
   */
  public async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as any;
      
      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
      }

      const result = await authService.googleAuth({
        googleId: user.googleId,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture
      });

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${result.accessToken}&refresh=${result.refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  }

  /**
   * Forgot password
   * @route POST /api/auth/forgot-password
   */
  public async forgotPassword(req: Request<{}, any, ForgotPasswordRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        return next(new AppError('Email is required', 400));
      }

      await authService.forgotPassword(email);

      res.json({
        success: true,
        message: 'Password reset instructions sent to your email'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   * @route POST /api/auth/reset-password
   */
  public async resetPassword(req: Request<{}, any, ResetPasswordRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return next(new AppError('Token and new password are required', 400));
      }

      await authService.resetPassword(token, newPassword);

      res.json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * @route POST /api/auth/refresh
   */
  public async refreshToken(req: Request<{}, any, RefreshTokenRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return next(new AppError('Refresh token is required', 400));
      }

      const result = await authService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   * @route POST /api/auth/logout
   */
  public async logout(req: Request<{}, any, RefreshTokenRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * @route GET /api/auth/profile
   */
  public async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getUserById(req.user.id);

      if (!user) {
        return next(new AppError('User not found', 404));
      }

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email address
   * @route POST /api/auth/verify-email
   */
  public async verifyEmail(req: Request<{}, any, VerifyEmailRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        return next(new AppError('Token is required', 400));
      }

      await authService.verifyEmailToken(token);

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend email verification
   * @route POST /api/auth/resend-verification
   */
  public async resendVerification(req: Request<{}, any, ResendVerificationRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        return next(new AppError('Email is required', 400));
      }

      await authService.resendEmailVerification(email);

      res.json({
        success: true,
        message: 'Verification email sent'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload profile image
   * @route POST /api/auth/profile-image
   */
  public async uploadProfileImage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        return next(new AppError('No file provided', 400));
      }

      const userId = req.user.id;
      const result = await documentService.uploadProfileImage(userId, req.file);

      // Update user profile with new image URL
      await authService.updateUserProfile(userId, { 
        profileImageUrl: result.profileImageUrl 
      });

      res.json({
        success: true,
        message: 'Profile image uploaded successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();