import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.warn('Firebase configuration is missing required environment variables.');
}

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
auth.useDeviceLanguage();

if (import.meta.env.DEV) {
  const mask = (value?: string) => {
    if (!value) return 'not-set';
    if (value.length <= 6) return `${value.slice(0, 2)}•••${value.slice(-1)}`;
    return `${value.slice(0, 3)}•••${value.slice(-3)}`;
  };

  console.log('[firebase:init]', {
    apiKey: mask(firebaseConfig.apiKey),
    projectId: mask(firebaseConfig.projectId),
  });
}

export { app, auth };
