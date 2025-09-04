# Manacity Auth Flow

## Environment Variables

Create a `.env` inside the `server` directory with:

- `MONGO_URI` – MongoDB connection string
- `JWT_SECRET` – secret used to sign JSON Web Tokens
- `PORT` – optional server port (defaults to 5000)
- `TWILIO_ACCOUNT_SID` – Twilio account SID
- `TWILIO_AUTH_TOKEN` – Twilio auth token
- `TWILIO_VERIFY_SERVICE_SID` – Twilio Verify service SID
- `DEFAULT_COUNTRY_CODE` – e.g. `+91`

If the Twilio variables (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_VERIFY_SERVICE_SID`) are missing,
the server will still run but OTP endpoints will report that the service is not configured.

## Signup & Login with OTP

1. **Send OTP**: `POST /api/auth/otp/send`
   - Body: `{ phone }`
2. **Verify OTP**: `POST /api/auth/otp/verify`
   - Body: `{ phone, code, ...optional user fields }`
   - Returns `{ success, token, user }`

The client submits a phone number which triggers `sendOtp` and navigates to `/otp?phone=...`. Upon verifying the code, the JWT is stored in `localStorage`, Redux state is updated and the user is redirected to `/home`.

All API responses contain a `traceId` for debugging. Errors return `success: false` with an `error` object and `traceId`.
