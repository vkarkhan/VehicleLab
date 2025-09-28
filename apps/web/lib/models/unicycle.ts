import { z } from "zod";
import type { ModelDef, SimInputs } from "../sim/core";

type UnicycleState = {
  x: number;
  y: number;
  psi: number;
  yawRate: number;
};

const schema = z
  .object({
    v: z
      .number()
      .min(0)
      .max(120)
      .default(25)
      .describe("Vehicle speed [m/s]|basic"),
    L_eff: z
      .number()
      .min(1.5)
      .max(5)
      .default(2.7)
      .describe("Effective wheelbase [m]|basic"),
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
      .max(0.2)
      .default(0.02)
      .describe("Yaw rate noise std [rad/s]|advanced"),
  })
  .describe("Kinematic unicycle model");

type UnicycleParams = z.infer<typeof schema>;

const addNoise = (value: number, enabled: boolean, std: number) => {
  if (!enabled || std <= 0) return value;
  return value + (Math.random() * 2 - 1) * std;
};

const yawRateFromInputs = (inputs: SimInputs, params: UnicycleParams) => {
  const steer = inputs.steer ?? 0;
  const curvature = Math.tan(steer) / params.L_eff;
  return params.v * curvature;
};

const rk4Step = (
  state: UnicycleState,
  inputs: SimInputs,
  params: UnicycleParams,
  dt: number
): UnicycleState => {
  const yawRate = addNoise(
    yawRateFromInputs(inputs, params),
    params.processNoise,
    params.noiseStd
  );

  const f = (psi: number) => ({
    dx: params.v * Math.cos(psi),
    dy: params.v * Math.sin(psi),
    dpsi: yawRate,
  });

  const k1 = f(state.psi);
  const k2 = f(state.psi + (dt / 2) * k1.dpsi);
  const k3 = f(state.psi + (dt / 2) * k2.dpsi);
  const k4 = f(state.psi + dt * k3.dpsi);

  return {
    x:
      state.x +
      (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
    y:
      state.y +
      (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
    psi:
      state.psi +
      (dt / 6) * (k1.dpsi + 2 * k2.dpsi + 2 * k3.dpsi + k4.dpsi),
    yawRate,
  };
};

const semiImplicitEulerStep = (
  state: UnicycleState,
  inputs: SimInputs,
  params: UnicycleParams,
  dt: number
): UnicycleState => {
  const yawRate = addNoise(
    yawRateFromInputs(inputs, params),
    params.processNoise,
    params.noiseStd
  );
  const psiNext = state.psi + yawRate * dt;
  const vx = params.v * Math.cos(psiNext);
  const vy = params.v * Math.sin(psiNext);

  return {
    x: state.x + vx * dt,
    y: state.y + vy * dt,
    psi: psiNext,
    yawRate,
  };
};

export const Unicycle: ModelDef<UnicycleParams, UnicycleState> = {
  id: "unicycle",
  label: "Kinematic Unicycle",
  schema,
  defaults: schema.parse({}),
  init: () => ({ x: 0, y: 0, psi: 0, yawRate: 0 }),
  step: (state, inputs, dtArg, params) => {
    const dt = params.dt ?? dtArg;
    if (params.integrator === "semiImplicitEuler") {
      return semiImplicitEulerStep(state, inputs, params, dt);
    }
    return rk4Step(state, inputs, params, dt);
  },
  outputs: (state, params) => {
    const ay = params.v * state.yawRate;

    return {
      t: 0,
      x: state.x,
      y: state.y,
      psi: state.psi,
      r: state.yawRate,
      beta: 0,
      ay,
    };
  },
  geometry: (params) => ({
    type: "vehicle",
    length: params.L_eff,
    width: Math.max(1.4, params.L_eff * 0.4),
    wheelbase: params.L_eff,
  }),
  docsSlug: "/docs/models/unicycle",
};
