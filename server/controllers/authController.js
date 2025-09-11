const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");

exports.signup = async (req, res, next) => {
  try {
    const { name, phone, password, location, role } = req.body;

    if (!phone) {
      throw AppError.badRequest('MISSING_CONTACT', 'Phone is required');
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      throw AppError.conflict('USER_EXISTS', 'Phone already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      phone,
      password: hashedPassword,
      location,
      role,
      address: "",
      isVerified: true,
    });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw AppError.internal('JWT_SECRET_NOT_SET', 'JWT secret not configured');
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      jwtSecret,
      { expiresIn: "7d" }
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
      avatar: user.avatarUrl,
      avatarUrl: user.avatarUrl,
    };

    res.status(201).json({
      ok: true,
      data: { user: profile, token },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // 1) Pull password (likely select:false in schema)
    const user = await User.findOne({ phone }).select('+password');
    if (!user) return next(AppError.notFound('USER_NOT_FOUND', 'User not found'));

    // 2) Guard accounts without password (e.g., OTP-only accounts)
    if (!user.password) {
      return next(AppError.badRequest('PASSWORD_LOGIN_NOT_AVAILABLE', 'This account uses OTP login'));
    }

    // 3) Compare
    const ok = await bcrypt.compare(String(password || ''), user.password);
    if (!ok) return next(AppError.badRequest('INVALID_PASSWORD', 'Incorrect password'));

    // 4) Sign
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return next(AppError.internal('JWT_SECRET_NOT_SET', 'JWT secret not configured'));

    const token = jwt.sign({ userId: user._id, role: user.role }, jwtSecret, { expiresIn: '7d' });

    // 5) Profile payload (unchanged)
    const profile = {
      id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      location: user.location,
      address: user.address,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      profession: user.profession,
      bio: user.bio,
      avatar: user.avatarUrl,
      avatarUrl: user.avatarUrl,
    };

    return res.status(200).json({ ok: true, data: { token, user: profile }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};

exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw AppError.internal('JWT_SECRET_NOT_SET', 'JWT secret not configured');
      }
      const token = jwt.sign({ role: "admin" }, jwtSecret, {
        expiresIn: "7d",
      });
      return res.json({ ok: true, data: { token }, traceId: req.traceId });
    }
    throw AppError.unauthorized('INVALID_CREDENTIALS', 'Invalid credentials');
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw AppError.unauthorized('UNAUTHORIZED', 'Unauthorized');
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
      avatar: user.avatarUrl,
      avatarUrl: user.avatarUrl,
    };
    res.json({ ok: true, data: { user: profile }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    res.json({ ok: true, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

