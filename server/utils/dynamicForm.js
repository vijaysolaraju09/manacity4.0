const AppError = require('../utils/AppError');

const FIELD_TYPES = [
  'short_text',
  'textarea',
  'number',
  'email',
  'phone',
  'dropdown',
  'radio',
  'checkbox',
  'url',
  'file',
  'datetime',
];

const OPTION_FIELD_TYPES = new Set(['dropdown', 'radio', 'checkbox']);
const STRING_FIELD_TYPES = new Set([
  'short_text',
  'textarea',
  'email',
  'phone',
  'url',
  'file',
  'datetime',
]);

const sanitizeHtml = (value) => {
  if (typeof value !== 'string') return '';
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

const sanitizeId = (value) => sanitizeHtml(value).replace(/[^a-zA-Z0-9_-]/g, '');

const normalizePhone = (value) => {
  if (typeof value !== 'string') return '';
  const sanitized = value.replace(/[^0-9+]/g, '');
  if (sanitized.startsWith('+')) {
    return `+${sanitized.slice(1).replace(/[^0-9]/g, '')}`;
  }
  return sanitized.replace(/[^0-9]/g, '');
};

const isValidEmail = (value) =>
  /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value.trim());

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (err) {
    return false;
  }
};

const isValidDateTime = (value) => {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  return new Date(value).toISOString() === new Date(parsed).toISOString();
};

const clampNumber = (value, field, fieldErrors, key) => {
  if (value === undefined || value === null || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    fieldErrors[key] = 'Must be a valid number';
    return null;
  }
  if (typeof field.min === 'number' && num < field.min) {
    fieldErrors[key] = `Must be at least ${field.min}`;
    return null;
  }
  if (typeof field.max === 'number' && num > field.max) {
    fieldErrors[key] = `Must be at most ${field.max}`;
    return null;
  }
  return num;
};

const ensureFieldBasics = (field) => {
  const errors = {};
  const cleanId = sanitizeId(field.id);
  if (!cleanId) errors.id = 'Field id is required';
  const label = sanitizeHtml(field.label);
  if (!label) errors.label = 'Label is required';
  if (!FIELD_TYPES.includes(field.type)) errors.type = 'Unsupported field type';
  const type = field.type;

  const result = {
    id: cleanId,
    label,
    type,
    required: Boolean(field.required),
    placeholder: sanitizeHtml(field.placeholder ?? ''),
    help: sanitizeHtml(field.help ?? ''),
    options: [],
    min: typeof field.min === 'number' ? field.min : undefined,
    max: typeof field.max === 'number' ? field.max : undefined,
    pattern: undefined,
    defaultValue: field.defaultValue === undefined ? undefined : field.defaultValue,
  };

  if (field.pattern) {
    try {
      // eslint-disable-next-line no-new
      new RegExp(field.pattern);
      result.pattern = field.pattern;
    } catch (err) {
      errors.pattern = 'Invalid pattern';
    }
  }

  if (OPTION_FIELD_TYPES.has(type)) {
    const opts = Array.isArray(field.options) ? field.options : [];
    const sanitizedOpts = opts
      .map((opt) => sanitizeHtml(opt))
      .filter((opt) => opt.length > 0);
    if (!sanitizedOpts.length) {
      errors.options = 'Options are required';
    } else {
      result.options = sanitizedOpts;
    }
  }

  if (type === 'number') {
    if (result.min !== undefined && result.max !== undefined && result.min > result.max) {
      errors.max = 'Max must be greater than min';
    }
  }

  return { field: result, errors };
};

const validateFieldDefaults = (field, errors) => {
  const { defaultValue } = field;
  if (defaultValue === undefined || defaultValue === null) return;
  switch (field.type) {
    case 'number': {
      const num = clampNumber(defaultValue, field, errors, 'defaultValue');
      if (num !== null) field.defaultValue = num;
      else delete field.defaultValue;
      break;
    }
    case 'checkbox': {
      if (!Array.isArray(defaultValue)) {
        errors.defaultValue = 'Default value must be an array';
      } else {
        const validValues = defaultValue
          .map((item) => sanitizeHtml(String(item)))
          .filter((item) => field.options.includes(item));
        field.defaultValue = validValues;
      }
      break;
    }
    default: {
      if (STRING_FIELD_TYPES.has(field.type)) {
        const stringVal = sanitizeHtml(String(defaultValue));
        if (field.pattern && stringVal) {
          const reg = new RegExp(field.pattern);
          if (!reg.test(stringVal)) {
            errors.defaultValue = 'Default value does not match pattern';
          }
        }
        field.defaultValue = stringVal;
      }
    }
  }
};

const validateFieldDefinitions = (fields) => {
  if (!Array.isArray(fields)) {
    throw AppError.badRequest('INVALID_FIELDS', 'Fields must be an array');
  }
  const seen = new Set();
  const sanitized = [];
  const fieldErrors = {};

  fields.forEach((rawField, index) => {
    const { field, errors } = ensureFieldBasics(rawField || {});
    if (!field.id) {
      errors.id = errors.id || 'Field id is required';
    } else if (seen.has(field.id)) {
      errors.id = 'Field id must be unique';
    }
    if (field.id) seen.add(field.id);

    validateFieldDefaults(field, errors);

    if (Object.keys(errors).length) {
      fieldErrors[index] = errors;
    }
    sanitized.push(field);
  });

  if (Object.keys(fieldErrors).length) {
    throw AppError.unprocessable('INVALID_FORM_FIELDS', 'Invalid form fields', fieldErrors);
  }

  return sanitized;
};

const validateSubmission = (fields, payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw AppError.badRequest('INVALID_FORM_DATA', 'Form data must be an object');
  }
  const result = {};
  const errors = {};
  const fieldMap = new Map(fields.map((field) => [field.id, field]));

  const unknownFields = Object.keys(payload || {}).filter((key) => !fieldMap.has(key));
  if (unknownFields.length) {
    throw AppError.badRequest('UNKNOWN_FORM_FIELD', 'Unknown form field submitted', {
      fields: unknownFields,
    });
  }

  fields.forEach((field) => {
    const raw = payload[field.id];
    const hasValue = raw !== undefined && raw !== null && raw !== '';
    if (!hasValue) {
      if (field.required) {
        errors[field.id] = 'This field is required';
      }
      return;
    }

    switch (field.type) {
      case 'number': {
        const num = clampNumber(raw, field, errors, field.id);
        if (num !== null) result[field.id] = num;
        break;
      }
      case 'email': {
        const value = sanitizeHtml(String(raw));
        if (!isValidEmail(value)) {
          errors[field.id] = 'Enter a valid email address';
        } else {
          result[field.id] = value;
        }
        break;
      }
      case 'phone': {
        const normalized = normalizePhone(String(raw));
        if (!/^\+?\d{10,14}$/.test(normalized)) {
          errors[field.id] = 'Enter a valid phone number';
        } else {
          result[field.id] = normalized;
        }
        break;
      }
      case 'url':
      case 'file': {
        const value = sanitizeHtml(String(raw));
        if (!isValidUrl(value)) {
          errors[field.id] = 'Enter a valid URL';
        } else {
          result[field.id] = value;
        }
        break;
      }
      case 'dropdown':
      case 'radio': {
        const value = sanitizeHtml(String(raw));
        if (!field.options.includes(value)) {
          errors[field.id] = 'Select a valid option';
        } else {
          result[field.id] = value;
        }
        break;
      }
      case 'checkbox': {
        if (!Array.isArray(raw)) {
          errors[field.id] = 'Select at least one option';
        } else {
          const selected = raw
            .map((item) => sanitizeHtml(String(item)))
            .filter((item) => field.options.includes(item));
          if (!selected.length && field.required) {
            errors[field.id] = 'Select at least one option';
          } else {
            result[field.id] = selected;
          }
        }
        break;
      }
      case 'datetime': {
        const value = sanitizeHtml(String(raw));
        if (!isValidDateTime(value)) {
          errors[field.id] = 'Enter a valid ISO datetime';
        } else {
          result[field.id] = new Date(value).toISOString();
        }
        break;
      }
      default: {
        const value = sanitizeHtml(String(raw));
        if (field.pattern) {
          const reg = new RegExp(field.pattern);
          if (!reg.test(value)) {
            errors[field.id] = 'Invalid format';
            return;
          }
        }
        result[field.id] = value;
      }
    }
  });

  if (Object.keys(errors).length) {
    throw AppError.unprocessable('INVALID_FORM_DATA', 'Invalid form submission', errors);
  }

  return result;
};

const resolveFieldsFromEvent = async (event, FormTemplateModel) => {
  if (!event || !event.dynamicForm) return null;
  const { dynamicForm } = event;
  if (dynamicForm.mode === 'template') {
    if (!dynamicForm.templateId) return null;
    const template = await FormTemplateModel.findById(dynamicForm.templateId).lean();
    if (!template) {
      throw AppError.notFound('TEMPLATE_NOT_FOUND', 'Form template not found');
    }
    return Array.isArray(template.fields) ? template.fields : [];
  }
  if (dynamicForm.mode === 'embedded') {
    return Array.isArray(dynamicForm.fields) ? dynamicForm.fields : [];
  }
  return null;
};

module.exports = {
  FIELD_TYPES,
  OPTION_FIELD_TYPES,
  sanitizeHtml,
  sanitizeId,
  normalizePhone,
  validateFieldDefinitions,
  validateSubmission,
  resolveFieldsFromEvent,
};
