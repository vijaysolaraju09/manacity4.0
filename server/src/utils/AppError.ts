export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, unknown>;
  public fieldErrors?: Record<string, string>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options?: {
      details?: Record<string, unknown>;
      fieldErrors?: Record<string, string>;
    }
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.message = message;
    if (options?.details) {
      this.details = options.details;
    }
    if (options?.fieldErrors) {
      this.fieldErrors = options.fieldErrors;
    }
    // Maintains proper stack trace
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(
    code = 'BAD_REQUEST',
    message = 'Bad request',
    details?: Record<string, unknown>
  ): AppError {
    return new AppError(400, code, message, { details });
  }

  static unauthorized(
    code = 'UNAUTHORIZED',
    message = 'Unauthorized',
    details?: Record<string, unknown>
  ): AppError {
    return new AppError(401, code, message, { details });
  }

  static forbidden(
    code = 'FORBIDDEN',
    message = 'Forbidden',
    details?: Record<string, unknown>
  ): AppError {
    return new AppError(403, code, message, { details });
  }

  static notFound(
    code = 'NOT_FOUND',
    message = 'Not found',
    details?: Record<string, unknown>
  ): AppError {
    return new AppError(404, code, message, { details });
  }

  static conflict(
    code = 'CONFLICT',
    message = 'Conflict',
    details?: Record<string, unknown>
  ): AppError {
    return new AppError(409, code, message, { details });
  }

  static unprocessable(
    code = 'VALIDATION_ERROR',
    message = 'Invalid input',
    fieldErrors?: Record<string, string>
  ): AppError {
    return new AppError(422, code, message, { fieldErrors });
  }

  static internal(
    code = 'INTERNAL_ERROR',
    message = 'Something went wrong'
  ): AppError {
    return new AppError(500, code, message);
  }
}

export default AppError;
