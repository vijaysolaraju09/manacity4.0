const { randomUUID } = require('crypto');
const pino = require('pino');

const logger = pino();

module.exports = (req, res, next) => {
  const traceId = randomUUID();
  req.traceId = traceId;
  req.log = logger.child({ traceId });

  req.log.info({ method: req.method, path: req.path }, 'request start');

  res.on('finish', () => {
    req.log.info({ status: res.statusCode }, 'request end');
  });

  next();
};
