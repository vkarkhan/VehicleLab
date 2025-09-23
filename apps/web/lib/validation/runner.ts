import { createVehicleParameters, createVehicleState, speedToMetersPerSecond, stepBicycleModel } from "@/lib/physics";
import type { SandboxState } from "@/lib/stateSchema";

import {
  defaultValidationParams,
  validationCases,
  type ValidationCaseDefinition,
  type ValidationCaseId,
  type ValidationParams
} from "./cases";

const GRAVITY = 9.81;
const SIM_DT = 1 / 240; // high-resolution integrator

export interface ValidationMetricResult {
  rmse: number;
  meanError: number;
  maxError: number;
  tolerance: number;
  pass: boolean;
}

export interface ValidationSeries {
  time: number[];
  measuredYawRate: number[];
  measuredLateralAccel: number[];
  measuredLateralAccelG: number[];
  expectedYawRate: number[];
  expectedLateralAccel: number[];
  expectedLateralAccelG: number[];
}

export interface ValidationRunResult {
  caseId: ValidationCaseId;
  params: ValidationParams;
  appliedState: SandboxState;
  series: ValidationSeries;
  metrics: {
    yawRate: ValidationMetricResult;
    lateralAccelG: ValidationMetricResult;
  };
}

export interface RunValidationOptions {
  state: SandboxState;
  params?: Partial<ValidationParams>;
}

function mergeParams(definition: ValidationCaseDefinition, overrides?: Partial<ValidationParams>): ValidationParams {
  const defaults = defaultValidationParams[definition.id];
  const merged: ValidationParams = {
    speed: overrides?.speed ?? defaults.speed,
    duration: overrides?.duration ?? defaults.duration,
    radius: overrides?.radius ?? defaults.radius
  };

  return merged;
}

function computeMetrics(
  measured: number[],
  expected: number[],
  tolerance: number
): ValidationMetricResult {
  if (!measured.length || measured.length !== expected.length) {
    return {
      rmse: 0,
      meanError: 0,
      maxError: 0,
      tolerance,
      pass: false
    };
  }

  let squaredSum = 0;
  let signedSum = 0;
  let maxError = 0;

  for (let i = 0; i < measured.length; i += 1) {
    const error = measured[i] - expected[i];
    squaredSum += error * error;
    signedSum += error;
    maxError = Math.max(maxError, Math.abs(error));
  }

  const rmse = Math.sqrt(squaredSum / measured.length);
  const meanError = signedSum / measured.length;

  return {
    rmse,
    meanError,
    maxError,
    tolerance,
    pass: maxError <= tolerance
  };
}

export function runValidation(caseId: ValidationCaseId, options: RunValidationOptions): ValidationRunResult {
  const definition = validationCases[caseId];
  if (!definition) {
    throw new Error(`Unknown validation case: ${caseId}`);
  }

  const params = mergeParams(definition, options.params);
  const baseState = options.state;

  const appliedState = definition.applyState({ ...baseState }, params);
  const vehicleParams = createVehicleParameters(appliedState);
  const vehicleState = createVehicleState();
  const speedMps = speedToMetersPerSecond(params.speed);
  const steeringAngle = definition.computeSteeringAngleRad(appliedState, params);

  const expectedConstants = definition.computeExpected(params);

  const settleTime = definition.settleTime;
  const sampleDuration = params.duration;
  const totalTime = settleTime + sampleDuration;
  const sampleInterval = 1 / definition.sampleRate;

  let time = 0;
  let nextSampleTime = settleTime;

  const series: ValidationSeries = {
    time: [],
    measuredYawRate: [],
    measuredLateralAccel: [],
    measuredLateralAccelG: [],
    expectedYawRate: [],
    expectedLateralAccel: [],
    expectedLateralAccelG: []
  };

  while (time < totalTime + SIM_DT) {
    const result = stepBicycleModel(
      vehicleState,
      {
        steeringAngle,
        speed: speedMps
      },
      vehicleParams,
      SIM_DT
    );

    vehicleState.yawRate = result.state.yawRate;
    vehicleState.lateralVelocity = result.state.lateralVelocity;

    time += SIM_DT;

    if (time + 1e-6 < nextSampleTime) {
      continue;
    }

    if (time > totalTime + 1e-6) {
      break;
    }

    const sampleTime = Math.max(0, time - settleTime);
    const lateralAccel = result.telemetry.lateralAcceleration;
    const lateralAccelG = lateralAccel / GRAVITY;

    series.time.push(Number(sampleTime.toFixed(3)));
    series.measuredYawRate.push(result.telemetry.yawRate);
    series.measuredLateralAccel.push(lateralAccel);
    series.measuredLateralAccelG.push(lateralAccelG);
    series.expectedYawRate.push(expectedConstants.yawRate);
    series.expectedLateralAccel.push(expectedConstants.lateralAcceleration);
    series.expectedLateralAccelG.push(expectedConstants.lateralAccelG);

    nextSampleTime += sampleInterval;
  }

  const metrics = {
    yawRate: computeMetrics(series.measuredYawRate, series.expectedYawRate, definition.tolerances.yawRate),
    lateralAccelG: computeMetrics(
      series.measuredLateralAccelG,
      series.expectedLateralAccelG,
      definition.tolerances.lateralAccelG
    )
  };

  return {
    caseId,
    params,
    appliedState,
    series,
    metrics
  };
}
