const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

async function createUserIfNew({ name, phone, password, location }) {
  const existing = await User.findOne({ phone });
  if (existing) {
    return { existing: true };
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    phone,
    password: hashedPassword,
    location,
    address: '',
  });
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw AppError.internal('JWT_SECRET_NOT_SET', 'JWT secret not configured');
  }
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    jwtSecret,
    { expiresIn: '7d' }
  );
  const profile = {
    id: user._id,
    name: user.name,
    phone: user.phone,
    location: user.location,
    address: user.address,
    role: user.role,
    isVerified: user.isVerified,
    verificationStatus: user.verificationStatus,
    profession: user.profession,
    bio: user.bio,
  };
  return { user: profile, token };
}

async function issueResetTokenForPhone(phone) {
  const user = await User.findOne({ phone });
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw AppError.internal('JWT_SECRET_NOT_SET', 'JWT secret not configured');
  }
  const token = jwt.sign(
    { userId: user._id, phone },
    jwtSecret,
    { expiresIn: '10m' }
  );
  return token;
}

module.exports = { createUserIfNew, issueResetTokenForPhone };
