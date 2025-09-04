const twilio = require('twilio');

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID,
  DEFAULT_COUNTRY_CODE = '+91',
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
  throw new Error('Twilio env vars missing');
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const verifyServiceSid = TWILIO_VERIFY_SERVICE_SID;

const toE164 = (raw) => {
  const trimmed = (raw || '').replace(/\s+/g, '');
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('+')) return trimmed;
  return `${DEFAULT_COUNTRY_CODE}${trimmed}`;
};

module.exports = { client, verifyServiceSid, toE164 };
