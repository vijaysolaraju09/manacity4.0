# Manacity Web

## Environment variables

Copy `.env.example` to `.env` and set:

```
VITE_API_URL=https://manacity4-0.onrender.com/api
```

## Auth flow

Users sign up and log in with a phone number and a password. Successful login stores the JWT token and user profile in `localStorage`.

## Backend API configuration

The frontend relies on a backend API defined by the `VITE_API_URL` environment variable. Requests made through `src/api/client.ts` use this base URL and automatically include the stored authentication token.

Authentication endpoints are prefixed with `/auth`, so login and related actions request URLs like `${VITE_API_URL}/auth/login`.
