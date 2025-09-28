# Decisions

- Stack: Next.js 14 App Router (app directory), TypeScript, Tailwind CSS, Contentlayer/MDX.
- Frontend libs already present: React Three Fiber / drei, React Hook Form, Zod, Recharts.
- Assumption: introduce Zustand for simulation state (not previously in repo).
- Assumption: simulation sandbox will live at /sim under the app router.
- Assumption: preset share links will use lz-string compression in the query param p.
- Decision: Preset saving and last-run state persist in localStorage under the vehicleLab:* key namespace.
- Decision: Simulation worker falls back to a main-thread runner when Web Workers are not available, with a UI banner.
- Decision: Baseline validation executes synchronously on the client using the shared model registry.
