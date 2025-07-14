import { Request, Response, NextFunction } from 'express';
import { ApiResponse, AuthenticatedRequest, LoginRequest, RegisterRequest } from '../types/api';
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
      const userData = req.body;
      const result = await authService.signup(userData);
      
      if (result.message) {
        const response: ApiResponse = {
          success: true,
          message: result.message,
          data: null
        };
        return res.status(200).json(response);
      }

      const response: ApiResponse = {
        success: true,
        message: 'User registered successfully. Please check your email for verification.',
        data: result.user
      };

      res.status(201).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Registration failed', 400));
    }
  }

  /**
   * Login user
   * @route POST /api/auth/login
   */
  public async login(req: Request<{}, any, LoginRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: result
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Invalid email or password', 401));
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

      const googleUserData = {
        googleId: user.googleId || user.id,
        email: user.email,
        username: user.displayName || user.email?.split('@')[0] || 'user',
        firstName: user.given_name || user.name?.givenName,
        lastName: user.family_name || user.name?.familyName,
        profilePicture: user.picture || user.photos?.[0]?.value
      };

      const result = await authService.googleAuth(googleUserData);

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${result.accessToken}&refresh=${result.refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error: any) {
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
      await authService.forgotPassword(email);

      const response: ApiResponse = {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        data: null
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Failed to process password reset request', 500));
    }
  }

  /**
   * Reset password
   * @route POST /api/auth/reset-password
   */
  public async resetPassword(req: Request<{}, any, ResetPasswordRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);

      const response: ApiResponse = {
        success: true,
        message: 'Password has been reset successfully',
        data: null
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Failed to reset password', 400));
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

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: result
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Invalid refresh token', 401));
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

      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully',
        data: null
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Logout failed', 500));
    }
  }

  /**
   * Get current user profile
   * @route GET /api/auth/profile
   */
  public async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getUserById(req.user.userId);

      if (!user) {
        return next(new AppError('User not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: 'Profile retrieved successfully',
        data: user
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Failed to get profile', 500));
    }
  }

  /**
   * Verify email address
   * @route POST /api/auth/verify-email
   */
  public async verifyEmail(req: Request<{}, any, VerifyEmailRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      await authService.verifyEmailToken(token);

      const response: ApiResponse = {
        success: true,
        message: 'Email verified successfully',
        data: null
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Email verification failed', 400));
    }
  }

  /**
   * Resend email verification
   * @route POST /api/auth/resend-verification
   */
  public async resendVerification(req: Request<{}, any, ResendVerificationRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      await authService.resendEmailVerification(email);

      const response: ApiResponse = {
        success: true,
        message: 'Verification email sent successfully',
        data: null
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Failed to send verification email', 500));
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

      // Validate file type
      if (!req.file.mimetype.startsWith('image/')) {
        return next(new AppError('Only image files are allowed for profile pictures', 400));
      }

      const userId = req.user.id;
      const result = await documentService.uploadProfileImage(userId, req.file);

      // Update user profile with new image URL
      await authService.updateUserProfile(userId, { 
        profileImageUrl: result.profileImageUrl 
      });

      const response: ApiResponse = {
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          profileImageUrl: result.profileImageUrl,
          document: result.document
        }
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();