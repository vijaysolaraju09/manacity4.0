const { randomUUID } = require('crypto');

const logger = require('../utils/logger');

module.exports = (err, req, res, _next) => {
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  const traceId = req.traceId || randomUUID();
  if (!req.traceId) {
    req.traceId = traceId;
  }

  const loggerContext = {
    status,
    method: req.method,
    url: req.originalUrl,
  };

  if (req.user?.id) {
    loggerContext.userId = req.user.id;
  } else if (req.user?._id) {
    loggerContext.userId = req.user._id.toString();
  }

  const requestLogger = (req.log || logger.child({ traceId })).child(loggerContext);

  const errorPayload = {
    traceId,
    error: {
      message: err.message || 'Unhandled error',
    },
  };

  if ((process.env.NODE_ENV || 'development') === 'development' && err.stack) {
    errorPayload.error.stack = err.stack;
  }

  requestLogger.error(errorPayload, err.message || 'Unhandled error');

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
