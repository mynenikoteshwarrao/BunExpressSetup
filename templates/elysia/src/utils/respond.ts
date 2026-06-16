import { ApiResponse, PaginatedResponse, PaginationResult } from '../types/api';

/**
 * Tiny response-body builders for Elysia handlers. Elysia controllers return
 * plain objects (status is set via `set.status` in the handler), so these just
 * shape the body to match the Express ApiResponse/PaginatedResponse contract.
 */
export const success = <T>(message: string, data?: T): ApiResponse<T> => ({
  success: true,
  message,
  data
});

export const paginated = <T>(
  message: string,
  data: T[],
  pagination: PaginationResult
): PaginatedResponse<T> => ({
  success: true,
  message,
  data,
  pagination
});
