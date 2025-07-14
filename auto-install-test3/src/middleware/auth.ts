import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types/api';
import { AppError } from '../utils/AppError';

export const auth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return next(new AppError('Access denied. No token provided.', 401));
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(new AppError('JWT secret not configured', 500));
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    next(new AppError('Invalid token', 401));
  }
};

export default auth;