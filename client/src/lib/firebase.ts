import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const app = initializeApp({
  apiKey: "AIza...",
  authDomain: "mana-city-98fa0.firebaseapp.com",
  projectId: "mana-city-98fa0",
  storageBucket: "mana-city-98fa0.appspot.com",
  messagingSenderId: "1011241089335",
  appId: "1:1011241089335:web:2ba85628781c7af1f502b2",
  measurementId: "G-JMXQCQ7FC8"
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
