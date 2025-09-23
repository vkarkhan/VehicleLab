import type { ZodObject } from "zod";

export type SimInputs = {
  steer: number;
  throttle?: number;
  brake?: number;
};

export type Telemetry = {
  t: number;
  x?: number;
  y?: number;
  psi?: number;
  vy?: number;
  r?: number;
  ay?: number;
  beta?: number;
  notes?: Record<string, number>;
};

export type ModelParams = Record<string, unknown>;
export type ModelState = Record<string, number>;

export type ModelDef<P extends ModelParams = ModelParams, S extends ModelState = ModelState> = {
  id: string;
  label: string;
  schema: ZodObject<any, any, any>;
  defaults: P;
  init: (params: P) => S;
  step: (state: S, inputs: SimInputs, dt: number, params: P) => S;
  outputs: (state: S, params: P) => Telemetry;
  geometry?: (params: P) => {
    type: "vehicle";
    length: number;
    width: number;
    wheelbase?: number;
  };
  docsSlug: string;
};
