const admin = require('firebase-admin');

const serviceAccount = {
  projectId: 'mana-city-98fa0',
  clientEmail: 'firebase-adminsdk@mana-city-98fa0.iam.gserviceaccount.com',
  privateKey: `-----BEGIN PRIVATE KEY-----\nFAKEPRIVATEKEY\n-----END PRIVATE KEY-----\n`
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function verifyIdToken(idToken) {
  return admin.auth().verifyIdToken(idToken);
}

module.exports = { verifyIdToken };
