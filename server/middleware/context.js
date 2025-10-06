const { randomUUID } = require('crypto');

const logger = require('../utils/logger');

module.exports = (req, res, next) => {
  const traceId = randomUUID();
  const start = process.hrtime.bigint();
  req.traceId = traceId;
  req.log = logger.child({ traceId });

  req.log.info(
    { method: req.method, url: req.originalUrl },
    'request start'
  );

  const logCompletion = () => {
    if (res.locals.__requestLogDone) return;
    res.locals.__requestLogDone = true;
    const duration = Number(process.hrtime.bigint() - start) / 1e6;
    req.log.info(
      {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: Number(duration.toFixed(3)),
      },
      'request completed'
    );
  };

  res.on('finish', logCompletion);
  res.on('close', logCompletion);

  next();
};
