import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
});

export const auth = getAuth(app);

// Invisible reCAPTCHA creator
export function createInvisibleRecaptcha(containerId: string) {
  if (!auth || (window as any).recaptchaVerifier) return (window as any).recaptchaVerifier;
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => { /* auto-fired on success */ }
  });
  (window as any).recaptchaVerifier = verifier;
  return verifier;
}

// Initiate OTP
export async function sendOtpToPhone(phoneE164: string) {
  const verifier = (window as any).recaptchaVerifier;
  if (!verifier) throw new Error("Recaptcha not initialized");
  const confirmation = await signInWithPhoneNumber(auth, phoneE164, verifier);
  (window as any).confirmationResult = confirmation; // temp store
  return true;
}

// Verify OTP code -> returns Firebase ID token
export async function verifyOtpCode(code: string): Promise<string> {
  const confirmation = (window as any).confirmationResult;
  if (!confirmation) throw new Error("OTP session not found");
  const cred = await confirmation.confirm(code);
  const idToken = await cred.user.getIdToken(/* forceRefresh */ true);
  return idToken;
}
