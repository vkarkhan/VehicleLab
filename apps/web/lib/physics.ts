import type { SandboxState } from "@/lib/stateSchema";
import { clamp, roundTo } from "@/lib/utils";

const G = 9.81;
const TRACK_WIDTH = 1.6;

export interface VehicleParameters {
  mass: number;
  cgHeight: number;
  wheelbase: number;
  frontWeightDistribution: number;
  tyreGrip: number;
  corneringStiffnessFactor: number;
}

export interface VehicleState {
  yawRate: number;
  lateralVelocity: number;
}

export interface VehicleInputs {
  steeringAngle: number;
  speed: number;
}

export interface SimulationSample {
  time: number;
  yawRate: number;
  lateralAcceleration: number;
  slipAngle: number;
  frontSlipAngle: number;
  rearSlipAngle: number;
}

export interface VehicleTelemetry {
  yawRate: number;
  lateralAcceleration: number;
  slipAngle: number;
  frontSlipAngle: number;
  rearSlipAngle: number;
  frontLoad: number;
  rearLoad: number;
  frontLoadPercent: number;
  rearLoadPercent: number;
  understeerGradient: number;
  steeringAngle: number;
}

export function createVehicleParameters(state: SandboxState): VehicleParameters {
  return {
    mass: state.mass,
    cgHeight: state.cgHeight,
    wheelbase: 2.8,
    frontWeightDistribution: state.weightDistributionFront,
    tyreGrip: state.tyreGrip,
    corneringStiffnessFactor: 12.5
  };
}

export function createVehicleState(): VehicleState {
  return {
    yawRate: 0,
    lateralVelocity: 0
  };
}

function computeCorneringStiffness(load: number, grip: number, factor: number) {
  return grip * load * factor;
}

function saturateLateralForce(force: number, mu: number, load: number) {
  const limit = mu * load;
  return clamp(force, -limit, limit);
}

export function stepBicycleModel(
  state: VehicleState,
  inputs: VehicleInputs,
  params: VehicleParameters,
  dt: number
) {
  const { mass, wheelbase, frontWeightDistribution, tyreGrip, corneringStiffnessFactor, cgHeight } = params;
  const speed = Math.max(inputs.speed, 0.1);

  const a = frontWeightDistribution * wheelbase;
  const b = wheelbase - a;
  const inertia = mass * (a * a + b * b);

  const FzfStatic = mass * G * frontWeightDistribution;
  const FzrStatic = mass * G * (1 - frontWeightDistribution);

  const Cf = computeCorneringStiffness(FzfStatic, tyreGrip, corneringStiffnessFactor);
  const Cr = computeCorneringStiffness(FzrStatic, tyreGrip, corneringStiffnessFactor * 1.05);

  const alphaFront = inputs.steeringAngle - (state.lateralVelocity + a * state.yawRate) / speed;
  const alphaRear = -(state.lateralVelocity - b * state.yawRate) / speed;

  const FyFrontLinear = -Cf * alphaFront;
  const FyRearLinear = -Cr * alphaRear;

  const FyFront = saturateLateralForce(FyFrontLinear, tyreGrip, FzfStatic);
  const FyRear = saturateLateralForce(FyRearLinear, tyreGrip, FzrStatic);

  const yawAccel = (a * FyFront - b * FyRear) / inertia;
  const lateralAccel = (FyFront + FyRear) / mass - state.yawRate * speed;

  const newYawRate = state.yawRate + yawAccel * dt;
  const newLateralVelocity = state.lateralVelocity + lateralAccel * dt;

  const ay = newYawRate * speed + lateralAccel;
  const slip = Math.atan2(newLateralVelocity, speed);

  const weightTransfer = (mass * ay * cgHeight) / TRACK_WIDTH;
  const frontLoad = clamp(FzfStatic + weightTransfer * (a / wheelbase), mass * G * 0.9, mass * G * 1.1);
  const rearLoad = clamp(FzrStatic - weightTransfer * (a / wheelbase), mass * G * 0.1, mass * G * 0.9);
  const frontLoadPercent = roundTo((frontLoad / (FzfStatic + FzrStatic)) * 100, 1);
  const rearLoadPercent = roundTo((rearLoad / (FzfStatic + FzrStatic)) * 100, 1);

  const understeerGradient = (mass * (b / Cr - a / Cf)) / (mass * G);

  const telemetry: VehicleTelemetry = {
    yawRate: newYawRate,
    lateralAcceleration: ay,
    slipAngle: slip,
    frontSlipAngle: alphaFront,
    rearSlipAngle: alphaRear,
    frontLoad,
    rearLoad,
    frontLoadPercent,
    rearLoadPercent,
    understeerGradient,
    steeringAngle: inputs.steeringAngle
  };

  const sample: SimulationSample = {
    time: 0,
    yawRate: newYawRate,
    lateralAcceleration: ay,
    slipAngle: slip,
    frontSlipAngle: alphaFront,
    rearSlipAngle: alphaRear
  };

  return {
    state: {
      yawRate: newYawRate,
      lateralVelocity: newLateralVelocity
    },
    telemetry,
    sample
  };
}

export function steeringForState(state: SandboxState, time: number) {
  const amplitudeRad = (state.steeringAmplitude * Math.PI) / 180;

  if (state.steeringMode === "step") {
    return amplitudeRad;
  }

  if (state.manoeuvre === "lane-change") {
    const normalized = clamp(time / state.duration, 0, 1);
    const pulse = Math.sin(Math.PI * normalized);
    return amplitudeRad * pulse;
  }

  const omega = 2 * Math.PI * state.sineFrequency;
  return amplitudeRad * Math.sin(omega * time);
}

export function speedToMetersPerSecond(speedKmH: number) {
  return speedKmH / 3.6;
}
