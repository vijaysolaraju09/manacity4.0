# Manacity 4.0

Full‑stack marketplace prototype built with **Vite + React + TypeScript** and **Express + Mongoose**.

## Prerequisites
- Node.js 18+
- PNPM or NPM
- MongoDB database

## Getting Started

### 1. Install dependencies
```bash
npm install --prefix client
npm install --prefix server
```

### 2. Environment
Copy the shared example file and adjust the values for your setup:

```bash
cp .env.example client/.env
cp .env.example server/.env
```

The client only reads keys prefixed with `VITE_`, while the server uses the rest when bootstrapping Express and MongoDB.

### 3. Development
Run frontend and backend in parallel:
```bash
npm run dev --prefix client
npm run dev --prefix server
```

### 4. Production build
```bash
npm run build --prefix client
npm start --prefix server
```
Then visit `http://localhost:5173`.

## API
All requests are rooted at `https://manacity4-0.onrender.com/api/` in production.

Health check:
```
GET /api/health -> { "ok": true }
```

## Deploy
- **Client**: deploy `client` folder to Vercel/Netlify.
- **Server**: deploy `server` folder to Render. Ensure env vars `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN` are configured.

## Commands
### Client
- `npm run dev` – start Vite dev server
- `npm run build` – type check and build
- `npm run lint` – ESLint
- `npm run format` / `npm run format:check` – Prettier
- `npm run typecheck` – TypeScript

### Server
- `npm run dev` – nodemon watcher
- `npm start` – start Express server
- `npm run lint` – ESLint
- `npm run format` / `npm run format:check` – Prettier
- `npm run typecheck` – TypeScript project references
- `npm run seed:qa` – seed idempotent QA fixtures (shop, products, service, event)

## QA Data

Run the QA seed to populate deterministic fixtures for manual verification:

```bash
npm run seed:qa --prefix server
```

The script creates a verified business owner with a shop, three everyday products, three active special products, a QA delivery service, and an upcoming community event with registrations currently open. You can safely rerun the command; it only inserts records that do not already exist.

## Continuous Integration
Every pull request runs ESLint, Prettier (check mode), and TypeScript type-checking for both the client and server via [GitHub Actions](.github/workflows/ci.yml).

## License
MIT

## Backend Setup

### Quick Start
1. Copy the example environment file and update the values for your local database and secrets:
   ```bash
   cp server/.env.example server/.env
   ```
2. Install backend dependencies:
   ```bash
   npm install --prefix server
   ```
3. Start the Express API (either directly or via the root helper script):
   ```bash
   npm run dev --prefix server
   # or
   npm run server
   ```
4. When running the full stack from the repository root, install the shared tooling and use the combined dev script:
   ```bash
   npm install
   npm run dev
   ```

## Release Notes — Cart, Services, Events, Notifications
- **New endpoints and UI pages:** Added consolidated cart API with checkout validation, provider assignment routes for services, and refreshed client views for the cart, special shop, provider hub, event registration, and notification center.
- **Security and validation improvements:** Hardened request validation with Express Validator and Zod, expanded authentication checks on order and service actions, and enforced role-based access on analytics and notification APIs.
- **Accessibility and performance changes:** Introduced semantic headings, ARIA labelling on notification and cart widgets, lazy-loaded analytics widgets, and cached event leaderboards for faster refreshes.
- **Seed script for QA:** Use `npm run seed:qa --prefix server` to populate deterministic fixtures covering carts, services, events, and notification scenarios before manual verification.

## Rollback Plan
- **Git tags before/after:** Tag the current release candidate (e.g., `v4.0.0-rc`) before deploying and the production cut (`v4.0.0`) afterward; use `git checkout <tag>` to revert to the desired state if rollback is required.
- **Environment variable toggles:** Disable announcement banners, event registrations, and push notifications by setting `ANNOUNCEMENTS_ENABLED=false`, `EVENTS_PUBLIC_REGISTRATION=false`, and `NOTIFICATIONS_PUSH_ENABLED=false` in the environment.
- **Route removal safety:** To revert feature routes, remove the cart upgrade, services workflow, and notification center mounts from the router modules, redeploy, and confirm legacy fallbacks through `npm run test --prefix server` and targeted smoke tests via `npm run dev` locally.
