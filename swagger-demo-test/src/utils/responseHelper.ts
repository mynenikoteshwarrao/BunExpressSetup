import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types/api';

export const sendSuccess = <T = any>(
  res: Response<ApiResponse<T>>,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const sendError = (
  res: Response<ApiResponse>,
  message: string = 'Internal Server Error',
  statusCode: number = 500,
  error?: string
): void => {
  res.status(statusCode).json({
    success: false,
    message,
    error
  });
};

export const sendPaginatedResponse = <T = any>(
  res: Response<PaginatedResponse<T>>,
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
  res.status(statusCode).json({
    success: true,
    data,
    pagination
  });
};