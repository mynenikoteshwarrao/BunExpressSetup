import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/**
 * Logger middleware
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const logger = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // TODO: Implement middleware logic here
    console.log(`Logger middleware executed for ${req.method} ${req.path}`);
    
    // Example: Check some condition
    const isValid = true; // Replace with actual validation logic
    
    if (!isValid) {
      return next(new AppError('Logger validation failed', 400));
    }
    
    next();
  } catch (error) {
    next(new AppError(`Logger middleware error`, 500));
  }
};

export default logger;
