import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import AppError from '../utils/AppError';

type Source = 'body' | 'query' | 'params';

const validate = (schema: ZodSchema, source: Source = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((issue) => {
          const field = issue.path.join('.');
          fieldErrors[field] = issue.message;
        });
        throw AppError.unprocessable('VALIDATION_ERROR', 'Invalid input', fieldErrors);
      }
      next(error);
    }
  };
};

export default validate;
