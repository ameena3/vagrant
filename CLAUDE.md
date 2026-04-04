# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fresh Kitchen** is a homemade meal booking platform. Customers browse weekly menus and book meals; admins manage menus, schedules, announcements, and view analytics. The stack is Go (Goa framework) backend + Next.js 14 frontend + MongoDB, all orchestrated via Docker Compose.

## Common Commands

### Docker (primary workflow)
```bash
make setup        # First-time setup: copies .env.example → .env
make up           # Start all services (frontend :3000, backend :8080, mongo :27017)
make up-build     # Rebuild images and start
make down         # Stop all services
make logs         # Tail logs for all services
make logs-backend # Tail backend only
make health       # Check backend health at localhost:8080/health
make reset-db     # Wipe and reinitialize MongoDB (destructive)
```

### Local development (no Docker)
```bash
make dev-install   # npm install + go mod tidy
make dev-frontend  # cd frontend && npm run dev
make dev-backend   # cd backend && go run ./cmd/server
```

### Backend (Go)
```bash
cd backend
go build ./...         # Build
go test ./...          # Run all tests
go test ./services/... # Run tests in a specific package
go vet ./...           # Vet
```

### Frontend (Next.js)
```bash
cd frontend
npm run dev    # Dev server
npm run build  # Production build
npm run lint   # ESLint
```

## Architecture

### Request flow
```
Browser → Next.js (port 3000)
  └─ /api/backend/* (proxied via next.config.js) → Go/Goa (port 8080)
                                                        └─ MongoDB (port 27017)
```
Frontend auth uses NextAuth.js with Google OAuth. The backend independently verifies Google ID tokens via `middleware/auth.go`. The first user to sign in becomes admin automatically.

### Backend structure (Go + Goa)

The backend is **design-first**: API contracts are defined in `backend/design/`, and Goa generates type-safe HTTP servers into `backend/gen/`. Never edit generated files in `gen/` directly.

```
backend/
├── design/          # Goa DSL: API definitions, result types, payloads
├── gen/             # Goa-generated code (do not edit)
├── services/        # Business logic layer
├── store/           # Data access layer (MongoDB)
├── middleware/       # Auth and admin role checking
├── cmd/freshkitchen/ # Entry point (main.go + http.go)
└── *.go             # Goa service implementations (wire design → services)
```

The six services are: **menu**, **order**, **schedule**, **announcement**, **admin**, **analytics**.

When adding a new endpoint:
1. Define it in `backend/design/`
2. Run `goa gen freshkitchen` to regenerate `gen/`
3. Implement the method in the corresponding root-level `*.go` file
4. Add business logic in `services/`
5. Add persistence in `store/`

### Frontend structure (Next.js 14 App Router)

```
frontend/src/
├── app/             # Pages (App Router): /, /order, /admin/**
├── components/      # React components; ui/ contains shadcn/ui primitives
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
└── types/index.ts   # Shared TypeScript types
```

API calls from the frontend go to `/api/backend/*`, which Next.js rewrites to `http://backend:8080/*` (Docker) or `http://localhost:8080/*` (local dev). Authorization uses a Bearer token from the NextAuth session.

### MongoDB collections
`users`, `menus`, `orders`, `schedule`, `settings`, `announcements`

Indexes and initial seed data are set up by `mongo-init/init.js` on first start.

## Environment Configuration

Copy `.env.example` to `.env` and fill in:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth app credentials
- `NEXTAUTH_SECRET` — random secret for NextAuth session signing
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe payment keys
- `MONGODB_URI` — MongoDB connection string (default works with Docker Compose)
