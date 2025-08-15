const { ZodError } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) req.body = schema.body.parse(req.body);
    if (schema.params) req.params = schema.params.parse(req.params);
    if (schema.query) req.query = schema.query.parse(req.query);
    return next();
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
    }
    return res.status(400).json({ error: 'Invalid request' });
  }
};

module.exports = validate;
