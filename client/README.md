# Manacity Web

## Environment variables

Copy `.env.example` to `.env` and set:

```
VITE_API_URL=https://manacity4-0.onrender.com/api
```

## OTP flow

**Signup**

```
Phone → POST /auth/otp/send → POST /auth/otp/verify → Account created & token issued
```

**Reset password**

```
Phone → POST /auth/otp/send → POST /auth/otp/verify → Receive reset token → Set new password
```

The client calls the backend OTP endpoints directly for sending and verifying codes.

## Backend API configuration

The frontend relies on a backend API defined by the `VITE_API_URL` environment variable. Requests made through `src/api/client.ts` use this base URL and automatically include the stored authentication token.

Authentication endpoints are prefixed with `/auth`, so login and related actions request URLs like `${VITE_API_URL}/auth/login`.
