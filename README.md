# Fresh Kitchen

A full-stack homemade meal booking platform. Customers browse weekly menus and place orders; admins manage menus, schedules, announcements, and analytics.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Backend | Go 1.26, Goa v3 (design-first framework) |
| Database | MongoDB 7 |
| Auth | Google OAuth 2.0 + NextAuth.js |
| Payments | Stripe (optional) |
| Deployment | Docker Compose |

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A Google OAuth app (Client ID + Secret) — [create one here](https://console.cloud.google.com/apis/credentials)

### 1. Clone and configure

```bash
git clone https://github.com/ameena3/vagrant.git
cd vagrant
make setup          # copies .env.example → .env
```

Edit `.env` and fill in your credentials:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=any_random_32_char_string
```

> **No Google account?** Set `DEV_AUTH_BYPASS=true` and `NEXT_PUBLIC_DEV_AUTH_BYPASS=true` in `.env` to skip OAuth entirely and auto sign-in as a local dev admin. Never enable this in production.

### 2. Start all services

```bash
make up-build       # build images and start
make logs           # tail logs
make health         # verify backend is up
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| MongoDB | localhost:27017 |

### 3. First login

Sign in with Google at http://localhost:3000. The first user to sign in is automatically granted admin access.

## Project Structure

```
vagrant/
├── backend/                 # Go/Goa API server
│   ├── cmd/freshkitchen/   # Entry point (main.go, http.go)
│   ├── design/             # Goa DSL API contracts
│   ├── gen/                # Goa-generated code (do not edit)
│   ├── services/           # Business logic
│   ├── store/              # MongoDB data access layer
│   └── middleware/         # Auth & admin middleware
├── frontend/               # Next.js application
│   └── src/
│       ├── app/            # Pages (App Router)
│       ├── components/     # React components
│       ├── lib/            # API client, auth config, utilities
│       └── types/          # TypeScript interfaces
├── mongo-init/             # MongoDB init script (collections, indexes, seed)
├── docker-compose.yml
├── Makefile
└── .env.example
```

## Development

### Docker workflow (recommended)

```bash
make up             # start services (no rebuild)
make up-build       # rebuild images and start
make down           # stop all services
make logs           # tail all logs
make health         # GET /health on backend
```

### Local development (without Docker)

**Backend** — requires MongoDB running locally on port 27017:

```bash
cd backend
go mod tidy
go run ./cmd/freshkitchen
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev         # http://localhost:3000
```

### Regenerating Goa code

After editing files in `backend/design/`:

```bash
cd backend
goa gen freshkitchen
```

## API Overview

All protected endpoints require an `Authorization: Bearer {googleIdToken}` header.

| Service | Endpoints |
|---------|-----------|
| Menu | `GET /api/menus/week/{weekStart}`, `POST/DELETE /api/admin/menus` |
| Orders | `POST /api/orders`, `GET /api/orders/{id}`, `GET /api/admin/orders` |
| Schedule | `GET /api/schedule/week/{weekStart}`, `PUT /api/admin/schedule/*` |
| Announcements | `GET /api/announcements`, `POST/PUT/DELETE /api/admin/announcements` |
| Admin Users | `GET/POST/DELETE /api/admin/users` |
| Analytics | `GET /api/admin/analytics/*` |
| Utility | `GET /health`, `GET /uploads/*` |

See [docs/api.md](docs/api.md) for full endpoint reference.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | System design, request flow, component breakdown |
| [docs/api.md](docs/api.md) | Full API reference with request/response schemas |
| [docs/database.md](docs/database.md) | MongoDB schema, collections, and indexes |
| [docs/deployment.md](docs/deployment.md) | Docker setup, environment variables, production guide |
| [docs/development.md](docs/development.md) | Local dev setup, Goa code generation, adding features |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEV_AUTH_BYPASS` | No | Skip Google OAuth for local dev — auto sign-in as `dev@localhost` admin. Never use in production. |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS` | No | Client-side flag matching `DEV_AUTH_BYPASS` |
| `GOOGLE_CLIENT_ID` | Yes* | Google OAuth client ID (*not needed when `DEV_AUTH_BYPASS=true`) |
| `GOOGLE_CLIENT_SECRET` | Yes* | Google OAuth client secret (*not needed when `DEV_AUTH_BYPASS=true`) |
| `NEXTAUTH_SECRET` | Yes | NextAuth.js session signing secret |
| `NEXTAUTH_URL` | Yes | Public URL of the frontend (`http://localhost:3000` for local) |
| `MONGO_URI` | No | MongoDB connection string (default: `mongodb://mongodb:27017/freshkitchen`) |
| `STRIPE_ENABLED` | No | Enable Stripe payments (`true`/`false`, default: `false`) |
| `STRIPE_PUBLISHABLE_KEY` | If Stripe | Stripe publishable key |
| `STRIPE_SECRET_KEY` | If Stripe | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | If Stripe | Stripe webhook signing secret |

## License

MIT
