const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.split('\\n').join('\n')
  : undefined;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  });
}

async function verifyIdToken(idToken) {
  return admin.auth().verifyIdToken(idToken);
}

module.exports = { verifyIdToken };
