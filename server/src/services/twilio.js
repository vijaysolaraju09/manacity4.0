const twilio = require('twilio');

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID,
  DEFAULT_COUNTRY_CODE = '+91',
} = process.env;

const isConfigured =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_VERIFY_SERVICE_SID;

let client;
let verifyServiceSid;

if (isConfigured) {
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  verifyServiceSid = TWILIO_VERIFY_SERVICE_SID;
} else {
  console.warn('Twilio environment variables are missing; OTP routes disabled');
}

const toE164 = (raw) => {
  const trimmed = (raw || '').replace(/\s+/g, '');
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('+')) return trimmed;
  return `${DEFAULT_COUNTRY_CODE}${trimmed}`;
};

module.exports = { client, verifyServiceSid, toE164, isConfigured };
