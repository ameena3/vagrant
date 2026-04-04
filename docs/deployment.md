# Deployment

## Docker Compose (default)

All three services — frontend, backend, and MongoDB — are orchestrated by `docker-compose.yml`.

### First-time setup

```bash
make setup        # copies .env.example → .env
# edit .env with your credentials
make up-build     # builds images and starts all services
```

### Day-to-day commands

```bash
make up           # start without rebuilding
make up-build     # rebuild images and start (use after code changes)
make down         # stop all services
make logs         # tail all service logs
make health       # GET /health on the backend
```

### Service ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js web app |
| Backend | 8080 | Go/Goa API server |
| MongoDB | 27017 | Database (exposed to host for local tooling) |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values before starting.

### Required

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID (not required when `DEV_AUTH_BYPASS=true`) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret (not required when `DEV_AUTH_BYPASS=true`) |
| `NEXTAUTH_SECRET` | Random secret used to sign NextAuth.js session JWTs. Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Public URL of the frontend. Use `http://localhost:3000` for local development. |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `DEV_AUTH_BYPASS` | `false` | Skip Google OAuth — auto sign-in as `dev@localhost` with admin role. **Never enable in production.** |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS` | `false` | Client-side counterpart to `DEV_AUTH_BYPASS` — must be set to the same value. |
| `MONGO_URI` | `mongodb://mongodb:27017/freshkitchen` | MongoDB connection string |
| `PORT` | `8080` | Backend server port |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend origin, used for CORS |
| `STRIPE_ENABLED` | `false` | Enable Stripe payment checkout |
| `STRIPE_PUBLISHABLE_KEY` | — | Stripe publishable key (`pk_test_...` or `pk_live_...`) |
| `STRIPE_SECRET_KEY` | — | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook signing secret (`whsec_...`) |

### Setting up Google OAuth

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** of type **Web application**
3. Add `http://localhost:3000` to **Authorized JavaScript origins**
4. Add `http://localhost:3000/api/auth/callback/google` to **Authorized redirect URIs**
5. Copy the **Client ID** and **Client Secret** into `.env`

For production, replace `localhost:3000` with your public domain.

### Setting up Stripe (optional)

1. Create a [Stripe account](https://dashboard.stripe.com/register)
2. From the Stripe Dashboard, copy your **Publishable key** and **Secret key**
3. Set `STRIPE_ENABLED=true` in `.env`
4. For webhooks, use the Stripe CLI to forward events locally:

```bash
stripe listen --forward-to localhost:8080/api/webhooks/stripe
```

Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

---

## Persistent Data

Docker Compose creates two named volumes:

| Volume | Mounted at | Description |
|--------|-----------|-------------|
| `mongo_data` | `/data/db` in mongodb container | MongoDB data files |
| `uploads` | `/app/uploads` in backend container | Menu images uploaded by admins |

To reset all data (including the database):

```bash
make down
docker volume rm vagrant_mongo_data vagrant_uploads
make up-build
```

---

## Production Considerations

### HTTPS / TLS

The Docker Compose setup does not include TLS termination. For production, place a reverse proxy (nginx, Caddy, Traefik) in front of the frontend service and terminate TLS there.

### Environment

- Set `NEXTAUTH_URL` to your public HTTPS domain (e.g., `https://freshkitchen.example.com`)
- Update `FRONTEND_URL` in the backend to the same domain (for CORS)
- Update Google OAuth authorized origins and redirect URIs to the public domain
- Use `MONGO_URI` to point to a managed MongoDB instance (e.g., MongoDB Atlas) instead of the local container for production workloads
- Ensure `DEV_AUTH_BYPASS=false` and `NEXT_PUBLIC_DEV_AUTH_BYPASS=false` (the defaults) — enabling these in production bypasses all authentication

### Resource limits

Add `deploy.resources.limits` to each service in `docker-compose.yml` to cap CPU and memory for your target host.

### Backups

MongoDB data lives in the `mongo_data` volume. Back it up with:

```bash
docker compose exec mongodb mongodump --db freshkitchen --out /data/backup
docker cp $(docker compose ps -q mongodb):/data/backup ./backup
```
