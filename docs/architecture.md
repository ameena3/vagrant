# Architecture

## Overview

Fresh Kitchen follows a three-tier architecture: a Next.js frontend, a Go/Goa backend API, and a MongoDB database. All three run as Docker Compose services and communicate over an internal Docker network.

```
Browser
  │
  │  HTTP/HTTPS
  ▼
Next.js (port 3000)
  │  Auth: NextAuth.js + Google OAuth
  │  API rewrites: /api/backend/* → http://backend:8080/api/*
  ▼
Go/Goa Server (port 8080)
  │  Auth middleware validates Google ID token
  │  Routes to 6 service implementations
  │  Business logic (services/)
  ▼
MongoDB (port 27017)
  └── freshkitchen database
      ├── users
      ├── menus
      ├── orders
      ├── schedule
      ├── announcements
      └── settings
```

---

## Backend Architecture

The backend uses [Goa v3](https://goa.design), a design-first Go framework. You write API contracts in a DSL, run `goa gen`, and get type-safe HTTP servers generated for you.

### Layer Breakdown

```
backend/
├── design/         API contracts (Goa DSL) — source of truth
├── gen/            Generated HTTP servers & types — do NOT edit manually
├── [service].go    Goa service implementations (thin bridge layer)
├── services/       Business logic — validation, calculations, transformations
├── store/          Data access — all MongoDB queries live here
├── middleware/     Auth (Google OAuth token validation) and admin role check
└── cmd/            Entry point — wires everything together
```

**Data flow for a request:**

```
HTTP Request
  → CORS handler
  → Auth middleware (verifies Google ID token, injects user into context)
  → [Admin middleware if protected route]
  → Generated Goa HTTP handler (decodes request, validates types)
  → Service implementation (calls services/ layer)
  → services/ layer (business logic, calls store/)
  → store/ layer (MongoDB query)
  → Response encoded and returned
```

### Adding a New Endpoint

1. Define the endpoint in `backend/design/<service>.go` using Goa DSL
2. Run `cd backend && goa gen freshkitchen` to regenerate `gen/`
3. Implement the method in `backend/<service>.go` (bridge to services)
4. Add business logic in `backend/services/<service>.go`
5. Add persistence in `backend/store/<service>.go`

---

## Frontend Architecture

The frontend is a Next.js 14 app using the App Router. Pages are in `src/app/`, and all API calls go through a centralized client in `src/lib/api.ts`.

### Page Structure

```
src/app/
├── page.tsx              Customer home — weekly menu + cart
├── order/
│   ├── page.tsx          Checkout — order review + payment
│   └── success/page.tsx  Post-payment confirmation
├── admin/
│   ├── layout.tsx        Admin shell (nav, auth guard)
│   ├── page.tsx          Dashboard — analytics overview
│   ├── menu/             Menu editor
│   ├── schedule/         Day/week blocking
│   ├── announcements/    Announcement management
│   ├── bookings/         All orders view
│   └── admins/           Admin user management
└── api/auth/[...nextauth]/  NextAuth.js handler
```

### Authentication Flow

1. User clicks "Sign in with Google" — NextAuth.js initiates OAuth flow
2. Google redirects back with an authorization code
3. NextAuth.js exchanges it for tokens, stores the Google ID token in the session JWT
4. All API calls include `Authorization: Bearer {idToken}` header
5. Backend middleware validates the token against Google's OAuth endpoint and loads or creates the user record

### API Client (`src/lib/api.ts`)

All backend calls go through this single module. It automatically attaches the auth header from the active NextAuth session. Components import named functions (e.g., `fetchWeekMenu`, `createOrder`) rather than calling `fetch` directly.

---

## Authentication & Authorization

### Frontend

NextAuth.js manages the OAuth session. The `id_token` from Google is stored in the session and exposed to pages via `useSession()`.

### Backend

`backend/middleware/auth.go` intercepts every protected request:
1. Reads the `Authorization: Bearer <token>` header
2. Validates the token with Google's token info endpoint
3. Looks up or creates the user in MongoDB
4. Injects the user struct into the request context

`backend/middleware/admin.go` is applied on top of auth for admin routes:
1. Reads the user from context
2. Returns `403 Forbidden` if `user.role != "admin"`

### First Admin

The first user to authenticate is automatically granted `role: admin` by the user store (`store/user.go`). Subsequent users get `role: customer`. Admins can promote others via the Admin Users UI.

---

## Payments (Stripe)

Stripe integration is optional and controlled by `STRIPE_ENABLED=true`.

When enabled:
1. Customer clicks "Pay with Stripe" on the order page
2. Frontend calls `POST /api/orders/checkout` — backend creates a Stripe Checkout Session
3. Customer is redirected to Stripe-hosted checkout
4. On success, Stripe sends a webhook to `POST /api/webhooks/stripe`
5. Backend marks the order `status: paid`

When disabled, orders are created with `status: pending` and no payment is collected.

---

## Docker Compose

```yaml
services:
  frontend:   Next.js 14, port 3000
  backend:    Go/Goa server, port 8080
  mongodb:    MongoDB 7, port 27017
```

**Volumes:**
- `mongo_data` — persistent MongoDB storage
- `uploads` — menu images uploaded by admins

**Network:**
- `freshkitchen` bridge network — services reach each other by service name (e.g., `mongodb:27017`)

MongoDB initialization (`mongo-init/init.js`) runs on first startup and creates all collections, indexes, and default settings.
