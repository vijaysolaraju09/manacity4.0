/* eslint-disable no-unused-vars */
const { fail } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  const errors = err.errors;

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${message}`, err.stack || err);
  }

  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  const payload = {
    ...fail(message),
    ...response,
  };

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
