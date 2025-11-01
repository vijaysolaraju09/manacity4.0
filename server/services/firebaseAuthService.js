const admin = require('firebase-admin');
const AppError = require('../utils/AppError');

let firebaseApp = null;

const getFirebaseConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!privateKey && base64) {
    try {
      privateKey = Buffer.from(base64, 'base64').toString('utf8');
    } catch (err) {
      throw AppError.internal('FIREBASE_CONFIG_INVALID', 'Firebase service account is invalid');
    }
  }

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw AppError.internal('FIREBASE_NOT_CONFIGURED', 'Firebase Admin is not configured');
  }

  return { projectId, clientEmail, privateKey };
};

const getFirebaseAuth = () => {
  if (!firebaseApp) {
    const { projectId, clientEmail, privateKey } = getFirebaseConfig();
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }

  return admin.auth(firebaseApp);
};

const verifyIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== 'string') {
    throw AppError.badRequest('OTP_REQUIRED', 'Verify OTP before continuing');
  }

  try {
    const auth = getFirebaseAuth();
    const decoded = await auth.verifyIdToken(idToken);
    return decoded;
  } catch (err) {
    if (err?.code === 'app/no-app') {
      firebaseApp = null;
      return verifyIdToken(idToken);
    }

    if (err?.code === 'auth/argument-error' || err?.code === 'auth/id-token-expired') {
      throw AppError.badRequest('INVALID_OTP', 'Invalid or expired OTP session');
    }

    throw AppError.internal('OTP_VERIFICATION_FAILED', 'Unable to verify OTP session');
  }
};

module.exports = {
  verifyIdToken,
};
