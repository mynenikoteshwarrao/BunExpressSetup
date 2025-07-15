import { Request, Response, NextFunction } from 'express';
import { ApiResponse, AuthenticatedRequest, LoginRequest, RegisterRequest } from '../types/api';
import { AppError } from '../utils/AppError';
import * as authService from '../services/authService';

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
        message: 'User registered successfully',
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
   * Forgot password
   * @route POST /api/auth/forgot-password
   */
  public async forgotPassword(req: Request<{}, any, ForgotPasswordRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const resetToken = await authService.forgotPassword(email);

      const response: ApiResponse = {
        success: true,
        message: 'Password reset instructions sent to your email',
        data: { resetToken: resetToken }
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Failed to process forgot password request', 500));
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
      next(new AppError(error.message || 'Password reset failed', 400));
    }
  }

  /**
   * Refresh access token
   * @route POST /api/auth/refresh-token
   */
  public async refreshToken(req: Request<{}, any, RefreshTokenRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const newAccessToken = await authService.refreshAccessToken(refreshToken);

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: { accessToken: newAccessToken }
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Token refresh failed', 401));
    }
  }

  /**
   * Logout user
   * @route POST /api/auth/logout
   */
  public async logout(req: Request<{}, any, RefreshTokenRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);

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
   * Get user profile
   * @route GET /api/auth/profile
   */
  public async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      
      if (!user) {
        return next(new AppError('User not authenticated', 401));
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
}

export default new AuthController();