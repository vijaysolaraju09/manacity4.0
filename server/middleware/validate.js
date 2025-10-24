const { ZodError, ZodFirstPartyTypeKind } = require('zod');
const AppError = require('../utils/AppError');
const { sanitizeHtml, normalizePhone } = require('../utils/dynamicForm');

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE_REGEX = /^\+?\d{10,14}$/;

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (err) {
    return false;
  }
};

const sanitizeStringValue = (value, path) => {
  if (typeof value !== 'string') return value;
  const sanitized = sanitizeHtml(value);
  const key = path[path.length - 1] || '';

  if (!sanitized) return sanitized;

  if (/phone|mobile|contact/i.test(key)) {
    const normalized = normalizePhone(sanitized.replace(/[\s-]+/g, ''));
    if (normalized && !PHONE_REGEX.test(normalized)) {
      throw AppError.badRequest('INVALID_PHONE', 'Invalid phone number format', {
        field: key,
      });
    }
    return normalized;
  }

  if (/email/i.test(key)) {
    if (!EMAIL_REGEX.test(sanitized)) {
      throw AppError.badRequest('INVALID_EMAIL', 'Invalid email address', {
        field: key,
      });
    }
    return sanitized.toLowerCase();
  }

  if (/url|link/i.test(key)) {
    if (!isValidUrl(sanitized)) {
      throw AppError.badRequest('INVALID_URL', 'Invalid URL provided', { field: key });
    }
    return sanitized;
  }

  if (/pattern|regex/i.test(key)) {
    try {
      // eslint-disable-next-line no-new
      new RegExp(sanitized);
    } catch (err) {
      throw AppError.badRequest('INVALID_PATTERN', 'Invalid regular expression', {
        field: key,
      });
    }
    return sanitized;
  }

  return sanitized;
};

const preprocessInput = (value, path = []) => {
  if (typeof value === 'string') {
    const key = path[path.length - 1] || '';
    if (/phone|mobile|contact/i.test(key)) {
      return value.replace(/[\s-]+/g, '');
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => preprocessInput(item, path));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, val]) => {
      acc[key] = preprocessInput(val, [...path, key]);
      return acc;
    }, Array.isArray(value) ? [] : {});
  }
  return value;
};

const getShape = (schema) => {
  if (!schema) return undefined;
  if (typeof schema.shape === 'function') return schema.shape();
  return schema.shape;
};

const deepSanitize = (schema, value, path = []) => {
  if (value === undefined || value === null) return value;

  if (schema?._def?.typeName === ZodFirstPartyTypeKind.ZodOptional) {
    return deepSanitize(schema._def.innerType, value, path);
  }

  if (schema?._def?.typeName === ZodFirstPartyTypeKind.ZodNullable) {
    if (value === null) return value;
    return deepSanitize(schema._def.innerType, value, path);
  }

  if (schema?._def?.typeName === ZodFirstPartyTypeKind.ZodDefault) {
    return deepSanitize(schema._def.innerType, value, path);
  }

  if (schema?._def?.typeName === ZodFirstPartyTypeKind.ZodEffects) {
    return deepSanitize(schema._def.schema, value, path);
  }

  if (schema?._def?.typeName === ZodFirstPartyTypeKind.ZodArray) {
    const itemSchema = schema._def.type;
    return value.map((item) => deepSanitize(itemSchema, item, path));
  }

  if (schema?._def?.typeName === ZodFirstPartyTypeKind.ZodObject && value && typeof value === 'object') {
    const shape = getShape(schema);
    if (!shape) {
      return value;
    }
    return Object.entries(value).reduce((acc, [key, val]) => {
      if (Object.prototype.hasOwnProperty.call(shape, key)) {
        acc[key] = deepSanitize(shape[key], val, [...path, key]);
      }
      return acc;
    }, {});
  }

  if (typeof value === 'string') {
    return sanitizeStringValue(value, path);
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepSanitize(undefined, item, path));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, val]) => {
      acc[key] = deepSanitize(undefined, val, [...path, key]);
      return acc;
    }, {});
  }

  return value;
};

const stripUnknown = (schema, data) => {
  if (!schema || !data) return data;
  if (schema?._def?.typeName === ZodFirstPartyTypeKind.ZodObject && typeof data === 'object') {
    const shape = getShape(schema);
    if (!shape) {
      return data;
    }
    return Object.keys(data).reduce((acc, key) => {
      if (Object.prototype.hasOwnProperty.call(shape, key)) {
        acc[key] = stripUnknown(shape[key], data[key]);
      }
      return acc;
    }, {});
  }
  if (schema?._def?.typeName === ZodFirstPartyTypeKind.ZodArray && Array.isArray(data)) {
    return data.map((item) => stripUnknown(schema._def.type, item));
  }
  if (schema?._def?.typeName === ZodFirstPartyTypeKind.ZodOptional) {
    if (data === undefined) return data;
    return stripUnknown(schema._def.innerType, data);
  }
  if (schema?._def?.typeName === ZodFirstPartyTypeKind.ZodNullable) {
    if (data === null) return data;
    return stripUnknown(schema._def.innerType, data);
  }
  if (schema?._def?.typeName === ZodFirstPartyTypeKind.ZodDefault) {
    return stripUnknown(schema._def.innerType, data);
  }
  if (schema?._def?.typeName === ZodFirstPartyTypeKind.ZodEffects) {
    return stripUnknown(schema._def.schema, data);
  }
  return data;
};

const parseWith = (parser, data) => {
  if (!parser) return data;
  const preprocessed = preprocessInput(data);
  const parsed = parser.parse(preprocessed);
  const stripped = stripUnknown(parser, parsed);
  return deepSanitize(parser, stripped);
};

const validate = (schema = {}) => (req, _res, next) => {
  try {
    if (schema.body) req.body = parseWith(schema.body, req.body);
    if (schema.params) req.params = parseWith(schema.params, req.params);
    if (schema.query) req.query = parseWith(schema.query, req.query);
    next();
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
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
