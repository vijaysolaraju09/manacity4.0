const AppError = require('../../utils/AppError');

const toRoleSet = (roles) => {
  if (!roles) return new Set();
  if (Array.isArray(roles)) return new Set(roles);
  return new Set([roles]);
};

const roleMiddleware = (requiredRoles) => (req, _res, next) => {
  const allowedRoles = toRoleSet(requiredRoles);
  if (!req.user) {
    return next(AppError.unauthorized('AUTH_REQUIRED', 'Authentication required'));
  }
  if (allowedRoles.size > 0 && !allowedRoles.has(req.user.role)) {
    return next(AppError.forbidden('FORBIDDEN', 'Insufficient permissions'));
  }
  return next();
};

module.exports = roleMiddleware;
