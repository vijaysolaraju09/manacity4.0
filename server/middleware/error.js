module.exports = (err, req, res, _next) => {
  console.error('ERR', req.method, req.originalUrl, '-', err?.message, '\n', err?.stack);

  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  const error = {
    code,
    message: err.message || 'Error',
    stack: err.stack,
  };

  if (err.details) {
    error.details = err.details;
  }
  if (err.fieldErrors) {
    error.fieldErrors = err.fieldErrors;
  }

  return res.status(status).json({
    ok: false,
    error,
    traceId: req.traceId,
  });
};
