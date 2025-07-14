import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ErrorResponse } from '../types/api';

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }

  const response: ErrorResponse = {
    success: false,
    message,
    error: error.name,
    statusCode
  };

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error);
  }

  res.status(statusCode).json(response);
};

export default errorHandler;