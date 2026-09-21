# Ladakh Vacation — frontend

Next 16 + Tailwind v4 + ECharts. Talks to the NestJS backend.

## Run

    cp .env.local.example .env.local     # point at your backend
    npm install
    npm run dev                          # http://localhost:3001

The backend runs on :3000, so this dev server uses :3001.

## Deploy (Vercel)

Import the repo, set **Root Directory** to `frontend`, and set
`NEXT_PUBLIC_API_URL` to your Render backend URL (including `/api`).

## Design rules

- Colour is reserved for financial meaning. Never use it decoratively.
- All numbers use `.tabular` (Geist Mono, tabular figures).
- Currency goes through `money()` in `src/lib/format.ts` for lakh/crore grouping.
- Margin bands live in `marginHealth()` — one place, used everywhere.
