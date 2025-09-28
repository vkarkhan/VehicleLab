# VehicleLab

Local-first prototype workspace for VehicleLab, a Next.js sandbox focused on vehicle dynamics experimentation.

## Stack Overview
- **Web app:** Next.js 14 (App Router) with React 18 and Tailwind CSS.
- **Content:** MDX powered by Contentlayer (`remark-gfm`, `rehype-slug`, `rehype-autolink-headings`).
- **3D & viz:** `three`, `@react-three/fiber`, `@react-three/drei`.
- **Data/Auth:** Prisma (SQLite) + NextAuth v5 beta, optional Stripe/Razorpay hooks.
- **Tooling:** TypeScript 5, ESLint (Next rules), Playwright for browser tests.

API routes live inside the Next.js app (`app/api`). A `/api/ping` route and matching homepage button provide an end-to-end smoke test out of the box.

## Monorepo Layout
```
vehiclelab/
|-- apps/
|     \-- web/            # Next.js application (+ Prisma, Contentlayer, etc.)
|-- docs/AUDIT.md       # Audit report & local setup notes
|-- .env.example        # Copy to .env.local for development
|-- .nvmrc              # Node version pin (22.9.0)
\-- package.json        # npm workspace entry point
```

## Prerequisites
1. **Node.js:** Use the LTS 22.x line (`nvm use` will read `.nvmrc`).
2. **npm:** Version 10+ (ships with Node 22).
3. **SQLite:** Bundled with Node on macOS/Linux; Windows users can rely on Prisma's binary.

## Getting Started (Local SQLite)
```bash
nvm use
npm install
cp .env.local.example .env.local
# ensure: DATABASE_URL=file:./apps/web/data/app.db
npm run db:setup
npm run dev
```

Open <http://localhost:3000>, then click **"Call /api/ping"** on the homepage to verify the API handler responds.

Note: Postgres and provider-specific column types will return in a follow-up PR once local testing wraps up.

### Available Scripts
- `npm run dev` - Starts `@app/web` in dev mode (HMR + API routes).
- `npm run build` - Builds the Next.js app for production.
- `npm run start` - Runs the production build locally.
- `npm run db:setup` - Runs Prisma generate + push via the app workspace.
- `npm run dev -w @app/web` - Direct access to the web workspace.
- Within `apps/web`:
  - `npm run lint` - ESLint via `next lint`.
  - `npm run typecheck` - TypeScript diagnostics.
  - `npm run test` - Playwright tests (requires browsers installed).
  - `npm run content` - Regenerate Contentlayer output manually.
  - `npm run db:generate` - Regenerates the Prisma client.
  - `npm run db:push` - Applies the Prisma schema to the local SQLite file.
  - `npm run db:studio` - Opens Prisma Studio against the local database.

## Simulation Sandbox
- Visit `/sim` for the canvas-first sandbox. The top bar switches models and scenarios, while the right panel exposes schema-driven parameters grouped into "Basic" and "Advanced".
- Keyboard shortcuts: **Space** to run/pause, **R** to reset, number keys to swap scenarios instantly.
- Telemetry mini-plots live in the collapsible footer; a ring buffer (~20 000 samples) keeps memory stable.
- Share presets via the "Share" button (compressed into the `p` query param). Per-model docs live under `/docs/models/...` with one-click "Open in Sandbox" links.
- Baseline validation badges trigger headless checks (e.g. unicycle constant-radius skidpad) and surface pass/fail with numerical metrics.
- When Web Workers are unavailable the simulation loop falls back to a main-thread runner and displays a warning banner (expect higher CPU use).

## Environment Variables
All configuration lives in `.env.local`. Start from `.env.example` which documents every supported variable:

| Variable | Description |
| --- | --- |
| `NEXTAUTH_URL` | Base URL for auth callbacks (defaults to localhost). |
| `NEXTAUTH_SECRET` | Secret for NextAuth session handling. |
| `RESEND_API_KEY` | Optional email delivery key. |
| `DATABASE_URL` | Prisma connection string (`file:./apps/web/data/app.db`). |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Optional analytics domain. |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Toggle analytics widgets in the UI. |
| `NEXT_PUBLIC_ENABLE_ADS` | Toggle the ad slot component. |
| `PAYMENT_REGION_AUTO` | Controls server-side payment region logic. |
| `DEFAULT_CURRENCY` | Default currency for pricing pages. |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe credentials. |
| `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`, `STRIPE_PRICE_LIFETIME` | Stripe price IDs displayed in the UI. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay credentials. |
| `RAZORPAY_PLAN_PRO_MONTHLY`, `RAZORPAY_PLAN_PRO_YEARLY` | Razorpay plan IDs used on pricing. |
| `LHCI_URL` | Optional override when running the Lighthouse script. |
| `PLAYWRIGHT_BASE_URL` | Override the Playwright target URL. |

> Info Secrets are **not** committed. Keep your personal `.env.local` out of git.

## Troubleshooting
- **npm 403 / registry issues:** If `npm install` fails with `403 Forbidden`, reset the registry:
  ```bash
  npm config set registry https://registry.npmjs.org/
  npm cache clean --force
  npm install
  ```
  Corporate proxies may require additional configuration.
- **Contentlayer generation:** Installs no longer run Contentlayer automatically. `predev` and `prebuild` generate the cache when you run `npm run dev` or `npm run build`. You can run `npm run content -w @app/web` manually if needed.
- **Prisma/SQLite path:** The default SQLite file lives at `apps/web/data/app.db`. Delete it if you want a clean slate.
- **Windows shell:** VS Code defaults to Command Prompt via `.vscode/settings.json`. Switch to Git Bash if you prefer.

Happy hacking!
