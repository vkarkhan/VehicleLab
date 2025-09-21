import type { SandboxState } from "@/lib/stateSchema";
import {
  createVehicleParameters,
  createVehicleState,
  speedToMetersPerSecond,
  stepBicycleModel
} from "@/lib/physics";

const GRAVITY = 9.80665;
const DT = 0.01;
const TEST_DURATION = 5; // seconds
const SETTLE_TIME = 1; // seconds to ignore while the model settles
const YAW_THRESHOLD = 0.01; // rad/s
const LATERAL_THRESHOLD_G = 0.02; // g
const LATERAL_THRESHOLD = LATERAL_THRESHOLD_G * GRAVITY; // m/s^2

export interface NoSteerTestResult {
  maxYawRate: number;
  maxLateralAcceleration: number;
  maxLateralAccelerationG: number;
  pass: boolean;
  thresholds: {
    yawRate: number;
    lateralAcceleration: number;
    lateralAccelerationG: number;
  };
  samplesEvaluated: number;
}

export function runNoSteerTest(state: SandboxState): NoSteerTestResult {
  const params = createVehicleParameters(state);
  const vehicleState = createVehicleState();
  const speed = speedToMetersPerSecond(state.speed);
  const steps = Math.ceil(TEST_DURATION / DT);

  let elapsed = 0;
  let maxYawRate = 0;
  let maxLateralAcceleration = 0;
  let samplesEvaluated = 0;

  for (let step = 0; step < steps; step += 1) {
    const result = stepBicycleModel(
      vehicleState,
      {
        steeringAngle: 0,
        speed
      },
      params,
      DT
    );

    vehicleState.yawRate = result.state.yawRate;
    vehicleState.lateralVelocity = result.state.lateralVelocity;
    elapsed += DT;

    if (elapsed < SETTLE_TIME) {
      continue;
    }

    samplesEvaluated += 1;
    maxYawRate = Math.max(maxYawRate, Math.abs(result.telemetry.yawRate));
    maxLateralAcceleration = Math.max(maxLateralAcceleration, Math.abs(result.telemetry.lateralAcceleration));
  }

  const pass = maxYawRate <= YAW_THRESHOLD && maxLateralAcceleration <= LATERAL_THRESHOLD;

  return {
    maxYawRate,
    maxLateralAcceleration,
    maxLateralAccelerationG: maxLateralAcceleration / GRAVITY,
    pass,
    thresholds: {
      yawRate: YAW_THRESHOLD,
      lateralAcceleration: LATERAL_THRESHOLD,
      lateralAccelerationG: LATERAL_THRESHOLD_G
    },
    samplesEvaluated
  };
}
