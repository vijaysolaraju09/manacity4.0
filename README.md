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
Create `server/.env` based on [`server/.env.example`](server/.env.example).

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
- `npm run typecheck` – TypeScript

### Server
- `npm run dev` – nodemon watcher
- `npm start` – start Express server
- `npm run lint` – ESLint

## License
MIT
