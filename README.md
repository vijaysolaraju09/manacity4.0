# Manacity Auth Flow

## Environment Variables

Create a `.env` inside the `server` directory with:

- `MONGO_URI` – MongoDB connection string
- `JWT_SECRET` – secret used to sign JSON Web Tokens
- `PORT` – optional server port (defaults to 5000)

## Signup & Login

- **Signup**: `POST /api/auth/signup`
  - Body: `{ name, phone?, email?, password, location, role? }`
- **Login**: `POST /api/auth/login`
  - Body: `{ phone? | email?, password }`

Users authenticate directly with a phone number or email address and password. Successful login returns a JWT and the user profile.

All API responses contain a `traceId` for debugging. Errors return `success: false` with an `error` object and `traceId`.
