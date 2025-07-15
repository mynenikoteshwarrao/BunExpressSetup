import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/tokenUtils';

export const auth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new AppError('Unauthorized: No token provided', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyAccessToken(token);
    
    if (!decoded) {
      return next(new AppError('Unauthorized: Invalid token', 401));
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    next(new AppError('Unauthorized: Invalid token', 401));
  }
};

export default auth;