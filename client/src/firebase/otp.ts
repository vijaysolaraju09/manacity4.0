import type { ConfirmationResult } from 'firebase/auth';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './init';

const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

let verifier: RecaptchaVerifier | null = null;
let lastConfirmationResult: ConfirmationResult | null = null;

const ensureContainer = () => {
  if (typeof window === 'undefined') {
    throw new Error('reCAPTCHA is only available in the browser.');
  }
  const existing = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!existing) {
    const container = document.createElement('div');
    container.id = RECAPTCHA_CONTAINER_ID;
    container.style.display = 'none';
    document.body.appendChild(container);
  }
};

export const getOrCreateInvisibleRecaptcha = (firebaseAuth: Auth = auth) => {
  ensureContainer();

  if (verifier) {
    return verifier;
  }

  verifier = new RecaptchaVerifier(
    firebaseAuth,
    RECAPTCHA_CONTAINER_ID,
    {
      size: 'invisible',
    },
  );

  return verifier;
};

export const resetVerifier = () => {
  if (verifier) {
    verifier.clear();
    verifier = null;
  }
};

export const sendOtp = async (phoneE164: string): Promise<ConfirmationResult> => {
  const invisibleVerifier = getOrCreateInvisibleRecaptcha();
  try {
    lastConfirmationResult = await signInWithPhoneNumber(auth, phoneE164, invisibleVerifier);
    return lastConfirmationResult;
  } catch (error) {
    resetVerifier();
    throw error;
  }
};

export const confirmOtp = async (code: string): Promise<UserCredential> => {
  if (!lastConfirmationResult) {
    throw new Error('No verification in progress. Please request a new code.');
  }

  try {
    const credential = await lastConfirmationResult.confirm(code);
    lastConfirmationResult = null;
    return credential;
  } catch (error) {
    const message = (error as { code?: string }).code;
    if (message === 'auth/code-expired' || message === 'auth/invalid-verification-code') {
      resetVerifier();
      lastConfirmationResult = null;
    }
    throw error;
  }
};
