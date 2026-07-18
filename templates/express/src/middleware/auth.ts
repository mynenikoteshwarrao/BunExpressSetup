import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express-api';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/tokenUtils';

export const auth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return next(new AppError('Unauthorized: No token provided', 401));
    }

    const token = authHeader.split(' ')[1];
    // verifyAccessToken is async — must be awaited, otherwise `decoded` is a
    // (truthy) Promise and invalid tokens silently pass authentication.
    const decoded = await verifyAccessToken(token);

    if (!decoded) {
      return next(new AppError('Unauthorized: Invalid token', 401));
    }

    // Token payload carries `userId`; controllers/RBAC read `user.id` — map it.
    req.user = {
      id: decoded.userId,
      email: decoded.email ?? '',
      username: decoded.username ?? ''
    };
    next();
  } catch (error: any) {
    next(new AppError('Unauthorized: Invalid token', 401));
  }
};

export default auth;