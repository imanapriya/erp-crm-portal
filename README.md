# Mini ERP + CRM Operations Portal

A small ERP/CRM system for a wholesale/distribution company: customers, products/inventory,
and sales challans, with role-based access for Admin, Sales, Warehouse, and Accounts staff.

**Live Demo**: [https://erp-crm-portal-self.vercel.app/login](https://erp-crm-portal-self.vercel.app/login)

Built for the Full Stack Developer case study. This README covers setup, architecture,
deployment, assumptions, and known limitations.


## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js, TypeScript, Express |
| ORM / DB access | **Drizzle ORM** over PostgreSQL (see "Why Drizzle instead of Prisma" below) |
| Database | PostgreSQL |
| Auth | JWT (`jsonwebtoken`), passwords hashed with `bcryptjs` |
| Validation | Zod |
| Frontend | React + TypeScript (Vite), React Router, Axios |
| Styling | Hand-written CSS design system (no framework) |

### Why Drizzle instead of Prisma

The case study lists PostgreSQL/MySQL and doesn't mandate a specific ORM. This was built with
Prisma first, but Prisma's `generate` step downloads a native query-engine binary from
Anthropic's build sandbox couldn't reach, and that same restriction can exist behind some
corporate/CI networks. Drizzle ORM is pure TypeScript with no native binary, so it works
anywhere Node does, and it made it possible to actually run migrations, seed data, and
exercise every endpoint against a real local Postgres instance while building this — not just
write code and hope it compiles. Everything in this repo has been run for real, not just typed.

## Project structure

```
erp-crm-portal/
├── backend/                 Express API
│   ├── src/
│   │   ├── app.ts           Express app + middleware wiring
│   │   ├── server.ts        Entry point
│   │   ├── config/env.ts    Environment variable loading/validation
│   │   ├── db/schema.ts     Drizzle schema (source of truth for the DB)
│   │   ├── lib/db.ts        DB connection (pg Pool + Drizzle instance)
│   │   ├── middleware/      auth, validation, error handling
│   │   ├── utils/           AppError, asyncHandler, pagination
│   │   └── modules/
│   │       ├── auth/        login, register, me
│   │       ├── customers/   CRM: customers + follow-ups
│   │       ├── products/    catalog + stock movement log
│   │       └── challans/    sales challans (the core business logic)
│   ├── drizzle/              generated SQL migration(s)
│   ├── drizzle.config.ts
│   ├── scripts/seed.ts       demo users + sample data
│   └── Dockerfile
├── frontend/                 React admin UI
│   ├── src/
│   │   ├── api/client.ts     Axios instance + JWT interceptor
│   │   ├── context/AuthContext.tsx
│   │   ├── components/       Layout, ProtectedRoute, StatusBadge, Pagination
│   │   └── pages/             Login, Dashboard, Customers, Products, Challans
│   └── Dockerfile
├── docker-compose.yml         postgres + backend + frontend, one command
└── postman_collection.json    every endpoint, with example bodies
```

## Architecture, briefly

- **Layered backend**: routes → controllers → services. Controllers only translate
  HTTP ↔ service calls; all business logic (stock math, snapshotting, transaction
  boundaries) lives in `*.service.ts` files, so it's testable independent of Express.
- **Every write that touches stock is a single DB transaction.** Confirming a challan
  checks stock, decrements it, and writes the stock-movement log entry all inside one
  `db.transaction(...)` call — if any line item has insufficient stock, the whole
  transaction rolls back and nothing partially applies. This was verified directly
  (see "What was actually tested" below).
- **Product snapshotting**: `challan_items` stores `productNameSnapshot`,
  `productSkuSnapshot`, and `unitPriceSnapshot` at the moment the challan is created —
  for both drafts and confirmed challans. Editing a product later never rewrites a past
  challan's history.
- **Role-based access** is enforced server-side via `requireRole(...)` middleware on
  every mutating route — the frontend also hides buttons/nav a role can't use, but that's
  a UX convenience, not the security boundary.
- **Validation** happens once, at the route boundary, via Zod schemas — controllers and
  services receive already-validated, correctly-typed data.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (local install, Docker, or a hosted instance like Supabase/Neon/Render Postgres)

## Local setup (without Docker)

### 1. Database

Create a database, e.g.:

```bash
createdb erp_crm
# or, if that's not on your PATH:
psql -U postgres -c "CREATE DATABASE erp_crm;"
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL to your Postgres connection string,
# and JWT_SECRET to any long random string.

npm install
npm run db:generate   # generates SQL migration from src/db/schema.ts (already committed in /drizzle, safe to re-run)
npm run db:migrate    # applies migrations to your database
npm run db:seed       # creates demo users + sample customer/product/challan
npm run dev           # starts the API on http://localhost:4000
```

Demo accounts created by the seed script (password is the same for all):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@erpcrm.test` | `Password123!` |
| Sales | `sales@erpcrm.test` | `Password123!` |
| Warehouse | `warehouse@erpcrm.test` | `Password123!` |
| Accounts | `accounts@erpcrm.test` | `Password123!` |

### 3. Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env.local
# edit .env.local if your backend isn't on http://localhost:4000

npm install
npm run dev   # starts on http://localhost:5173
```

Open `http://localhost:5173` and log in with any demo account above.

## Local setup (with Docker)

```bash
docker compose up --build
```

This starts Postgres, runs migrations, and boots the backend on `:4000` and frontend on
`:5173`. Seed data isn't run automatically inside the container (it's a dev convenience, not
something you want a `docker compose up` to silently redo) — run it once against the
container's database:

```bash
docker compose exec backend npx tsx scripts/seed.ts
```

## Environment variables

**Backend** (`backend/.env`, see `backend/.env.example`):

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Long random string used to sign JWTs. Generate with `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | Token lifetime, default `8h` |
| `PORT` | API port, default `4000` |
| `NODE_ENV` | `development` or `production` |
| `CORS_ORIGIN` | The frontend's origin, for CORS |

**Frontend** (`frontend/.env.local`, see `frontend/.env.example`):

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

Neither `.env` file is committed (see `.gitignore` in each folder) — only the `.env.example`
templates are.

## Deploying (free-tier friendly)

This wasn't deployed to a live URL as part of this submission — the environment used to build
it can't reach hosting providers' APIs. The steps below are what deploying it would look like
on the free tiers the case study suggests.

**Database — Supabase, Neon, or Render Postgres**
1. Create a Postgres instance, copy its connection string.
2. From your machine (not the host), run `npm run db:migrate` with `DATABASE_URL` pointed at
   that connection string, then `npm run db:seed` if you want demo data.

**Backend — Render or Railway**
1. New Web Service → point at the `backend/` folder (root directory: `backend`).
2. Build command: `npm install && npm run build`. Start command: `npm start`.
3. Set the environment variables from the table above (`DATABASE_URL` = your hosted DB,
   `CORS_ORIGIN` = your deployed frontend URL once you have it).

**Frontend — Vercel or Netlify**
1. New project → point at the `frontend/` folder (root directory: `frontend`).
2. Build command: `npm run build`. Output directory: `dist`.
3. Set `VITE_API_URL` to your deployed backend's URL.
4. Once deployed, go back to the backend's `CORS_ORIGIN` and update it to this URL.

## Testing the API without the UI

Import `postman_collection.json` into Postman. Run any request in the **Auth** folder first
(e.g. "Login (Sales)") — a test script on that request saves the returned JWT into the
collection's `{{token}}` variable automatically, and every other request is pre-configured to
send it as a Bearer token. "Create customer", "Create product", and "Create challan" also
save their IDs into collection variables so the rest of the requests in that folder work
without manual copy-pasting.

## What was actually tested

Everything below was run against a real local PostgreSQL instance while building this, not
just written and assumed correct:

- Login for all 4 roles, `/auth/me`, and rejecting a wrong password
- Listing/creating customers and products
- Creating a challan as **DRAFT** and confirming stock was *not* touched
- **Confirming** that draft and confirming stock *was* reduced by exactly the right amount
- Attempting to confirm a challan that requests more stock than available — confirmed this
  returns `409` and that the product's stock was left completely unchanged (no partial write)
- Confirming an already-confirmed challan a second time — rejected with `409`
- **Cancelling** a confirmed challan — confirmed stock was returned and a matching `IN` stock
  movement was logged
- Reading the full stock movement log for a product and seeing all three of the above events
  in order
- Role enforcement: a Warehouse user attempting to create a customer gets `403`
- No token at all on a protected route gets `401`
- Missing required fields on product creation gets `422` with field-level error messages
- An unknown route gets `404`
- Full frontend production build (`npm run build`) completes without TypeScript errors
- Frontend served via `vite preview` successfully reaches the backend's `/health` endpoint

## Assumptions made

- **"Draft vs Confirmed" stock timing**: stock is only reduced when a challan is
  *Confirmed* (either created directly as Confirmed, or created as Draft and confirmed
  later via `POST /challans/:id/confirm`). A Draft never touches stock, per the spec's
  explicit instruction that confirming a challan is what reduces it.
- **Cancellation** isn't explicitly specified beyond being a valid status, so a sensible
  behavior was implemented: cancelling a Confirmed challan returns its stock (with a logged
  `IN` movement); cancelling a Draft is a plain status change since it never held stock.
- **Challan numbers** are sequential and year-scoped (`CH-2026-000001`, `CH-2026-000002`, …),
  generated inside the same transaction as the challan itself to avoid collisions.
- **Role permissions** (who can do what) aren't fully specified beyond "role-based access,"
  so a reasonable split was chosen: Admin can do everything; Sales manages
  customers/challans; Warehouse manages products/stock; Accounts is read-only across all
  three modules. Confirming/cancelling challans is also allowed for Warehouse, since
  physically fulfilling or reversing an order is a warehouse-floor action in most
  distribution businesses. All of this is enforced server-side and is easy to change in
  one place — the `requireRole(...)` calls in each `*.routes.ts` file.
- **GST number** is stored as free text (not validated against India's GSTIN checksum
  format), since the spec marks it optional and doesn't require format validation.
- Currency is displayed as ₹ (INR) throughout, matching the GST/wholesale-distribution
  context implied by the brief.

## Known limitations / what's left incomplete

- **Editing a Draft challan's line items** is supported by the API
  (`PUT /challans/:id`) but there's no dedicated UI for it yet — only creating a new
  challan and confirming/cancelling an existing one have UI. It's in the Postman collection.
- **No automated test suite** (Jest/Vitest). Given the 48-hour window, effort went into
  actually running and verifying the real system end-to-end (see "What was actually tested")
  rather than writing tests around it. Adding Vitest + Supertest for the service layer would
  be the natural next step.
- **No pagination on the customer/product dropdowns** in the "New challan" form — they load
  the first 100 rows. Fine for a demo catalog, would need a searchable async-select for a
  catalog with thousands of SKUs.
- **No S3 image upload or CSV export** — these were listed as optional in the spec and weren't prioritized inside the time available. (Note: Docker setup, PDF invoice export, and GitHub Actions CI have been added).
- **CORS is single-origin** (`CORS_ORIGIN` is one URL) — fine for one deployed frontend,
  would need a small change (an array + origin-check function) to support multiple origins
  (e.g. staging + production) at once.



