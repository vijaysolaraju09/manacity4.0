# Server Setup

## Firebase Service Account

1. In the Firebase console, open **Project Settings → Service Accounts**.
2. Click **Generate new private key** to download a JSON file.
3. Populate the values from that JSON into `.env` as shown in `.env.example`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (keep quotes, newlines as `\n`)
   - `JWT_SECRET` for issuing app tokens.

## Security

All sensitive operations require a verified Firebase ID token. The client triggers OTP with Firebase, but the server always verifies the ID token before creating accounts or issuing reset tokens. The client never decides on its own.
