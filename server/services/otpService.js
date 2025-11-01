const twilio = require('twilio');
const AppError = require('../utils/AppError');

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SID,
  TWILIO_DEFAULT_COUNTRY_CODE,
} = process.env;

const client = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

const ensureConfigured = () => {
  if (!client || !TWILIO_VERIFY_SID) {
    throw AppError.internal('OTP_SERVICE_NOT_CONFIGURED', 'OTP service is not configured');
  }
};

const normalizeCountryCode = (code) => {
  if (!code) {
    return '+1';
  }
  const trimmed = String(code).trim();
  if (!trimmed) {
    return '+1';
  }
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
};

const buildE164Number = (phone) => {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) {
    throw AppError.badRequest('INVALID_PHONE', 'Enter a valid phone number');
  }
  if (phone && String(phone).trim().startsWith('+')) {
    return `+${digits}`;
  }
  if (digits.length > 10) {
    return `+${digits}`;
  }
  const countryCode = normalizeCountryCode(TWILIO_DEFAULT_COUNTRY_CODE);
  return `${countryCode}${digits}`;
};

const sendVerificationCode = async (phone) => {
  ensureConfigured();
  const to = buildE164Number(phone);
  try {
    await client.verify.v2.services(TWILIO_VERIFY_SID).verifications.create({ to, channel: 'sms' });
  } catch (err) {
    throw AppError.internal('OTP_DELIVERY_FAILED', err?.message || 'Unable to send verification code');
  }
};

const verifyCode = async (phone, code) => {
  ensureConfigured();
  const to = buildE164Number(phone);
  try {
    const result = await client.verify.v2
      .services(TWILIO_VERIFY_SID)
      .verificationChecks.create({ to, code });
    return result;
  } catch (err) {
    throw AppError.badRequest('INVALID_OTP', 'Invalid or expired OTP');
  }
};

module.exports = {
  sendVerificationCode,
  verifyCode,
  buildE164Number,
};
