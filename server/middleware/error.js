const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

module.exports = (err, req, res, _next) => {
  if (err instanceof AppError) {
    const { statusCode, code, message, details, fieldErrors } = err;
    res.status(statusCode).json({
      ok: false,
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

  if (err instanceof ZodError) {
    const fieldErrors = {};
    err.errors.forEach((issue) => {
      const field = issue.path.join('.');
      fieldErrors[field] = issue.message;
    });
    res.status(422).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        fieldErrors,
      },
      traceId: req.traceId,
    });
    return;
  }

  req.log?.error(err);
  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    },
    traceId: req.traceId,
  });
};
