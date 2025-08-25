# Manacity Auth Flow

## Environment Variables

Server requires the following variables in a `.env` file:

- `MONGO_URI` – MongoDB connection string
- `JWT_SECRET` – secret used to sign JSON Web Tokens
- `PORT` – server port (optional, defaults to 5000)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` – only if integrating a real OTP service

## Signup & Login

1. **Signup**: `POST /api/auth/signup`
   - Body: `{ name, phone, password, location }`
   - Saves the user and sends an OTP (mocked as `123456`).
2. **Verify OTP**: `POST /api/auth/verify-otp`
   - Body: `{ phone, otp }`
   - For this mock implementation the OTP is always `123456`.
3. **Login**: `POST /api/auth/login`
   - Body: `{ phone, password }`
   - Returns `{ token, user }`.
4. **Profile**: `GET /api/user/profile` with `Authorization: Bearer <token>`

All API responses follow the shape:

```json
{
  "success": true,
  "data": {},
  "traceId": "..."
}
```

Errors return `success: false` with an `error` object and `traceId` for debugging.
