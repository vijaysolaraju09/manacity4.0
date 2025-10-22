# Manacity 4.0

Full‑stack marketplace prototype built with **Vite + React + TypeScript** and **Express + Mongoose**.

## Prerequisites
- Node.js 20.12.2 (use `nvm use 20.12.2`)
- NPM >= 9
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

### 5. Reproduce the CI/Render build locally
```bash
nvm use 20.12.2
npm ci --no-audit --ignore-scripts
npm run build
```
The root `build` script prints `[BUILD]` progress logs while installing/building the client and server projects.

## API
All requests are rooted at `https://manacity4-0.onrender.com/api/` in production.

Health check:
```
GET /api/health -> { "ok": true }
```

## Deploy
- **Client**: deploy `client` folder to Vercel/Netlify.
- **Server**: deploy `server` folder to Render. Ensure env vars `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN` are configured.

### Render build configuration
- **Build Command**: `npm ci --no-audit --ignore-scripts && npm run build`
- **Start Command**: `npm --prefix server start`
- **Environment Variables**:
  - `CI=true`
  - `HUSKY=0`
  - `NPM_CONFIG_AUDIT=false`
  - `NPM_CONFIG_FUND=false`
  - `PUPPETEER_SKIP_DOWNLOAD=1`
  - `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`

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

## Continuous Integration
Every pull request runs ESLint, Prettier (check mode), and TypeScript type-checking for both the client and server via [GitHub Actions](.github/workflows/ci.yml).

## License
MIT
