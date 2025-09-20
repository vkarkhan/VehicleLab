# VehicleLab – Local Dev Audit

## Repository Overview
```
.
├── apps
│   └── web
│       ├── app/               # Next.js App Router routes & layouts
│       ├── components/        # UI building blocks (incl. new ping button)
│       ├── content/           # MDX sources for blog/guides (Contentlayer)
│       ├── data/              # SQLite database location
│       ├── lib/               # Auth, contentlayer helpers, payments, prisma
│       ├── prisma/            # Prisma schema & migrations
│       ├── scripts/           # Lighthouse helper
│       ├── styles/            # Tailwind stylesheets
│       ├── contentlayer.config.ts
│       ├── next.config.mjs
│       ├── package.json
│       └── tailwind.config.ts
├── docs/
│   └── AUDIT.md
├── .env.example
├── .env.local.example
├── .nvmrc
├── package.json               # Workspace orchestration
└── README.md
```

## Detected Stack
- **Frontend:** Next.js 14 App Router, React 18, Tailwind CSS, Framer Motion.
- **3D/Visualisation:** three.js via `@react-three/fiber` and `@react-three/drei`.
- **Content:** Contentlayer 0.3 (MDX with `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`).
- **Auth & Data:** NextAuth (v5 beta) with Prisma ORM targeting SQLite, optional Stripe/Razorpay integrations.
- **Tooling:** TypeScript 5, ESLint (Next config), Playwright, Tailwind Typography.

## NPM Scripts
### Root (`package.json`)
- `dev:web` – Runs `next dev` inside `@app/web`.
- `dev:api` – Placeholder (Next.js handles API routes; prints note for clarity).
- `dev` – Parallel runner combining `dev:web` and the API placeholder via `npm-run-all`.
- `build` – Builds the Next.js app (`next build`).
- `start` – Starts the production Next.js server (`next start`).

### Web App (`apps/web/package.json`)
- `predev` – Pre-build Contentlayer cache so `next dev` boots cleanly.
- `dev` – Next.js dev server with HMR.
- `prebuild` – Rebuilds Contentlayer content for CI/builds.
- `build` – Next.js production build.
- `start` – Next.js production start.
- `lint` – `next lint` (ESLint with Next rules).
- `typecheck` – TypeScript in `--noEmit` mode.
- `test` – Playwright test suite.
- `content` – Manual Contentlayer build helper.
- `prepare` – `prisma generate` for generating the client.
- `lighthouse` – Runs the Lighthouse helper script.

## Environment Variables
| Variable | Purpose |
| --- | --- |
| `NEXTAUTH_URL` | Base URL for NextAuth callbacks (defaults to localhost in dev).
| `NEXTAUTH_SECRET` | Secret for NextAuth session JWT.
| `RESEND_API_KEY` | Email delivery via Resend (optional).
| `DATABASE_URL` | Prisma SQLite connection string (`file:./apps/web/data/app.db`).
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Optional analytics domain for Plausible.
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Feature flag to toggle analytics in the UI.
| `NEXT_PUBLIC_ENABLE_ADS` | Feature flag for rendering the ad slot component.
| `PAYMENT_REGION_AUTO` | Controls automatic payment region detection.
| `DEFAULT_CURRENCY` | Currency fallback used on pricing pages.
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | Stripe credentials for checkout.
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification secret.
| `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_YEARLY` / `STRIPE_PRICE_LIFETIME` | Stripe price IDs surfaced in the UI.
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay API credentials.
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook verification secret.
| `RAZORPAY_PLAN_PRO_MONTHLY` / `RAZORPAY_PLAN_PRO_YEARLY` | Razorpay plan IDs surfaced in the UI.
| `LHCI_URL` | Optional URL override for the Lighthouse helper script.
| `PLAYWRIGHT_BASE_URL` | Overrides Playwright test target (default `http://127.0.0.1:3000`).
| `CI` | Standard CI flag consumed by Playwright for retries/workers.

## Local Dev Blockers Observed
1. **Contentlayer on `postinstall`:** The original setup ran `contentlayer build` on `postinstall`, which often fails on clean installs when the repo is not yet bootstrapped. *Mitigation:* moved into `predev`/`prebuild` scripts so installs stay side-effect free.
2. **Monolithic layout:** Everything lived at the repo root. Introduced an npm workspace (`apps/web`) to better separate concerns and prepare for additional services.
3. **Missing health-check route:** Added `/api/ping` route handler for sanity checks.
4. **No API wiring demo:** Added a client-side ping button on the homepage to exercise the new route.
5. **Environment samples:** Added `.env.example` mirroring `.env.local.example` so secrets are never committed, with paths updated for the new workspace layout.
6. **Registry hiccups in container:** Current environment returns `403` for `npm-run-all`. Local developers should ensure their npm registry points to `https://registry.npmjs.org/` (see README troubleshooting) — installs should succeed outside the restricted container.

## Recommended Local Workflow
1. `nvm use` (Node 22.9.0 per `.nvmrc`).
2. `npm install` at the repo root (will install workspaces, generating `node_modules` and `package-lock.json`).
3. `cp .env.example .env.local` and adjust credentials as needed.
4. `npm run dev` to start the Next.js dev server (includes API routes). Visit `http://localhost:3000` and click “Call /api/ping” on the homepage to confirm end-to-end wiring.
