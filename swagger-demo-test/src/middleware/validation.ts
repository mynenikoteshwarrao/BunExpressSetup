import Joi from 'joi';
import { AppError } from '../utils/AppError';

export const validateRequest = <T = any>(schema: Joi.ObjectSchema, data: any): T => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    throw new AppError(
      `Validation failed: ${validationErrors.map(e => e.message).join(', ')}`,
      400
    );
  }

  return value;
};

export const validationMiddleware = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: any, res: any, next: any) => {
    try {
      req[property] = validateRequest(schema, req[property]);
      next();
    } catch (error) {
      next(error);
    }
  };
};