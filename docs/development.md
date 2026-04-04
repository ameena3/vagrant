# Development Guide

## Prerequisites

### For Docker-based development
- Docker Desktop (or Docker Engine + Compose plugin)
- A Google OAuth app for authentication

### For local development (without Docker)
- Go 1.26+
- Node.js 18+ and npm
- MongoDB 7 running locally on port 27017
- Goa CLI: `go install goa.design/goa/v3/cmd/goa@v3`

---

## Running Locally (without Docker)

### 1. Set up environment

```bash
cp .env.example .env
```

**Option A — with Google OAuth** (full auth flow): fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET`.

**Option B — dev auth bypass** (no Google account needed): set the following in `.env` instead:

```env
DEV_AUTH_BYPASS=true
NEXT_PUBLIC_DEV_AUTH_BYPASS=true
NEXTAUTH_SECRET=any_random_string
```

When bypass mode is active, clicking "Sign in" instantly authenticates you as `dev@localhost`. The first time this user hits the backend they are automatically granted admin access (same first-user rule as normal mode). Do not use bypass mode in production.

### 2. Start the backend

```bash
cd backend
go mod tidy
go run ./cmd/freshkitchen
# Server starts on :8080
```

The backend reads `MONGO_URI` from the environment. If unset it defaults to `mongodb://localhost:27017/freshkitchen`.

### 3. Start the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
# Dev server starts on :3000 with hot reload
```

The frontend rewrites `/api/backend/*` to `http://localhost:8080/api/*` (configured in `next.config.js`).

---

## Backend

### Project layout

```
backend/
├── cmd/freshkitchen/   Entry point
│   ├── main.go         MongoDB connection, service wiring, graceful shutdown
│   └── http.go         HTTP server, endpoint mounting, CORS, health check
├── design/             Goa DSL — API contracts (source of truth)
│   ├── design.go       API root (base URL, title, version)
│   ├── types.go        Shared result types
│   ├── menu.go         Menu service endpoints
│   ├── order.go        Order service endpoints
│   ├── schedule.go     Schedule service endpoints
│   ├── announcement.go Announcement service endpoints
│   ├── admin.go        Admin management endpoints
│   └── analytics.go    Analytics endpoints
├── gen/                Goa-generated code — do NOT edit
├── services/           Business logic (validation, transformations)
├── store/              MongoDB queries (one file per collection)
├── middleware/         Auth & admin middleware
├── menu.go             Goa service implementation (bridges gen/ → services/)
├── order.go            ...
├── schedule.go         ...
├── announcement.go     ...
├── admin.go            ...
├── analytics.go        ...
└── errors.go           Error type definitions
```

### Goa code generation

The `gen/` directory is generated from the DSL in `design/`. Never edit files in `gen/` manually — your changes will be overwritten on the next generation.

After modifying any file in `design/`:

```bash
cd backend
goa gen freshkitchen
```

This updates `gen/` with new HTTP servers, type definitions, and encoder/decoder code.

### Adding a new endpoint

1. **Define it in `design/<service>.go`** using the Goa DSL:

```go
var _ = Service("menu", func() {
    Method("getFeatured", func() {
        Description("Get featured meals")
        Result(CollectionOf(MenuItemResult))
        HTTP(func() {
            GET("/api/menus/featured")
            Response(StatusOK)
        })
    })
})
```

2. **Regenerate:**

```bash
goa gen freshkitchen
```

3. **Implement the method** in `backend/menu.go`:

```go
func (s *menuSvc) GetFeatured(ctx context.Context) ([]*menu.MenuItemResult, error) {
    return s.svc.GetFeatured(ctx)
}
```

4. **Add business logic** in `backend/services/menu.go`:

```go
func (s *MenuService) GetFeatured(ctx context.Context) ([]*MenuItemResult, error) {
    return s.store.GetFeatured(ctx)
}
```

5. **Add the query** in `backend/store/menu.go`:

```go
func (s *Store) GetFeatured(ctx context.Context) ([]*MenuItemResult, error) {
    // MongoDB query here
}
```

### Running backend tests

```bash
cd backend
go test ./...
```

### Building the backend binary

```bash
cd backend
go build -o bin/freshkitchen ./cmd/freshkitchen
```

---

## Frontend

### Project layout

```
frontend/src/
├── app/                Next.js App Router pages
│   ├── page.tsx        Home — weekly menu + cart
│   ├── order/          Checkout & success pages
│   ├── admin/          Admin dashboard pages
│   └── api/auth/       NextAuth.js API route
├── components/         React components
│   ├── ui/             shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── MenuEditor.tsx
│   ├── OrderSummary.tsx
│   ├── AnnouncementBanner.tsx
│   └── AnalyticsCards.tsx
├── lib/
│   ├── api.ts          Centralized API client (all backend calls)
│   ├── auth.ts         NextAuth.js config (Google provider)
│   ├── stripe.ts       Stripe client initialization
│   └── utils.ts        Date formatting, currency helpers
├── hooks/              Custom React hooks
└── types/index.ts      TypeScript interfaces for all entities
```

### Adding a UI component (shadcn/ui)

The project uses [shadcn/ui](https://ui.shadcn.com). Add new components with:

```bash
cd frontend
npx shadcn-ui@latest add <component-name>
```

Components are added to `src/components/ui/`.

### Adding a new API call

Add a function to `src/lib/api.ts`:

```ts
export async function getFeaturedMeals(token: string): Promise<MenuItem[]> {
  const res = await fetch(`/api/backend/menus/featured`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch featured meals");
  return res.json();
}
```

Then call it from a page or component using `useSession` to get the token:

```ts
const { data: session } = useSession();
const items = await getFeaturedMeals(session.idToken);
```

### Linting

```bash
cd frontend
npm run lint
```

### Production build

```bash
cd frontend
npm run build
npm start
```

---

## Common Tasks

### Inspecting the database

```bash
# Docker Compose running
docker compose exec mongodb mongosh freshkitchen

# Useful queries
db.users.find()
db.orders.find({ status: "pending" })
db.menus.find({ week_start: "2024-11-04" })
```

### Resetting the database

```bash
docker compose exec mongodb mongosh freshkitchen --eval "db.dropDatabase()"
docker compose restart mongodb
# mongo-init/init.js will re-run and re-seed the database
```

### Viewing backend logs

```bash
make logs
# or for just the backend
docker compose logs -f backend
```

### Rebuilding after dependency changes

```bash
# Go dependency change
cd backend && go mod tidy
make up-build

# npm dependency change
cd frontend && npm install
make up-build
```
