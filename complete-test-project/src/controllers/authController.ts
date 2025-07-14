import { Request, Response, NextFunction } from 'express';
import { ApiResponse, AuthenticatedRequest, LoginRequest, RegisterRequest } from '../types/api';
import { AppError } from '../utils/AppError';

class AuthController {
  /**
   * Register new user
   */
  public async register(req: Request<{}, any, RegisterRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password } = req.body;

      // TODO: Implement user registration logic
      const response: ApiResponse = {
        success: true,
        message: 'User registered successfully',
        data: { username, email }
      };

      res.status(201).json(response);
    } catch (error) {
      next(new AppError('Registration failed', 400));
    }
  }

  /**
   * Login user
   */
  public async login(req: Request<{}, any, LoginRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // TODO: Implement login logic
      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: { token: 'jwt-token-here' }
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError('Login failed', 401));
    }
  }

  /**
   * Get user profile
   */
  public async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;

      const response: ApiResponse = {
        success: true,
        message: 'Profile retrieved successfully',
        data: user
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError('Failed to get profile', 500));
    }
  }
}

export default new AuthController();