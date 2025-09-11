module.exports = (err, req, res, _next) => {
  console.error('ERR', req.method, req.originalUrl, '-', err?.message, '\n', err?.stack);

  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const isProd = process.env.NODE_ENV === 'production';

  return res.status(status).json({
    ok: false,
    error: { code, message: isProd ? 'Something went wrong' : (err.message || 'Error') },
    traceId: req.traceId,
  });
};
