const pino = require('pino');

const env = process.env.NODE_ENV || 'development';

const logger = pino({
  level: process.env.LOG_LEVEL || (env === 'development' ? 'debug' : 'info'),
  base: undefined,
  redact: {
    paths: ['req.headers.authorization', 'headers.authorization'],
    censor: '[REDACTED]',
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
