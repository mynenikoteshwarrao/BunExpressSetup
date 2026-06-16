import { Elysia } from 'elysia';
import { AppError } from '../utils/AppError';
import { ErrorResponse } from '../types/api';

/**
 * Global error handler — the Elysia equivalent of the Express `errorHandler` +
 * `notFound`. Registered with `as: 'global'` so it fires for routes mounted from
 * other plugin files (without it, `.onError` is local to this instance only).
 *
 * Contract parity:
 *  - AppError → its statusCode + message.
 *  - VALIDATION (TypeBox) defaults to 422 in Elysia, but the Joi/Express contract
 *    is 400 → forced to 400 with the ErrorResponse shape.
 *  - NOT_FOUND → 404 body matching the Express notFound handler.
 *  - dev stack is included only outside production (matches Express).
 */
export const errorHandlerPlugin = new Elysia({ name: 'koti-error-handler' }).onError(
  { as: 'global' },
  ({ code, error, set, request }) => {
    let statusCode = 500;
    let message = 'Internal server error';
    let errorName = (error as Error)?.name || 'UnknownError';

    if (error instanceof AppError) {
      statusCode = error.statusCode;
      message = error.message;
      errorName = 'AppError';
    } else if (code === 'VALIDATION') {
      statusCode = 400; // override Elysia's default 422 to match the Joi contract
      message = (error as Error).message || 'Validation failed';
      errorName = 'ValidationError';
    } else if (code === 'NOT_FOUND') {
      statusCode = 404;
      message = `Not Found - [${request.method}] ${new URL(request.url).pathname}`;
      errorName = 'NotFound';
    } else if (code === 'PARSE') {
      statusCode = 400;
      message = 'Invalid request body';
      errorName = 'ParseError';
    } else if (error instanceof Error) {
      message = error.message || message;
    }

    set.status = statusCode;

    const response: ErrorResponse = {
      success: false,
      message,
      error: errorName,
      statusCode
    };

    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error:', {
        message,
        code,
        url: request.url,
        method: request.method,
        stack: (error as Error)?.stack
      });
      (response as ErrorResponse & { stack?: string }).stack = (error as Error)?.stack;
    } else {
      console.error('Error:', message);
    }

    return response;
  }
);

export default errorHandlerPlugin;
