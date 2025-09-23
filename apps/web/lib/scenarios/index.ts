import type { ModelParams, SimInputs } from "../sim/core";

export type ScenarioSampleContext = {
  t: number;
  modelId: string;
  params: ModelParams;
};

export type ScenarioSampler = (context: ScenarioSampleContext) => SimInputs;

export type ScenarioFactory<Opts extends Record<string, unknown>> = (
  options?: Partial<Opts>
) => ScenarioSampler;

export type ScenarioPreset<Opts extends Record<string, unknown>> = {
  id: string;
  label: string;
  description?: string;
  defaults: Opts;
  create: ScenarioFactory<Opts>;
};

type StepSteerOptions = {
  deltaDeg: number;
  tStep: number;
};

type ConstRadiusOptions = {
  R: number;
};

export const stepSteer: ScenarioFactory<StepSteerOptions> = (options) => {
  const { deltaDeg, tStep } = { deltaDeg: 5, tStep: 1, ...options };
  const deltaRad = degToRad(deltaDeg);
  return ({ t }: ScenarioSampleContext) => ({
    steer: t >= tStep ? deltaRad : 0,
    throttle: 0,
    brake: 0,
  });
};

export const constRadius: ScenarioFactory<ConstRadiusOptions> = (options) => {
  const { R } = { R: 50, ...options };
  return ({ params }: ScenarioSampleContext) => {
    const L = inferEffectiveWheelbase(params);
    const steer = Math.atan(L / R);
    return {
      steer,
      throttle: 0,
      brake: 0,
    };
  };
};

const inferEffectiveWheelbase = (params: ModelParams) => {
  if (typeof params === "object" && params) {
    if (typeof (params as any).L_eff === "number") {
      return (params as any).L_eff as number;
    }

    const a = typeof (params as any).a === "number" ? ((params as any).a as number) : undefined;
    const b = typeof (params as any).b === "number" ? ((params as any).b as number) : undefined;
    if (typeof a === "number" && typeof b === "number") {
      return a + b;
    }
  }
  return 2.7;
};

const degToRad = (deg: number) => (deg * Math.PI) / 180;

export const scenarioPresets: ScenarioPreset<any>[] = [
  {
    id: "step-steer",
    label: "Step Steer",
    description: "Applies a steering step at a specific time.",
    defaults: { deltaDeg: 5, tStep: 1 },
    create: stepSteer,
  },
  {
    id: "const-radius",
    label: "Constant Radius",
    description: "Command steering for a target turn radius.",
    defaults: { R: 50 },
    create: constRadius,
  },
];

export const listScenarioPresets = () => scenarioPresets;

export const getScenarioPreset = (id: string) =>
  scenarioPresets.find((preset) => preset.id === id);

export const createScenario = (
  id: string,
  overrides?: Record<string, unknown>
): ScenarioSampler => {
  const preset = getScenarioPreset(id);
  if (!preset) {
    throw new Error(Unknown scenario: );
  }
  return preset.create({ ...preset.defaults, ...overrides } as any);
};
