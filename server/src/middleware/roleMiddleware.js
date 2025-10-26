const { fail } = require('../utils/response');

const roleMiddleware = (requiredRole) => (req, res, next) => {
  if (!req.user || (requiredRole && req.user.role !== requiredRole)) {
    return res.status(403).json(fail('Forbidden'));
  }

  return next();
};

module.exports = roleMiddleware;
