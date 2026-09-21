# Ladakh Vacation — Main Website

The public-facing marketing site at **ladakhvacation.in**. Sits alongside the
CRM (`/frontend`) and API (`/backend`) in this monorepo; unrelated to the
Google Ads landing pages at `go.ladakhvacation.in` (that's the PHP site in
`C:\xampp\htdocs\glitzzz`, indexed off).

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4 (CSS-first tokens in `globals.css`)
- Fraunces (display) + Inter (body) via `next/font/google`
- Deploys to Vercel

## Local dev

```bash
cd web
npm install
npm run dev   # http://localhost:3002
```

## Environment

Optional:

- `NEXT_PUBLIC_LEAD_CAPTURE_URL` — override the CRM webhook. Defaults to the
  Render production URL.

## Deploy notes

- Vercel: set the project **Root Directory** to `web`.
- Build command: `next build`. Output: `.next`. Node ≥ 20.
- Domain: point `ladakhvacation.in` and `www.ladakhvacation.in` to the Vercel
  deployment. Ads sub-domain `go.ladakhvacation.in` stays on cPanel.
