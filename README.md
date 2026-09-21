# Ladakh Vacation

Multi-app project. One git repo, deployed as two independent services.

```
glitz/
  backend/      NestJS + Prisma API        -> Render  (Root Directory: backend)
  frontend/     Next.js PWA (installable)  -> Vercel  (Root Directory: frontend)
  mobile/       reserved (Capacitor wrap of the web app, later)
  packages/
    shared/     reserved (shared TS types across apps)
```

Each app is self-contained — install and run inside its own folder
(`cd backend && npm run start:dev`). No workspace tooling yet; add Turborepo
later only if the project grows to need it.

## Backend — already working
```
cd backend
cp .env.example .env    # (already done — your Supabase URLs are set)
npm install             # (already done)
npm run start:dev       # http://localhost:3000/api/health
```

## Deploy
- Backend  -> Render:  New + -> Blueprint (backend/render.yaml). Root Directory = backend.
- Frontend -> Vercel:  Import repo. Root Directory = frontend.
- DB       -> Supabase (already live, Mumbai region).
