import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { mapFirebaseError } from "./firebaseErrors";

const firebaseConfig = {
  apiKey: "AIzaSyBnArPsa8xi8aB9-aCjENcXA09sgjFvCy4",
  authDomain: "mana-city-98fa0.firebaseapp.com",
  projectId: "mana-city-98fa0",
  storageBucket: "mana-city-98fa0.firebasestorage.app",
  messagingSenderId: "1011241089335",
  appId: "1:1011241089335:web:2ba85628781c7af1f502b2",
  measurementId: "G-JMXQCQ7FC8"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

export const auth = getAuth(app);

// Invisible reCAPTCHA creator/ensurer
export function ensureInvisibleRecaptcha(containerId = "recaptcha-container") {
  const existing = (window as any).recaptchaVerifier;
  if (existing) return existing;
  const verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  (window as any).recaptchaVerifier = verifier;
  return verifier;
}

// Initiate OTP
export async function sendOtpToPhone(phoneE164: string) {
  const verifier = ensureInvisibleRecaptcha("recaptcha-container");
  if (!verifier) throw new Error("Recaptcha not initialized");
  try {
    const confirmation = await signInWithPhoneNumber(auth, phoneE164, verifier);
    (window as any).confirmationResult = confirmation; // temp store
    return true;
  } catch (err: any) {
    const code = err?.code || "unknown";
    console.error("signInWithPhoneNumber failed", {
      code,
      message: err?.message,
      response: err?.customData
    });
    throw { code, message: mapFirebaseError(code) };
  }
}

// Verify OTP code -> returns Firebase ID token
export async function verifyOtpCode(code: string): Promise<string> {
  const confirmation = (window as any).confirmationResult;
  if (!confirmation) throw new Error("OTP session not found");
  try {
    const cred = await confirmation.confirm(code);
    const idToken = await cred.user.getIdToken(/* forceRefresh */ true);
    return idToken;
  } catch (err: any) {
    const code = err?.code || "unknown";
    console.error("OTP confirmation failed", {
      code,
      message: err?.message,
      response: err?.customData
    });
    throw { code, message: mapFirebaseError(code) };
  }
}
