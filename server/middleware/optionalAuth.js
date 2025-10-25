const jwt = require('jsonwebtoken');
const User = require('../models/User');

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || typeof header !== 'string') {
      return next();
    }
    const [scheme, token] = header.split(' ');
    if (scheme && scheme.toLowerCase() !== 'bearer') {
      return next();
    }
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded?.userId) {
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return next();
      }
      req.user = user;
      req.user.userId = decoded.userId;
      req.user.role = decoded.role;
    } else if (decoded?.role) {
      req.user = { role: decoded.role };
    }
  } catch (err) {
    // Ignore authentication errors for optional auth
  }
  return next();
};

module.exports = optionalAuth;
