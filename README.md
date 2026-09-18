# Shiprocket Dashboard Backend

Standalone Node.js + TypeScript + Fastify API for the Shiprocket analytics frontend. It accepts CSV/XLSX uploads, normalizes orders, exposes filtered analytics endpoints, supports optional MongoDB/Metabase configuration, and generates backend-side exports.

## Requirements

Node.js 20+ and pnpm.

## Run locally

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The API listens on `http://localhost:4000` by default. Production commands are `pnpm build` and `pnpm start`; `pnpm typecheck` validates TypeScript.

## Environment

`PORT`, `FRONTEND_ORIGIN`, and `DATA_SOURCE` configure the server. `MONGODB_URI`, `MONGODB_DATABASE`, and `MONGODB_COLLECTION` are optional MongoDB settings. `METABASE_URL` is an optional server-side CSV URL. Secrets are never returned by the API.

## API

- `GET /health`
- `POST /api/upload` multipart field `file` (`.csv`, `.xlsx`)
- `GET /api/orders`
- `GET /api/dashboard`
- `GET /api/pnl`
- `GET /api/products`
- `GET /api/channels`
- `GET/PUT /api/data-source` with `{ "source": "local|mongodb|metabase" }`
- `GET/PUT /api/metabase` with `{ "url": "https://..." }`
- `GET /api/metabase/data`
- `GET /api/export/orders?format=csv|xlsx`
- `GET /api/export/pnl`

All analytics routes support the common date, channel, status, payment method, product, SKU, state, and city filters. Orders additionally support search, pagination, and sorting.

## Frontend integration

Set the existing frontend's `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000` locally or to the deployed API URL in production. Configure `FRONTEND_ORIGIN` on this backend to the exact frontend origin.

## Deployment

Deploy this folder independently to Railway, Render, Fly.io, Cloud Run, or a Node-compatible host. Set `PORT` from the platform and run `pnpm build` during build and `pnpm start` at runtime.

## GitHub

```bash
git init
git add .
git commit -m "feat: initialize Shiprocket backend"
git branch -M main
git remote add origin <BACKEND_REPOSITORY_URL>
git push -u origin main
```
