const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

const validate = (schema) => (req, _res, next) => {
  try {
    if (schema.body) req.body = schema.body.parse(req.body);
    if (schema.params) req.params = schema.params.parse(req.params);
    if (schema.query) req.query = schema.query.parse(req.query);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors = {};
      err.errors.forEach((e) => {
        const field = e.path.join('.');
        fieldErrors[field] = e.message;
      });
      return next(
        AppError.unprocessable('VALIDATION_ERROR', 'Invalid input', fieldErrors)
      );
    }
    next(AppError.badRequest('INVALID_REQUEST', 'Invalid request'));
  }
};

module.exports = validate;
