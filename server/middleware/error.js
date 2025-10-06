const { randomUUID } = require('crypto');

const logger = require('../utils/logger');

module.exports = (err, req, res, _next) => {
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  const traceId = req.traceId || randomUUID();
  if (!req.traceId) {
    req.traceId = traceId;
  }

  const requestLogger = (req.log || logger.child({ traceId })).child({
    status,
    method: req.method,
    url: req.originalUrl,
  });

  requestLogger.error({ err, traceId }, err.message || 'Unhandled error');

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
    traceId,
  });
};
