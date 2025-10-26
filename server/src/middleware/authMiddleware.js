const jwt = require('jsonwebtoken');
const asyncHandler = require('./asyncHandler');
const { fail } = require('../utils/response');

let User;
try {
  // Lazy load to avoid issues if models are not available during certain builds
  // eslint-disable-next-line global-require
  User = require('../../models/User');
} catch (err) {
  User = null;
}

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json(fail('Authentication required'));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json(fail('Invalid token'));
  }

  if (decoded.userId && User) {
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json(fail('Invalid token user'));
    }

    req.user = user;
    req.user.userId = decoded.userId;
    req.user.role = decoded.role || user.role;
  } else {
    req.user = { ...decoded };
    if (decoded.role && !req.user.role) {
      req.user.role = decoded.role;
    }
  }

  return next();
});

module.exports = authMiddleware;
