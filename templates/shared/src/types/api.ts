// Framework-neutral API DTOs. Must contain ZERO framework imports so both the
// Express and Elysia templates can reuse this file via templates/shared.
// Express-specific request types live in templates/express/src/types/express-api.ts.

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

/**
 * The authenticated-user shape attached to a request by the auth layer.
 * Framework-neutral so controllers/services can reference it without importing
 * a framework request type.
 */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
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