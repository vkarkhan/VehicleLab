export const DEFAULT_GRAVITY = 9.81;

export type VehicleParams = {
  m: number;
  Iz: number;
  a: number;
  b: number;
  L: number;
  Cf: number;
  Cr: number;
  g: number;
  track: number;
  hCg: number;
  mu: number;
};

export type VehicleParamsInput = {
  m: number;
  Iz: number;
  a: number;
  b: number;
  Cf: number;
  Cr: number;
  g?: number;
  track?: number;
  hCg?: number;
  mu?: number;
};

export type StaticLoadSplit = {
  front: number;
  rear: number;
};

export type LinearBicycleCoefficients = {
  vx: number;
  a11: number;
  a12: number;
  a21: number;
  a22: number;
  b1: number;
  b2: number;
  staticLoads: StaticLoadSplit;
};

export function createVehicleParams(input: VehicleParamsInput): VehicleParams {
  const g = input.g ?? DEFAULT_GRAVITY;
  const track = input.track ?? 1.6;
  const hCg = input.hCg ?? 0.55;
  const mu = input.mu ?? 1.0;
  const L = input.a + input.b;
  if (!Number.isFinite(L) || L <= 0) {
    throw new Error("Invalid wheelbase computed from a and b");
  }
  return {
    m: input.m,
    Iz: input.Iz,
    a: input.a,
    b: input.b,
    L,
    Cf: input.Cf,
    Cr: input.Cr,
    g,
    track,
    hCg,
    mu,
  };
}

export function computeStaticLoads(params: VehicleParams): StaticLoadSplit {
  if (params.L <= 0) {
    throw new Error("Vehicle wheelbase must be positive");
  }
  const weight = params.m * params.g;
  const front = weight * (params.b / params.L);
  const rear = weight * (params.a / params.L);
  return { front, rear };
}

export function deriveLinearBicycleCoeffs(
  params: VehicleParams,
  vx: number
): LinearBicycleCoefficients {
  const vxSafe = Math.sign(vx || 1) * Math.max(Math.abs(vx), 0.5);
  const sumCornering = params.Cf + params.Cr;
  const momentDiff = params.Cr * params.b - params.Cf * params.a;
  const yawStiffness = params.Cf * params.a * params.a + params.Cr * params.b * params.b;

  const a11 = -(sumCornering / params.m);
  const a12 = momentDiff / params.m - vxSafe;
  const a21 = momentDiff / params.Iz;
  const a22 = -(yawStiffness / params.Iz);
  const b1 = params.Cf / params.m;
  const b2 = (params.Cf * params.a) / params.Iz;

  return {
    vx: vxSafe,
    a11,
    a12,
    a21,
    a22,
    b1,
    b2,
    staticLoads: computeStaticLoads(params),
  };
}
