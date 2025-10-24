const { ZodError } = require('zod');
const AppError = require('../utils/AppError');
const { sanitizeHtml } = require('../utils/dynamicForm');

const deepSanitize = (value) => {
  if (typeof value === 'string') {
    return sanitizeHtml(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepSanitize(item));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, val]) => {
      acc[key] = deepSanitize(val);
      return acc;
    }, Array.isArray(value) ? [] : {});
  }
  return value;
};

const parseWith = (parser, data) => {
  if (!parser) return data;
  const parsed = parser.parse(data);
  return deepSanitize(parsed);
};

const validate = (schema = {}) => (req, _res, next) => {
  try {
    if (schema.body) req.body = parseWith(schema.body, req.body);
    if (schema.params) req.params = parseWith(schema.params, req.params);
    if (schema.query) req.query = parseWith(schema.query, req.query);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors = {};
      err.errors.forEach((e) => {
        const field = e.path.join('.');
        fieldErrors[field] = e.message;
      });
      return next(AppError.unprocessable('VALIDATION_ERROR', 'Invalid input', fieldErrors));
    }
    next(AppError.badRequest('INVALID_REQUEST', 'Invalid request'));
  }
};

module.exports = validate;
