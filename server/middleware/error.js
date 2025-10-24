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
  };

  let details;
  if (err.details !== undefined) {
    details = err.details;
  }
  if (err.fieldErrors) {
    if (details && typeof details === 'object' && !Array.isArray(details)) {
      details.fieldErrors = err.fieldErrors;
    } else if (details !== undefined) {
      details = { value: details, fieldErrors: err.fieldErrors };
    } else {
      details = { fieldErrors: err.fieldErrors };
    }
  }

  if (details !== undefined) {
    error.details = details;
  }

  return res.status(status).json({
    ok: false,
    error,
    traceId,
  });
};
