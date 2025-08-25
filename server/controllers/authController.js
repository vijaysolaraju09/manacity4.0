const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");

exports.signup = async (req, res, next) => {
  try {
    const { name, phone, password, location, role } = req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      throw AppError.conflict('PHONE_EXISTS', 'Phone already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      phone,
      password: hashedPassword,
      location,
      role,
      address: "",
    });

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

    res.status(201).json({
      success: true,
      data: { user: profile },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });
    if (!user) throw AppError.notFound('USER_NOT_FOUND', 'Phone not registered');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw AppError.badRequest('INVALID_PASSWORD', 'Incorrect password');

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

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
    };

    res.status(200).json({
      success: true,
      data: { token, user: profile },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      return res.json({ success: true, data: { token }, traceId: req.traceId });
    }
    throw AppError.unauthorized('INVALID_CREDENTIALS', 'Invalid credentials');
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (otp !== '123456') {
      throw AppError.badRequest('INVALID_OTP', 'Invalid OTP');
    }

    const user = await User.findOneAndUpdate(
      { phone },
      { isVerified: true },
      { new: true }
    );

    if (!user) throw AppError.notFound('USER_NOT_FOUND', 'Phone not registered');

    res.json({
      success: true,
      data: { message: 'OTP verified' },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};
