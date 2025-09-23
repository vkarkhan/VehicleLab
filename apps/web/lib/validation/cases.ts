import { speedToMetersPerSecond } from "@/lib/physics";
import type { SandboxState } from "@/lib/stateSchema";

export type ValidationCaseId = "no-steer-flat" | "constant-radius-skidpad";

export interface ValidationParams {
  speed: number;
  duration: number;
  radius?: number;
}

export interface ValidationCaseParamField {
  key: keyof ValidationParams;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  optional?: boolean;
}

export interface ValidationCaseDefinition {
  id: ValidationCaseId;
  label: string;
  description: string;
  fields: ValidationCaseParamField[];
  sampleRate: number;
  settleTime: number;
  computeExpected: (params: ValidationParams) => {
    yawRate: number;
    lateralAcceleration: number;
    lateralAccelG: number;
  };
  tolerances: {
    yawRate: number;
    lateralAccelG: number;
  };
  applyState: (state: SandboxState, params: ValidationParams) => SandboxState;
  computeSteeringAngleRad: (state: SandboxState, params: ValidationParams) => number;
}

const NO_STEER_DEFAULTS: ValidationParams = {
  speed: 80,
  duration: 5
};

const SKIDPAD_DEFAULTS: ValidationParams = {
  speed: 80,
  duration: 5,
  radius: 50
};

function clampGrip(mu: number) {
  return Math.max(mu, 1);
}

export const validationCases: Record<ValidationCaseId, ValidationCaseDefinition> = {
  "no-steer-flat": {
    id: "no-steer-flat",
    label: "No-steer flat road",
    description: "Zero steering, flat road, baseline stability check.",
    fields: [
      {
        key: "speed",
        label: "Speed",
        unit: "km/h",
        min: 20,
        max: 200,
        step: 1,
        defaultValue: NO_STEER_DEFAULTS.speed
      },
      {
        key: "duration",
        label: "Sample window",
        unit: "s",
        min: 3,
        max: 8,
        step: 0.5,
        defaultValue: NO_STEER_DEFAULTS.duration
      }
    ],
    sampleRate: 20,
    settleTime: 1,
    computeExpected: () => ({
      yawRate: 0,
      lateralAcceleration: 0,
      lateralAccelG: 0
    }),
    tolerances: {
      yawRate: 0.05,
      lateralAccelG: 0.03
    },
    applyState: (state, params) => ({
      ...state,
      speed: params.speed,
      tyreGrip: 1,
      manoeuvre: "no-steer",
      steeringMode: "step",
      steeringAmplitude: 0,
      sineFrequency: 0,
      alignmentDebug: false,
      showZeroSteerBaseline: false,
      visualCamberDeg: 0,
      camber: 0,
      visualCrownDeg: 0
    }),
    computeSteeringAngleRad: () => 0
  },
  "constant-radius-skidpad": {
    id: "constant-radius-skidpad",
    label: "Constant-radius skidpad",
    description: "Circular path with constant speed and radius.",
    fields: [
      {
        key: "speed",
        label: "Speed",
        unit: "km/h",
        min: 30,
        max: 200,
        step: 1,
        defaultValue: SKIDPAD_DEFAULTS.speed
      },
      {
        key: "radius",
        label: "Radius",
        unit: "m",
        min: 15,
        max: 120,
        step: 1,
        defaultValue: SKIDPAD_DEFAULTS.radius ?? 50
      },
      {
        key: "duration",
        label: "Sample window",
        unit: "s",
        min: 3,
        max: 8,
        step: 0.5,
        defaultValue: SKIDPAD_DEFAULTS.duration
      }
    ],
    sampleRate: 20,
    settleTime: 1,
    computeExpected: (params) => {
      const radius = params.radius ?? SKIDPAD_DEFAULTS.radius!;
      const speedMps = speedToMetersPerSecond(params.speed);
      const yawRate = radius > 0 ? speedMps / radius : 0;
      const lateralAcceleration = radius > 0 ? (speedMps * speedMps) / radius : 0;
      return {
        yawRate,
        lateralAcceleration,
        lateralAccelG: lateralAcceleration / 9.81
      };
    },
    tolerances: {
      yawRate: 0.05,
      lateralAccelG: 0.05
    },
    applyState: (state, params) => ({
      ...state,
      speed: params.speed,
      tyreGrip: clampGrip(state.tyreGrip),
      manoeuvre: "skidpad",
      steeringMode: "step",
      steeringAmplitude: 0,
      sineFrequency: 0,
      skidpadRadius: params.radius ?? state.skidpadRadius
    }),
    computeSteeringAngleRad: (_, params) => {
      const wheelbase = 2.8;
      const radius = params.radius ?? SKIDPAD_DEFAULTS.radius!;
      if (radius <= 0) return 0;
      return Math.atan(wheelbase / radius);
    }
  }
};

export const defaultValidationParams: Record<ValidationCaseId, ValidationParams> = {
  "no-steer-flat": NO_STEER_DEFAULTS,
  "constant-radius-skidpad": SKIDPAD_DEFAULTS
};
