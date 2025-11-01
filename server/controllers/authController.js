const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const otpService = require("../services/otpService");

const normalizeDigits = (value) => String(value ?? "").replace(/\D/g, "");
const isValidPhone = (value) => /^\d{10,14}$/.test(value);

const pickAdminPhone = async () => {
  const preferred = normalizeDigits(process.env.ADMIN_PHONE);
  const candidates = [preferred, "9990000000", "9990000001", "9990000002"].filter((value) =>
    isValidPhone(value)
  );

  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.exists({ phone: candidate });
    if (!exists) {
      return candidate;
    }
  }

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const randomCandidate = String(9000000000 + Math.floor(Math.random() * 1000000000));
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.exists({ phone: randomCandidate });
    if (!exists) {
      return randomCandidate;
    }
  }

  throw AppError.internal("ADMIN_SETUP_FAILED", "Unable to provision admin account");
};

const ensureAdminAccount = async (email, password) => {
  const hashedPassword = await bcrypt.hash(String(password), 10);
  const displayName = process.env.ADMIN_NAME || "Administrator";

  let adminUser = await User.findOne({ email }).select("+password");
  if (adminUser) {
    adminUser.role = "admin";
    adminUser.password = hashedPassword;
    adminUser.isVerified = true;
    adminUser.verificationStatus = "approved";
    if (!adminUser.name) {
      adminUser.name = displayName;
    }
    await adminUser.save();
    return adminUser;
  }

  adminUser = await User.findOne({ role: "admin" }).select("+password");
  if (adminUser) {
    if (!adminUser.email) {
      adminUser.email = email;
    }
    adminUser.password = hashedPassword;
    adminUser.isVerified = true;
    adminUser.verificationStatus = "approved";
    if (!adminUser.name) {
      adminUser.name = displayName;
    }
    await adminUser.save();
    return adminUser;
  }

  const phone = await pickAdminPhone();

  const created = await User.create({
    name: displayName,
    phone,
    email,
    password: hashedPassword,
    role: "admin",
    location: "",
    address: "",
    isVerified: true,
    verificationStatus: "approved",
  });

  return created;
};

exports.signup = async (req, res, next) => {
  try {
    const { name, phone, password, location, role, email } = req.body;

    if (!phone) {
      throw AppError.badRequest('MISSING_CONTACT', 'Phone is required');
    }

    const normalizedPhone = normalizeDigits(phone);
    if (!isValidPhone(normalizedPhone)) {
      throw AppError.badRequest('INVALID_PHONE', 'Enter a valid phone number');
    }

    const existingPhone = await User.findOne({ phone: normalizedPhone });
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
      phone: normalizedPhone,
      password: hashedPassword,
      location,
      role,
      email,
      address: '',
      isVerified: false,
      verificationStatus: 'pending',
    });

    try {
      await otpService.sendVerificationCode(normalizedPhone);
    } catch (err) {
      await User.deleteOne({ _id: user._id });
      throw err;
    }

    res.status(201).json({
      ok: true,
      data: {
        message: `OTP sent to ${user.phone}. Please verify to complete signup.`,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    const normalizedPhone = normalizeDigits(phone);
    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      throw AppError.badRequest('INVALID_PHONE', 'Enter a valid phone number');
    }

    const user = await User.findOne({ phone: normalizedPhone }).select('+password');
    if (!user) return next(AppError.notFound('USER_NOT_FOUND', 'User not found'));

    // 2) Guard accounts without password (e.g., OTP-only accounts)
    if (!user.password) {
      return next(AppError.badRequest('PASSWORD_LOGIN_NOT_AVAILABLE', 'This account uses OTP login'));
    }

    if (!user.isVerified) {
      return next(AppError.forbidden('PHONE_NOT_VERIFIED', 'Please verify your phone to continue.'));
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

exports.forgotPassword = async (req, res, next) => {
  try {
    const rawPhone = req.body?.phone;
    const normalizedPhone = normalizeDigits(rawPhone);

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      throw AppError.badRequest("INVALID_PHONE", "Enter a valid phone number");
    }

    try {
      const user = await User.findOne({ phone: normalizedPhone });
      if (user) {
        await otpService.sendVerificationCode(normalizedPhone);
      }
    } catch (err) {
      if (err instanceof AppError && err.statusCode >= 500) {
        throw err;
      }
    }

    return res.json({
      ok: true,
      data: {
        message: "If an account exists for that number, you will receive an OTP shortly.",
      },
      traceId: req.traceId,
    });
  } catch (err) {
    return next(err);
  }
};

exports.verifyPhone = async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    const normalizedPhone = normalizeDigits(phone);

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      throw AppError.badRequest('INVALID_PHONE', 'Enter a valid phone number');
    }

    const result = await otpService.verifyCode(normalizedPhone, code);
    if (!result || result.status !== 'approved') {
      throw AppError.badRequest('INVALID_OTP', 'Invalid or expired OTP');
    }

    const user = await User.findOneAndUpdate(
      { phone: normalizedPhone },
      { isVerified: true, verificationStatus: 'approved' },
      { new: true }
    );

    if (!user) {
      throw AppError.notFound('USER_NOT_FOUND', 'User not found');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw AppError.internal('JWT_SECRET_NOT_SET', 'JWT secret not configured');
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, jwtSecret, { expiresIn: '7d' });

    return res.json({
      ok: true,
      data: { token, user: user.toProfileJSON() },
      traceId: req.traceId,
    });
  } catch (err) {
    return next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { phone, code, password } = req.body;
    const normalizedPhone = normalizeDigits(phone);

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      throw AppError.badRequest('INVALID_PHONE', 'Enter a valid phone number');
    }

    const result = await otpService.verifyCode(normalizedPhone, code);
    if (!result || result.status !== 'approved') {
      throw AppError.badRequest('INVALID_OTP', 'Invalid or expired OTP');
    }

    const user = await User.findOne({ phone: normalizedPhone }).select('+password');
    if (!user) {
      throw AppError.badRequest('INVALID_OTP', 'Invalid or expired OTP');
    }

    user.password = await bcrypt.hash(password, 10);
    if (!user.isVerified) {
      user.isVerified = true;
      user.verificationStatus = 'approved';
    }
    await user.save();

    return res.json({
      ok: true,
      data: { message: 'Password reset successful. You can now log in with your new password.' },
      traceId: req.traceId,
    });
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

    const matchesEnv =
      normalizedEmail === String(process.env.ADMIN_EMAIL || '').toLowerCase() &&
      password === process.env.ADMIN_PASSWORD;

    if (!adminUser) {
      if (!matchesEnv) {
        throw AppError.unauthorized('INVALID_CREDENTIALS', 'Invalid credentials');
      }
      adminUser = await ensureAdminAccount(normalizedEmail, password);
    }

    if (!adminUser?._id) {
      throw AppError.unauthorized('INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const payload = { role: 'admin', userId: adminUser._id };

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

