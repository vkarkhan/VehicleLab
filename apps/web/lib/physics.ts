import type { SandboxState } from "@/lib/stateSchema";
import { computeSlipAndForces } from "@/lib/vehicle/slipAndForces";
import { clampLateralForces } from "@/lib/vehicle/frictionClamp";
import { computeAy } from "@/lib/vehicle/ayYaw";
import { createVehicleParams } from "@/lib/vehicle/params";
import { computeUndersteerGradient } from "@/lib/vehicle/understeer";
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
  frontAxleForce: number;
  rearAxleForce: number;
  frontUtilization: number;
  rearUtilization: number;
  lateralVelocity: number;
  longitudinalSpeed: number;
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

export function stepBicycleModel(
  state: VehicleState,
  inputs: VehicleInputs,
  params: VehicleParameters,
  dt: number
) {
  const {
    mass,
    wheelbase,
    frontWeightDistribution,
    tyreGrip,
    corneringStiffnessFactor,
    cgHeight,
  } = params;
  const speed = Math.max(inputs.speed, 0.5);

  const a = frontWeightDistribution * wheelbase;
  const b = wheelbase - a;
  const inertia = mass * (a * a + b * b);

  const staticFront = mass * G * frontWeightDistribution;
  const staticRear = mass * G * (1 - frontWeightDistribution);

  const Cf = computeCorneringStiffness(staticFront, tyreGrip, corneringStiffnessFactor);
  const Cr = computeCorneringStiffness(staticRear, tyreGrip, corneringStiffnessFactor * 1.05);

  const slip = computeSlipAndForces(
    {
      vy: state.lateralVelocity,
      r: state.yawRate,
      vx: speed,
      a,
      b,
      steer: inputs.steeringAngle,
    },
    { Cf, Cr }
  );

  const vehicle = createVehicleParams({
    m: mass,
    Iz: inertia,
    a,
    b,
    Cf,
    Cr,
    mu: tyreGrip,
    track: TRACK_WIDTH,
    hCg: cgHeight,
    g: G,
  });

  const clampResult = clampLateralForces({
    FyFront: slip.forces.front,
    FyRear: slip.forces.rear,
    params: vehicle,
  });

  const FyFront = clampResult.front;
  const FyRear = clampResult.rear;

  const yawAccel = (a * FyFront - b * FyRear) / inertia;
  const lateralAccel = (FyFront + FyRear) / mass - state.yawRate * speed;

  const newYawRate = state.yawRate + yawAccel * dt;
  const newLateralVelocity = state.lateralVelocity + lateralAccel * dt;

  const ay = computeAy(speed, newYawRate, lateralAccel);
  const slipAngle = Math.atan2(newLateralVelocity, speed);

  const weightTransfer = (mass * ay * cgHeight) / TRACK_WIDTH;
  const frontLoad = clamp(staticFront + weightTransfer * (a / wheelbase), 0, mass * G);
  const rearLoad = clamp(staticRear - weightTransfer * (a / wheelbase), 0, mass * G);
  const totalLoad = frontLoad + rearLoad || mass * G;
  const frontLoadPercent = roundTo((frontLoad / totalLoad) * 100, 1);
  const rearLoadPercent = roundTo(100 - frontLoadPercent, 1);

  const frontUtilization = Math.min(Math.abs(FyFront) / (Math.max(tyreGrip * Math.max(frontLoad, 1), 1e-6)), 1);
  const rearUtilization = Math.min(Math.abs(FyRear) / (Math.max(tyreGrip * Math.max(rearLoad, 1), 1e-6)), 1);
  const understeerGradient = computeUndersteerGradient(vehicle);

  const telemetry: VehicleTelemetry = {
    yawRate: newYawRate,
    lateralAcceleration: ay,
    slipAngle,
    frontSlipAngle: slip.angles.front,
    rearSlipAngle: slip.angles.rear,
    frontLoad,
    rearLoad,
    frontLoadPercent,
    rearLoadPercent,
    frontAxleForce: FyFront,
    rearAxleForce: FyRear,
    frontUtilization,
    rearUtilization,
    lateralVelocity: newLateralVelocity,
    longitudinalSpeed: speed,
    understeerGradient,
    steeringAngle: inputs.steeringAngle,
  };

  const sample: SimulationSample = {
    time: 0,
    yawRate: newYawRate,
    lateralAcceleration: ay,
    slipAngle,
    frontSlipAngle: slip.angles.front,
    rearSlipAngle: slip.angles.rear,
  };

  return {
    state: {
      yawRate: newYawRate,
      lateralVelocity: newLateralVelocity,
    },
    telemetry,
    sample,
  };
}

export function steeringForState(state: SandboxState, time: number) {
  if (state.manoeuvre === "no-steer") {
    return 0;
  }

  const amplitudeRad = (state.steeringAmplitude * Math.PI) / 180;

  if (state.steeringMode === "step") {
    return amplitudeRad;
  }

  if (state.manoeuvre === "lane-change") {
    const normalized = clamp(time / state.duration, 0, 1);
    const pulse = Math.sin(Math.PI * normalized);
    return amplitudeRad * pulse;
  }

  const omega = 2 * Math.PI * Math.max(state.sineFrequency, 0);
  return amplitudeRad * Math.sin(omega * time);
}

export function speedToMetersPerSecond(speedKmH: number) {
  return speedKmH / 3.6;
}
