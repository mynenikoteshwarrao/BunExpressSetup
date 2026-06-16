import { Request } from 'express';
import { AuthUser } from './api';

/**
 * Express-specific request typings. Framework-neutral DTOs live in ./api
 * (shared between the Express and Elysia templates). Keep anything that
 * imports from 'express' in this file only.
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
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
