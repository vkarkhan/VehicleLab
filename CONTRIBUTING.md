# Contributing to VehicleLab Open

Thanks for helping improve VehicleLab Open. This project welcomes contributions from vehicle-dynamics engineers, controls engineers, software developers, researchers, educators, and students.

## Engineering principles

1. **Physics is reviewable.** Governing equations, assumptions, units, frames, signs, and approximations must be documented.
2. **Validation is part of the feature.** A new model without a reference case or invariant is incomplete.
3. **SI internally.** Keep model kernels in SI units. UI/display conversions belong at explicit boundaries.
4. **Determinism matters.** Reference scenarios should be reproducible from a clean checkout.
5. **Keep the kernel infrastructure-independent.** Physics/model code must not require authentication, payments, analytics, cloud databases, or proprietary services.
6. **Prefer small, inspectable changes.** Separate physics changes from unrelated UI/refactoring changes when practical.

## Development setup

```bash
git clone https://github.com/vkarkhan/VehicleLab.git
cd VehicleLab
nvm use
npm install
npm run dev
```

Run the automated suite before opening a pull request:

```bash
npm test
```

Also run build/type/lint commands relevant to the files you changed.

## Physics/model contribution checklist

A pull request that adds or materially changes a model should include all of the following:

- **Purpose and scope:** what physical behavior the model represents and what it intentionally does not represent.
- **Governing equations:** written in the model documentation, with symbols mapped to implementation variable names.
- **Assumptions:** e.g. small-angle, constant longitudinal speed, rigid body, linear tyre region, quasi-static load, planar motion.
- **Coordinate frame and signs:** axes, positive rotation directions, steering sign, force sign, moment sign.
- **Units:** SI unit for every parameter, state, input, and output. State explicitly if a dimensionless quantity is used.
- **Parameter validity:** allowed ranges and nonphysical values that must be rejected or guarded.
- **Numerics:** integrator/solver behavior, time-step expectations, singularities, clamps, and known stability limits.
- **Reference provenance:** textbook, paper, standard, trusted dataset, independently derived analytical result, or another reproducible source.
- **Validation case:** at least one automated test with expected result and tolerance.
- **Tolerance rationale:** why the chosen absolute/relative tolerance is physically and numerically justified.

## Validation expectations

Choose the strongest applicable evidence, preferably more than one: closed-form or analytical comparison; limiting-case/invariant test; symmetry or sign test; dimensional/unit sanity check; time-step convergence/stability test; comparison with published reference data; deterministic regression baseline.

Do not tune a tolerance merely until CI becomes green. If a tolerance changes, explain the physical or numerical reason in the pull request.

For imported reference data, document the source, license/permission where applicable, preprocessing, units, and any digitization or normalization steps. Do not commit third-party data unless its license permits redistribution.

## Code organization

- `apps/web/lib/models/` — model kernels
- `apps/web/lib/vehicle/` — shared vehicle-dynamics utilities/conventions
- `apps/web/lib/scenarios/` — reproducible manoeuvres and inputs
- `apps/web/lib/theory/` — analytical/reference calculations
- `apps/web/lib/validation/` — validation runners/baselines
- `tests/` and `apps/web/tests/` — automated checks
- `apps/web/content/models/` — model documentation
- `apps/web/content/tests/` — reference-test documentation

Keep UI formatting/conversion concerns out of physics kernels. Avoid hidden unit conversions.

## Pull requests

Use a descriptive title. Explain the engineering problem, what changed, equations/assumptions affected, validation performed and results, and known limitations or follow-up work.

Screenshots are useful for UI changes, but plots or numerical tables are more useful for physics changes. A plot alone is not a validation criterion unless expected behavior and tolerance are stated.

## Scope boundary

VehicleLab Open is the community, MIT-licensed toolkit. Do not add dependencies on private VehicleLab Studio services, credentials, customer systems, billing, hosted collaboration, or other proprietary infrastructure. Open-edition functionality should remain locally runnable.

## License and provenance

By contributing, you agree that your contribution will be distributed under the repository's MIT License. Only contribute code, equations, documentation, and data that you have the right to contribute. Preserve required third-party attribution.

The VehicleLab name and branding are governed separately from the MIT software license; see `TRADEMARKS.md`.

Follow `CODE_OF_CONDUCT.md`. Report security vulnerabilities through `SECURITY.md`, not public issues.