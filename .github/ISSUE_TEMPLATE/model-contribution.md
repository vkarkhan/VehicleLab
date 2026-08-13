---
name: Model contribution
description: Propose a new vehicle-dynamics model or a material physics change
title: "[Model] "
labels: []
assignees: []
---

## Engineering objective

What physical behavior, manoeuvre, or research/teaching need should this model address?

## Governing equations

Provide the equations or link to a citable reference. Map symbols to proposed implementation variables where possible.

## Assumptions and validity range

Examples: small-angle approximation, constant longitudinal speed, rigid body, linear tyre region, planar motion, quasi-static load transfer.

## Coordinates and sign conventions

State axes, positive rotations, steering sign, force/moment signs, and any deviations from the repository conventions.

## Parameters, states, inputs, outputs, and units

Use SI units internally. List every quantity that will cross the model API.

## Numerical method

Describe integration/solver approach, expected time-step range, singularities, guards, clamps, and known numerical limitations.

## Reference / provenance

Cite the textbook, paper, standard, dataset, analytical derivation, or independently reproducible reference result. Include licensing/redistribution information for data.

## Validation plan

What will prove the implementation is correct? Include expected values/curves/invariants and proposed absolute or relative tolerances.

## Proposed scenarios

Which deterministic manoeuvres should exercise the model?

## Known limitations

What should users explicitly not infer from this model?

## Implementation sketch

Which files/modules would be added or changed? Keep physics kernels independent of auth, payments, analytics, databases, or VehicleLab Studio services.