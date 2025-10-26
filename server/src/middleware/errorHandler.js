/* eslint-disable no-unused-vars */
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

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
