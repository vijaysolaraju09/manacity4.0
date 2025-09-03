const express = require('express');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { z } = require('zod');
const User = require('../models/User');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');

const router = express.Router();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const normalizePhone = (phone) => {
  const trimmed = phone.trim();
  return trimmed.startsWith('+') ? trimmed : `${process.env.DEFAULT_COUNTRY_CODE}${trimmed}`;
};

const sendSchema = {
  body: z.object({
    phone: z.string().min(5, 'Phone is required'),
  }),
};

router.post('/send', validate(sendSchema), async (req, res, next) => {
  try {
    const to = normalizePhone(req.body.phone);
    await client.verify.v2.services(serviceSid).verifications.create({ to, channel: 'sms' });
    res.json({ success: true, message: 'OTP sent', traceId: req.traceId });
  } catch (err) {
    next(AppError.badRequest('OTP_SEND_FAILED', 'Failed to send OTP'));
  }
});

const verifySchema = {
  body: z.object({
    phone: z.string().min(5, 'Phone is required'),
    code: z.string().min(4, 'Code is required'),
    name: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    location: z.string().optional(),
    role: z.string().optional(),
  }),
};

router.post('/verify', validate(verifySchema), async (req, res, next) => {
  try {
    const { phone, code, name, password, location, role } = req.body;
    const to = normalizePhone(phone);
    const result = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to, code });

    if (result.status !== 'approved') {
      throw AppError.unauthorized('OTP_INVALID', 'Invalid or expired OTP');
    }

    let user = await User.findOne({ phone: to });
    if (!user) {
      const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
      user = await User.create({
        name: name || '',
        phone: to,
        password: hashedPassword,
        location: location || '',
        role: role || 'user',
        address: '',
        isVerified: true,
      });
    } else if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const profile = {
      id: user._id,
      name: user.name,
      phone: user.phone,
      location: user.location,
      role: user.role,
      address: user.address,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      profession: user.profession,
      bio: user.bio,
    };

    res.json({ success: true, token, user: profile, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
