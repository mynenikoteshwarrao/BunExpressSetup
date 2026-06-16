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
    error: error.name || 'UnknownError',
    statusCode,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Error Details:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });
  } else {
    // Log only essential info in production
    console.error('Error:', error.message);
  }

  res.status(statusCode).json(response);
};

export const notFound = (req: Request, res: Response): void => {
  const response: ErrorResponse = {
    success: false,
    message: `Not Found - [${req.method}] ${req.url}`,
    error: 'NotFound',
    statusCode: 404
  };

  res.status(404).json(response);
};

export default errorHandler;