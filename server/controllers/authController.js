const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");

exports.signup = async (req, res, next) => {
  try {
    const { name, phone, password, location, role, email } = req.body;

    if (!phone) {
      throw AppError.badRequest('MISSING_CONTACT', 'Phone is required');
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      throw AppError.conflict('USER_EXISTS', 'Phone already registered');
    }

    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        throw AppError.conflict('EMAIL_EXISTS', 'Email already registered');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      phone,
      password: hashedPassword,
      location,
      role,
      email,
      address: '',
      isVerified: false,
      verificationStatus: 'none',
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

    res.status(201).json({
      ok: true,
      data: { user: user.toProfileJSON(), token },
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

    // 5) Profile payload
    return res
      .status(200)
      .json({ ok: true, data: { token, user: user.toProfileJSON() }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};

exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw AppError.badRequest('INVALID_CREDENTIALS', 'Email and password are required');
    }

    const normalizedEmail = String(email).toLowerCase();
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw AppError.internal('JWT_SECRET_NOT_SET', 'JWT secret not configured');
    }

    let adminUser = await User.findOne({ email: normalizedEmail, role: 'admin' }).select('+password');

    if (adminUser && adminUser.password) {
      const match = await bcrypt.compare(String(password), adminUser.password);
      if (!match) {
        adminUser = null;
      }
    } else {
      adminUser = null;
    }

    if (!adminUser) {
      const matchesEnv =
        normalizedEmail === String(process.env.ADMIN_EMAIL || '').toLowerCase() &&
        password === process.env.ADMIN_PASSWORD;
      if (matchesEnv) {
        adminUser = await User.findOne({ role: 'admin' }).select('_id');
      }
    }

    if (!adminUser) {
      throw AppError.unauthorized('INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const payload = { role: 'admin' };
    if (adminUser._id) {
      payload.userId = adminUser._id;
    }

    const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

    return res.json({ ok: true, data: { token }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw AppError.unauthorized('UNAUTHORIZED', 'Unauthorized');
    res.json({ ok: true, data: { user: user.toProfileJSON() }, traceId: req.traceId });
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

