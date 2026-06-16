import { Response } from 'express';
import { ApiResponse, PaginatedResponse, ErrorResponse } from '../types/api';

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  error?: string
): void => {
  const response: ErrorResponse = {
    success: false,
    message,
    error: error || 'InternalServerError',
    statusCode
  };
  res.status(statusCode).json(response);
};

export const sendPaginatedResponse = <T>(
  res: Response,
  message: string,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  },
  statusCode: number = 200
): void => {
  const response: PaginatedResponse<T> = {
    success: true,
    message,
    data,
    pagination
  };
  res.status(statusCode).json(response);
};

export const sendValidationError = (
  res: Response,
  errors: string[],
  statusCode: number = 400
): void => {
  const response: ErrorResponse = {
    success: false,
    message: 'Validation failed',
    error: 'ValidationError',
    statusCode
  };
  res.status(statusCode).json(response);
};