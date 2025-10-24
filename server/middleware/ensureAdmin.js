const AppError = require('../utils/AppError');

module.exports = (req, _res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(AppError.forbidden('ADMIN_ONLY', 'Admin access required'));
  }
  return next();
};
