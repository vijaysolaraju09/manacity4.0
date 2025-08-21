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

## Error Handling

### Error Response Contract

Every error returned by the API follows this JSON shape:

```json
{
  "success": false,
  "error": {
    "code": "CODE_STRING",
    "message": "Human readable message",
    "details": {},            // optional
    "fieldErrors": {          // optional field level errors
      "field": "reason"
    }
  },
  "traceId": "for log correlation"
}
```

### Status Codes

Use the `AppError` helpers to return the appropriate HTTP status:

- `400` Bad Request – malformed request data
- `401` Unauthorized – missing or invalid credentials
- `403` Forbidden – lacks permission for the operation
- `404` Not Found – resource or route does not exist
- `409` Conflict – resource already exists or is in use
- `422` Unprocessable Entity – validation failed
- `500` Internal Server Error – unexpected failure

### Validation Schemas

Validation uses [Zod](https://github.com/colinhacks/zod). To add a new schema:

1. Define a schema (usually under `server/validators/`).
2. Apply it in routes with the `validate(schema, source?)` middleware.
3. On failure the middleware throws `AppError.unprocessable` and includes a `fieldErrors` map in the error response.

Example:

```ts
import { z } from 'zod';
import validate from '../middleware/validate';

const loginSchema = z.object({
  phone: z.string(),
  password: z.string().min(8),
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    // ... controller logic
  } catch (e) {
    next(e);
  }
});
```

### Implementation Notes

Always throw an `AppError` and pass errors to `next(e)`; never craft ad-hoc error responses in controllers.
