# web_project_template

A minimal full-stack starter template with a Bun-powered API and an Astro + Svelte frontend, wired up with cookie-based JWT authentication and Postgres via Drizzle ORM.

## Stack

- **API** (`packages/api`): [Bun](https://bun.sh) + [Hono](https://hono.dev) + [Drizzle ORM](https://orm.drizzle.team) + Postgres
- **Web** (`packages/web`): [Astro](https://astro.build) (server output) + [Svelte 5](https://svelte.dev) + [Tailwind CSS v4](https://tailwindcss.com)
- **Database**: Postgres 17
- **Auth**: JWT stored in an httpOnly cookie, verified on the API side
  The `web` app proxies any request to `/api/*` through to the internal `api` service, so the browser only ever talks to `web`.

## Prerequisites

- [Bun](https://bun.sh) v1.x installed locally (only needed for local, non-Docker development)
- [Docker](https://www.docker.com/) and Docker Compose (recommended — this is the easiest way to run everything)

## Quick start (Docker)

This is the fastest way to get the whole stack — database, API, and web app — running together.

1. **Clone the repo**
```bash
   git clone https://github.com/AingeruAlvarezSanchez/web_project_template.git
   cd web_project_template
```

2. **Set required environment variables**
   Docker Compose needs a `JWT_SECRET` at minimum. You can export it inline or create a `.env` file in the project root:
```bash
   echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
```

Optional variables (defaults shown) can also go in that `.env` file:

```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=app
   JWT_SECRET=replace-me-with-a-long-random-string
```

3. **Build and start everything**
```bash
   docker compose up --build
```

This starts three services:
- `db` — Postgres, with a health check
- `api` — runs pending database migrations, then starts the Hono server (internal only, not exposed to your host)
- `web` — builds and serves the Astro app

4. **Open the app**
   Visit [http://localhost:4321](http://localhost:4321). You should see a status indicator confirming the web app can reach the API, plus a small counter demo.
   To stop everything: `docker compose down` (add `-v` to also wipe the database volume).

## Running locally without Docker

If you'd rather run things directly with Bun (e.g. for faster iteration on code), you'll need your own Postgres instance running.

1. **Install dependencies** (from the repo root — this is a Bun workspace):
```bash
   bun install
```

2. **Configure environment variables**
   Each package has a `.env.example` file — copy it to `.env` and fill in real values.
```bash
   cp packages/api/.env.example packages/api/.env
   cp packages/web/.env.example packages/web/.env
```

`packages/api/.env`:
```env
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/app
   JWT_SECRET=replace-me-with-a-long-random-string
   NODE_ENV=development
```

`packages/web/.env`:
```env
   INTERNAL_API_URL=http://localhost:3000
```

3. **Start Postgres** (if you don't already have one), for example with Docker on its own:
```bash
   docker run -d --name web-template-db \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=app \
     -p 5432:5432 \
     postgres:17-alpine
```

4. **Run database migrations**
```bash
   bun run db:migrate
```

5. **Start the API** (in one terminal):
```bash
   bun run dev:api
```

Runs on `http://localhost:3000`.

6. **Start the web app** (in another terminal):
```bash
   bun run dev:web
```

Runs on `http://localhost:4321`.

## Project structure

```
.
├── docker-compose.yml
├── package.json              # Bun workspace root
└── packages/
    ├── api/                  # Hono + Drizzle backend
    │   ├── src/
    │   │   ├── db/           # Drizzle schema, migrations, db client
    │   │   ├── middleware/   # JWT auth middleware
    │   │   ├── routes/       # /auth/* endpoints
    │   │   └── index.ts      # App entrypoint
    │   └── drizzle.config.ts
    └── web/                  # Astro + Svelte frontend
        └── src/
            ├── components/   # Svelte components
            ├── pages/        # Astro pages + API proxy route
            └── middleware.ts # Security headers
```

## API reference

All auth routes live under `/auth` on the API service (proxied through `web` at `/api/auth/*` in the browser).

| Method | Path             | Description                         | Auth required |
|--------|------------------|-------------------------------------|---------------|
| POST   | `/auth/register` | Create a new user, sets auth cookie | No            |
| POST   | `/auth/login`    | Log in, sets auth cookie            | No            |
| POST   | `/auth/logout`   | Clears the auth cookie              | No            |
| GET    | `/auth/me`       | Returns the current user            | Yes           |

Register/login expect a JSON body:

```json
{ "email": "you@example.com", "password": "at-least-8-characters" }
```

## Useful scripts

Run from the repo root:

| Command               | Description                      |
|-----------------------|----------------------------------|
| `bun run dev:api`     | Start the API in watch mode      |
| `bun run dev:web`     | Start the Astro dev server       |
| `bun run db:generate` | Generate a new Drizzle migration |
| `bun run db:migrate`  | Apply pending migrations         |

From `packages/api`, you can also run `bun run db:studio` to open Drizzle Studio and browse the database.

## Testing

Tests use Bun's built-in test runner (`bun:test`) — no extra dependency.

```bash
bun test              # everything (from repo root)
bun run test:api      # packages/api only
bun run test:web      # packages/web only
```

The `packages/api/src/routes/auth.test.ts` suite hits a real Postgres via `DATABASE_URL`, same as the app itself — point it at a migrated database before running (e.g. the standalone Postgres from step 3 above, migrated with `bun run db:migrate`). Middleware and web-proxy tests need no database.

If you're running the stack with `docker compose up` instead, `db` isn't published to the host (only `api` can reach it), so `bun test` from the host can't connect. Run tests inside the `api` container instead, where `DATABASE_URL` and the network route are already set up:

```bash
bun run test:docker   # docker compose exec api bun test
```

## Environment variables

| Variable            | Used by        | Description                                                                  |
|---------------------|----------------|------------------------------------------------------------------------------|
| `DATABASE_URL`      | api            | Postgres connection string                                                   |
| `JWT_SECRET`        | api            | Secret used to sign/verify auth JWTs — set this to something long and random |
| `NODE_ENV`          | api            | `development` or `production` (affects cookie `secure` flag)                 |
| `INTERNAL_API_URL`  | web            | URL the web app uses to reach the API internally                             |
| `POSTGRES_USER`     | docker-compose | Postgres username (default: `postgres`)                                      |
| `POSTGRES_PASSWORD` | docker-compose | Postgres password (default: `postgres`)                                      |
| `POSTGRES_DB`       | docker-compose | Postgres database name (default: `app`)                                      |

## Notes

- This is a bare-bones template intended as a starting point, not a finished product — expect to add rate limiting, CSRF protection, and additional data models as your project grows.
- No CI configuration is included yet.
