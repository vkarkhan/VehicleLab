import { z } from "zod";
import type { ModelDef, SimInputs } from "../sim/core";
import {
  createVehicleParams,
  deriveLinearBicycleCoeffs,
  type LinearBicycleCoefficients,
  type VehicleParams,
} from "@/lib/vehicle/params";
import {
  computeSlipAndForces,
  type LateralForces,
  type SlipAngles,
} from "@/lib/vehicle/slipAndForces";
import { computeAy } from "@/lib/vehicle/ayYaw";
import { clampLateralForces } from "@/lib/vehicle/frictionClamp";
import { enforceDtBounds } from "@/lib/vehicle/dtGuards";

const schema = z
  .object({
    m: z
      .number()
      .min(200)
      .max(5000)
      .default(1500)
      .describe("Mass [kg]|basic"),
    Iz: z
      .number()
      .min(500)
      .max(10000)
      .default(2250)
      .describe("Yaw inertia [kg·m²]|basic"),
    a: z
      .number()
      .min(0.5)
      .max(2.5)
      .default(1.2)
      .describe("CG to front axle [m]|basic"),
    b: z
      .number()
      .min(0.5)
      .max(2.5)
      .default(1.6)
      .describe("CG to rear axle [m]|basic"),
    Cf: z
      .number()
      .min(1000)
      .max(300000)
      .default(80000)
      .describe("Front cornering stiffness [N/rad]|basic"),
    Cr: z
      .number()
      .min(1000)
      .max(300000)
      .default(80000)
      .describe("Rear cornering stiffness [N/rad]|basic"),
    v: z
      .number()
      .min(0)
      .max(80)
      .default(25)
      .describe("Forward speed [m/s]|basic"),
    mu: z
      .number()
      .min(0.1)
      .max(2)
      .default(1)
      .describe("Friction coefficient mu|advanced"),
    trackWidth: z
      .number()
      .min(1)
      .max(2.5)
      .default(1.6)
      .describe("Track width [m]|advanced"),
    hCg: z
      .number()
      .min(0.2)
      .max(1.2)
      .default(0.55)
      .describe("CG height [m]|advanced"),
    integrator: z
      .enum(["rk4", "semiImplicitEuler"])
      .default("rk4")
      .describe("Integrator|advanced"),
    dt: z
      .number()
      .min(0.002)
      .max(0.05)
      .default(0.01)
      .describe("Time step [s]|advanced"),
    useFrictionClamp: z
      .boolean()
      .default(false)
      .describe("Clamp lateral forces by mu|advanced"),
    processNoise: z
      .boolean()
      .default(false)
      .describe("Process noise|advanced"),
    noiseStd: z
      .number()
      .min(0)
      .max(2)
      .default(0.05)
      .describe("Process noise std|advanced"),
  })
  .describe("2-DOF linear bicycle model");

type Lin2DofParams = z.infer<typeof schema>;

type Lin2DofState = {
  vy: number;
  r: number;
  psi: number;
  x: number;
  y: number;
  vyDot: number;
  ay: number;
  slipFront: number;
  slipRear: number;
  FyFront: number;
  FyRear: number;
  frontLimited: number;
  rearLimited: number;
  vxEffective: number;
  dtClamped: number;
};

type StateDerivative = {
  vy: number;
  r: number;
  psi: number;
  x: number;
  y: number;
};

type StepDiagnostics = {
  slipAngles: SlipAngles;
  forces: LateralForces;
  vyDot: number;
  ay: number;
  limitFront: boolean;
  limitRear: boolean;
};

type BicycleContext = {
  vehicle: VehicleParams;
  coeffs: LinearBicycleCoefficients;
  frictionEnabled: boolean;
  processNoise: boolean;
  noiseStd: number;
  dtClamped: boolean;
};

const addNoise = (value: number, enabled: boolean, std: number) => {
  if (!enabled || std <= 0) {
    return value;
  }
  return value + (Math.random() * 2 - 1) * std;
};

const buildContext = (params: Lin2DofParams, dtClamped: boolean): BicycleContext => {
  const vehicle = createVehicleParams({
    m: params.m,
    Iz: params.Iz,
    a: params.a,
    b: params.b,
    Cf: params.Cf,
    Cr: params.Cr,
    mu: params.mu,
    track: params.trackWidth,
    hCg: params.hCg,
  });
  const coeffs = deriveLinearBicycleCoeffs(vehicle, params.v);
  return {
    vehicle,
    coeffs,
    frictionEnabled: params.useFrictionClamp,
    processNoise: params.processNoise,
    noiseStd: params.noiseStd,
    dtClamped,
  };
};

const derivatives = (
  state: Lin2DofState,
  inputs: SimInputs,
  ctx: BicycleContext,
  stochastic = false,
  diagnostics?: StepDiagnostics
): StateDerivative => {
  const delta = inputs.steer ?? 0;

  const slipResult = computeSlipAndForces(
    {
      vy: state.vy,
      r: state.r,
      vx: ctx.coeffs.vx,
      a: ctx.vehicle.a,
      b: ctx.vehicle.b,
      steer: delta,
    },
    { Cf: ctx.vehicle.Cf, Cr: ctx.vehicle.Cr }
  );

  let FyFront = slipResult.forces.front;
  let FyRear = slipResult.forces.rear;
  let limitFront = false;
  let limitRear = false;

  if (ctx.frictionEnabled) {
    const clampResult = clampLateralForces({
      FyFront,
      FyRear,
      params: ctx.vehicle,
    });
    FyFront = clampResult.front;
    FyRear = clampResult.rear;
    limitFront = clampResult.limitFlags.front;
    limitRear = clampResult.limitFlags.rear;
  }

  let vyDot = (FyFront + FyRear) / ctx.vehicle.m - ctx.coeffs.vx * state.r;
  let rDot = (ctx.vehicle.a * FyFront - ctx.vehicle.b * FyRear) / ctx.vehicle.Iz;

  if (stochastic && ctx.processNoise) {
    vyDot = addNoise(vyDot, true, ctx.noiseStd);
    rDot = addNoise(rDot, true, ctx.noiseStd);
  }

  const psiDot = state.r;
  const cosPsi = Math.cos(state.psi);
  const sinPsi = Math.sin(state.psi);
  const xDot = ctx.coeffs.vx * cosPsi - state.vy * sinPsi;
  const yDot = ctx.coeffs.vx * sinPsi + state.vy * cosPsi;

  if (diagnostics) {
    diagnostics.slipAngles = slipResult.angles;
    diagnostics.forces = { front: FyFront, rear: FyRear };
    diagnostics.vyDot = vyDot;
    diagnostics.ay = computeAy(ctx.coeffs.vx, state.r, vyDot);
    diagnostics.limitFront = limitFront;
    diagnostics.limitRear = limitRear;
  }

  return {
    vy: vyDot,
    r: rDot,
    psi: psiDot,
    x: xDot,
    y: yDot,
  };
};

const addScaled = (
  state: Lin2DofState,
  derivative: StateDerivative,
  scale: number
): Lin2DofState => ({
  ...state,
  vy: state.vy + derivative.vy * scale,
  r: state.r + derivative.r * scale,
  psi: state.psi + derivative.psi * scale,
  x: state.x + derivative.x * scale,
  y: state.y + derivative.y * scale,
});

const finalizeState = (
  state: Lin2DofState,
  deriv: StateDerivative,
  dt: number
): Lin2DofState => ({
  ...state,
  vy: state.vy + deriv.vy * dt,
  r: state.r + deriv.r * dt,
  psi: state.psi + deriv.psi * dt,
  x: state.x + deriv.x * dt,
  y: state.y + deriv.y * dt,
});

const postStep = (
  state: Lin2DofState,
  inputs: SimInputs,
  ctx: BicycleContext
): Lin2DofState => {
  const diagnostics: StepDiagnostics = {
    slipAngles: { front: state.slipFront, rear: state.slipRear },
    forces: { front: state.FyFront, rear: state.FyRear },
    vyDot: state.vyDot,
    ay: state.ay,
    limitFront: Boolean(state.frontLimited),
    limitRear: Boolean(state.rearLimited),
  };

  const deriv = derivatives(state, inputs, ctx, true, diagnostics);

  return {
    ...state,
    vyDot: deriv.vy,
    ay: diagnostics.ay,
    slipFront: diagnostics.slipAngles.front,
    slipRear: diagnostics.slipAngles.rear,
    FyFront: diagnostics.forces.front,
    FyRear: diagnostics.forces.rear,
    frontLimited: diagnostics.limitFront ? 1 : 0,
    rearLimited: diagnostics.limitRear ? 1 : 0,
    vxEffective: ctx.coeffs.vx,
    dtClamped: ctx.dtClamped ? 1 : 0,
  };
};

const rk4Step = (
  state: Lin2DofState,
  inputs: SimInputs,
  ctx: BicycleContext,
  dt: number
): Lin2DofState => {
  const k1 = derivatives(state, inputs, ctx);
  const k2 = derivatives(addScaled(state, k1, dt / 2), inputs, ctx);
  const k3 = derivatives(addScaled(state, k2, dt / 2), inputs, ctx);
  const k4 = derivatives(addScaled(state, k3, dt), inputs, ctx);

  const next: Lin2DofState = {
    ...state,
    vy:
      state.vy +
      (dt / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy),
    r:
      state.r +
      (dt / 6) * (k1.r + 2 * k2.r + 2 * k3.r + k4.r),
    psi:
      state.psi +
      (dt / 6) * (k1.psi + 2 * k2.psi + 2 * k3.psi + k4.psi),
    x:
      state.x +
      (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y:
      state.y +
      (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
  };

  return postStep(next, inputs, ctx);
};

const semiImplicitEulerStep = (
  state: Lin2DofState,
  inputs: SimInputs,
  ctx: BicycleContext,
  dt: number
): Lin2DofState => {
  const deriv = derivatives(state, inputs, ctx);
  const predicted = finalizeState(state, deriv, dt);
  return postStep(predicted, inputs, ctx);
};

export const Lin2DOF: ModelDef<Lin2DofParams, Lin2DofState> = {
  id: "lin2dof",
  label: "2-DOF Linear Bicycle",
  schema,
  defaults: schema.parse({}),
  init: () => ({
    vy: 0,
    r: 0,
    psi: 0,
    x: 0,
    y: 0,
    vyDot: 0,
    ay: 0,
    slipFront: 0,
    slipRear: 0,
    FyFront: 0,
    FyRear: 0,
    frontLimited: 0,
    rearLimited: 0,
    vxEffective: 0,
    dtClamped: 0,
  }),
  step: (state, inputs, dtArg, params) => {
    const requestedDt = params.dt ?? dtArg;
    const guard = enforceDtBounds("lin2dof", requestedDt);
    const ctx = buildContext(params, guard.clamped);

    if (params.integrator === "semiImplicitEuler") {
      return semiImplicitEulerStep(state, inputs, ctx, guard.dt);
    }
    return rk4Step(state, inputs, ctx, guard.dt);
  },
  outputs: (state, params) => ({
    t: 0,
    x: state.x,
    y: state.y,
    psi: state.psi,
    vy: state.vy,
    r: state.r,
    ay: state.ay,
    beta: Math.atan2(state.vy, state.vxEffective || params.v || 1e-3),
    notes: {
      vyDot: state.vyDot,
      slipFront: state.slipFront,
      slipRear: state.slipRear,
      FyFront: state.FyFront,
      FyRear: state.FyRear,
      frontLimited: state.frontLimited,
      rearLimited: state.rearLimited,
      vxEffective: state.vxEffective,
      dtClamped: state.dtClamped,
    },
  }),
  geometry: (params) => ({
    type: "vehicle",
    length: params.a + params.b,
    width: params.trackWidth,
    wheelbase: params.a + params.b,
  }),
  docsSlug: "/docs/models/lin2dof",
};
