import { z } from "zod";
import type { ModelDef, SimInputs } from "../sim/core";

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
};

type StateDerivative = {
  vy: number;
  r: number;
  psi: number;
  x: number;
  y: number;
};

const addNoise = (value: number, enabled: boolean, std: number) => {
  if (!enabled || std <= 0) return value;
  return value + (Math.random() * 2 - 1) * std;
};

const derivatives = (
  state: Lin2DofState,
  inputs: SimInputs,
  params: Lin2DofParams,
  stochastic = false
): StateDerivative => {
  const { m, Iz, a, b, Cf, Cr, v, processNoise, noiseStd } = params;
  const delta = inputs.steer ?? 0;
  const vy = state.vy;
  const r = state.r;

  const vSafe = Math.abs(v) < 1e-3 ? 1e-3 : v;
  const alphaF = delta - (vy + a * r) / vSafe;
  const alphaR = -((vy - b * r) / vSafe);

  const Fyf = Cf * alphaF;
  const Fyr = Cr * alphaR;

  const vyDot = addNoise((Fyf + Fyr) / m - v * r, stochastic && processNoise, noiseStd);
  const rDot = addNoise((a * Fyf - b * Fyr) / Iz, stochastic && processNoise, noiseStd);

  const psiDot = r;
  const cosPsi = Math.cos(state.psi);
  const sinPsi = Math.sin(state.psi);
  const xDot = v * cosPsi - vy * sinPsi;
  const yDot = v * sinPsi + vy * cosPsi;

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
  vy: state.vy + derivative.vy * scale,
  r: state.r + derivative.r * scale,
  psi: state.psi + derivative.psi * scale,
  x: state.x + derivative.x * scale,
  y: state.y + derivative.y * scale,
  vyDot: state.vyDot,
  ay: state.ay,
});

const finalizeState = (
  state: Lin2DofState,
  deriv: StateDerivative,
  dt: number
): Lin2DofState => ({
  vy: state.vy + deriv.vy * dt,
  r: state.r + deriv.r * dt,
  psi: state.psi + deriv.psi * dt,
  x: state.x + deriv.x * dt,
  y: state.y + deriv.y * dt,
  vyDot: state.vyDot,
  ay: state.ay,
});

const postStep = (
  state: Lin2DofState,
  inputs: SimInputs,
  params: Lin2DofParams
): Lin2DofState => {
  const deriv = derivatives(state, inputs, params, true);
  const ay = deriv.vy + params.v * state.r;
  return { ...state, vyDot: deriv.vy, ay };
};

const rk4Step = (
  state: Lin2DofState,
  inputs: SimInputs,
  params: Lin2DofParams,
  dt: number
): Lin2DofState => {
  const k1 = derivatives(state, inputs, params);
  const k2 = derivatives(addScaled(state, k1, dt / 2), inputs, params);
  const k3 = derivatives(addScaled(state, k2, dt / 2), inputs, params);
  const k4 = derivatives(addScaled(state, k3, dt), inputs, params);

  const next: Lin2DofState = {
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
    vyDot: state.vyDot,
    ay: state.ay,
  };

  return postStep(next, inputs, params);
};

const semiImplicitEulerStep = (
  state: Lin2DofState,
  inputs: SimInputs,
  params: Lin2DofParams,
  dt: number
): Lin2DofState => {
  const deriv = derivatives(state, inputs, params);
  const predicted = finalizeState(state, deriv, dt);
  return postStep(predicted, inputs, params);
};

export const Lin2DOF: ModelDef<Lin2DofParams, Lin2DofState> = {
  id: "lin2dof",
  label: "2-DOF Linear Bicycle",
  schema,
  defaults: schema.parse({}),
  init: () => ({ vy: 0, r: 0, psi: 0, x: 0, y: 0, vyDot: 0, ay: 0 }),
  step: (state, inputs, dtArg, params) => {
    const dt = params.dt ?? dtArg;
    if (params.integrator === "semiImplicitEuler") {
      return semiImplicitEulerStep(state, inputs, params, dt);
    }
    return rk4Step(state, inputs, params, dt);
  },
  outputs: (state, params) => ({
    t: 0,
    x: state.x,
    y: state.y,
    psi: state.psi,
    vy: state.vy,
    r: state.r,
    ay: state.ay,
    beta: Math.atan2(state.vy, params.v || 1e-3),
    notes: {
      vyDot: state.vyDot,
    },
  }),
  geometry: (params) => ({
    type: "vehicle",
    length: params.a + params.b,
    width: 1.8,
    wheelbase: params.a + params.b,
  }),
  docsSlug: "/docs/models/lin2dof",
};
