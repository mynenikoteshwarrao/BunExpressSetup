import { Request } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: PaginationResult;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface QueryOptions {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  statusCode: number;
  errors?: ValidationErrorDetail[];
}

export type RequestHandler<TRequest = any, TResponse = any> = (
  req: Request<any, TResponse, TRequest>,
  res: any,
  next: any
) => Promise<void> | void;

export type AuthenticatedRequestHandler<TRequest = any, TResponse = any> = (
  req: AuthenticatedRequest & Request<any, TResponse, TRequest>,
  res: any,
  next: any
) => Promise<void> | void;