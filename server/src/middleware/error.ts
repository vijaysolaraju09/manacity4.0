import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import AppError from '../utils/AppError';

const error = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    const { statusCode, code, message, details, fieldErrors } = err;
    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
        ...(fieldErrors && { fieldErrors }),
      },
      traceId: req.traceId,
    });
    return;
  }

  if ((err as { name?: string }).name === 'ZodError') {
    const zodError = err as ZodError;
    const fieldErrors: Record<string, string> = {};
    zodError.errors.forEach((issue) => {
      const field = issue.path.join('.');
      fieldErrors[field] = issue.message;
    });
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        fieldErrors,
      },
      traceId: req.traceId,
    });
    return;
  }

  req.log.error(err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    },
    traceId: req.traceId,
  });
};

export default error;
