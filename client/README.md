# Manacity Web

## Environment variables

Copy `.env.example` to `.env` and fill in your Firebase project settings:

```
VITE_API_URL=https://manacity4-0.onrender.com/api
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=mana-city-98fa0.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mana-city-98fa0
VITE_FIREBASE_STORAGE_BUCKET=mana-city-98fa0.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1011241089335
VITE_FIREBASE_APP_ID=1:1011241089335:web:2ba85628781c7af1f502b2
VITE_FIREBASE_MEASUREMENT_ID=G-JMXQCQ7FC8
```

## OTP flow

**Signup**

```
Phone → Firebase OTP → Verify code → POST /auth/verify-firebase (purpose=signup) → Account created → Redirect to login
```

**Reset password**

```
Phone → Firebase OTP → Verify code → POST /auth/verify-firebase (purpose=reset) → Receive reset token → Set new password
```

The client only initiates OTP via Firebase; the server validates the Firebase ID token before creating or updating accounts.

## Backend API configuration

The frontend relies on a backend API defined by the `VITE_API_URL` environment variable. Requests made through `src/api/client.ts` use this base URL and automatically include the stored authentication token.

Authentication endpoints are prefixed with `/auth`, so login and related actions request URLs like `${VITE_API_URL}/auth/login`.
