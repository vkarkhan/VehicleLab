# VehicleLab Open

[![CI](https://github.com/vkarkhan/VehicleLab/actions/workflows/ci.yml/badge.svg)](https://github.com/vkarkhan/VehicleLab/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![Node 22](https://img.shields.io/badge/Node-22.x-43853d?logo=node.js)](.nvmrc) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](apps/web/package.json)

**VehicleLab Open** is a local-first, open-source vehicle-dynamics simulation and validation toolkit for engineers, researchers, students, educators, and community contributors. Clone it, inspect the equations, reproduce the reference tests, add models, fork it for research, or self-host it. No cloud account or hosted service is required for the core simulation workflow.

> **Ecosystem boundary:** this repository is the MIT-licensed community toolkit. It is intentionally distinct from **VehicleLab Studio**, a separate private, proprietary, professionally hosted product. Commercial hosting, managed collaboration, premium workflows, billing, customer accounts, and other SaaS capabilities belong to VehicleLab Studio—not VehicleLab Open. The MIT license covers code in this repository; the VehicleLab name and branding are reserved separately. See [TRADEMARKS.md](TRADEMARKS.md).

## Why VehicleLab Open

Vehicle-dynamics code is most useful when its assumptions are visible. VehicleLab Open therefore treats **equations, units, sign conventions, numerical behavior, and validation evidence as first-class artifacts** rather than implementation details.

The current toolkit provides browser-based simulation, deterministic reference manoeuvres, analytical comparisons, exportable telemetry, model documentation, and automated physics checks. The emphasis is reproducibility and extensibility rather than SaaS features.

## Model catalogue

| Model / capability | Purpose | Implementation | Validation status |
|---|---|---|---|
| Linear 2-DOF bicycle model | Lateral/yaw response and handling studies | `apps/web/lib/models/lin2dof.ts` | Reference scenarios + theory comparisons |
| Unicycle model | Planar kinematic trajectory studies | `apps/web/lib/models/unicycle.ts` | Model tests |
| Lateral force / friction envelope | Axle force limiting and grip studies | `apps/web/lib/vehicle/` | Invariant/guard tests |
| Canonical manoeuvres | Skidpad, step steer, frequency sweep, ramp-to-limit | `apps/web/lib/scenarios/canonical/` | Deterministic checks |

See [`/docs/models`](apps/web/content/models) for model notes and [`/docs/tests`](apps/web/content/tests) for reference-test descriptions.

## Governing equations and conventions

Vehicle coordinates follow the common SAE-style body frame used by this project:

- **x:** forward
- **y:** driver left
- **z:** up
- positive yaw `ψ`: counter-clockwise viewed from above
- yaw rate: `r = dψ/dt`
- SI units are used internally unless a model document explicitly states otherwise
- angles are radians internally; UI conversions must be identified at the boundary

For the linear bicycle model, small-angle lateral dynamics are represented by the coupled lateral-velocity/yaw equations, with linear tyre forces derived from front and rear slip angles. Exact equations, parameter definitions, assumptions, and implementation mapping belong in each model's documentation; contributors must update them when changing physics.

Canonical convention definitions live in `apps/web/lib/vehicle/conventions.ts`. Analytical reference implementations live in `apps/web/lib/theory/`.

## Validation matrix

| Evidence | What it checks | Location |
|---|---|---|
| Physics invariants | symmetry, bounds and physical consistency | `tests/invariants.spec.ts` |
| Guard tests | invalid/nonphysical operating conditions | `tests/guards.spec.ts` |
| Time-step stability | numerical sensitivity to integration step | `tests/dt_stability.spec.ts` |
| Theory comparison | numerical result vs analytical prediction | `tests/theory_compare.spec.ts` |
| Model tests | model-level behavior | `apps/web/tests/models.spec.ts` |
| Baseline tests | deterministic regression baselines | `apps/web/tests/baseline.spec.ts` |
| Simulation E2E | browser workflow | `apps/web/tests/sim.spec.ts` |

A model is not considered mature merely because it runs. New physics should arrive with equations, units, assumptions, a reference case, and an automated validation test. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Local quickstart

### Requirements

- Node.js 22.x (`.nvmrc` pins the supported version)
- npm

```bash
git clone https://github.com/vkarkhan/VehicleLab.git
cd VehicleLab
nvm use
npm install
npm run dev
```

Open `http://localhost:3000/sim`.

**Core simulation requires no cloud database, authentication provider, payment processor, analytics service, or API key.** Legacy SaaS scaffolding is being removed from the open edition; see the roadmap below. If a development path still asks for unrelated service credentials, please file an issue.

Run the verification suite with:

```bash
npm test
```

Additional project scripts are documented in `package.json` and `apps/web/package.json`.

## Architecture

```text
Browser UI
   |
   +-- scenario/configuration layer
   |      `apps/web/lib/scenarios/`
   |
   +-- simulation registry + runner
   |      `apps/web/lib/sim/`
   |             |
   |             +-- Web Worker (`apps/web/workers/simWorker.ts`)
   |
   +-- vehicle/model kernels
   |      `apps/web/lib/models/`
   |      `apps/web/lib/vehicle/`
   |
   +-- analytical references
   |      `apps/web/lib/theory/`
   |
   +-- validation
          `apps/web/lib/validation/`
          `tests/`
```

The intended dependency direction is **UI → scenario/runner → model kernel**, while theory and validation independently challenge model outputs. Physics code should not depend on authentication, payments, analytics, or hosted infrastructure.

## Contributing

Contributions are welcome from engineers, researchers, educators, and students. A physics/model contribution must include:

1. governing equations and assumptions;
2. every parameter/state/output with SI units;
3. coordinate and sign conventions;
4. provenance for reference data or literature equations;
5. at least one automated validation or invariant test;
6. documented numerical tolerances and why they are reasonable.

Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the [model contribution template](.github/ISSUE_TEMPLATE/model-contribution.md).

## Roadmap

**Open-edition cleanup**
- remove dormant authentication, account, pricing, paywall, Stripe/Razorpay, Prisma database and analytics scaffolding;
- simplify local startup so simulation and documentation have no service dependencies;
- tighten CI around build, type checking, tests and physics validation.

**Physics and validation**
- strengthen model-specific equation sheets and parameter tables;
- add traceable literature/reference datasets and tolerances;
- expand tyre, longitudinal, ride/suspension and higher-DOF model coverage;
- add reproducible benchmark bundles and machine-readable validation reports.

**Community engineering**
- stable model/plugin contract;
- documented data import/export schema;
- contributor examples and teaching notebooks;
- tagged releases and semantic changelog discipline.

The roadmap is directional, not a promise of commercial VehicleLab Studio features.

## Project governance and security

- [CONTRIBUTING.md](CONTRIBUTING.md) — engineering and review standards
- [SECURITY.md](SECURITY.md) — responsible vulnerability reporting
- [CHANGELOG.md](CHANGELOG.md) — notable public-edition changes
- [TRADEMARKS.md](TRADEMARKS.md) — MIT code vs reserved branding
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — community expectations

## License and branding

Source code in this repository is licensed under the [MIT License](LICENSE), copyright © 2025–2026 Varad A. Karkhanis and contributors.

The MIT license grants rights to the software; it does **not** grant rights to use VehicleLab names, logos, product identity, or other brand assets as the name or branding of a derived product. See [TRADEMARKS.md](TRADEMARKS.md).

---

VehicleLab Open is for engineering, research, and education. Validate models against appropriate references before using results for safety-critical, regulatory, or production decisions.