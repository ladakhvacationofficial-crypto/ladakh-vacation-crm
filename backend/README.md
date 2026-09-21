# Ladakh Vacation CRM — Backend

NestJS + Prisma + PostgreSQL. No Docker. DB on Supabase, deploy on Render.

## Phase 1 (this build)
Bootable skeleton: config, Prisma, health check, User+Role schema, git.

Milestone: `npm run start:dev` runs and `GET /api/health` returns ok.

## Setup

1. Copy env and fill in your Supabase connection string:

   cp .env.example .env
   # edit .env -> DATABASE_URL

   In Supabase: Project Settings -> Database -> Connection string (URI).
   Use the pooled URI (port 6543) with ?pgbouncer=true for the app.

2. Generate the Prisma client and run the first migration:

   npm run prisma:generate
   npm run prisma:migrate -- --name init

   (Migrations need the DIRECT connection, port 5432. If the pooled URL
   fails on migrate, temporarily set DATABASE_URL to the 5432 URI, migrate,
   then switch back to 6543 for running the app.)

3. (Optional) create the owner account:

   npx prisma db seed

4. Run it:

   npm run start:dev
   # open http://localhost:3000/api/health

## Deploy

- Push this repo to GitHub.
- Supabase: your Postgres is already live.
- Render: New + -> Blueprint -> select the repo (uses render.yaml).
  Set DATABASE_URL in the Render dashboard to your Supabase URI.

## Roadmap
- Phase 2: Auth + Users + Roles
- Phase 3: Leads (attribution + scoring) + Activity timeline
- Phase 4: CRM pipeline + Vendors
- Phase 5: Quotation + Booking
- Phase 6: Next.js frontend
