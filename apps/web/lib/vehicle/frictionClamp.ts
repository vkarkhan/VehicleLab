import { computeStaticLoads, type VehicleParams } from "./params";

export type FrictionClampResult = {
  front: number;
  rear: number;
  limitFlags: {
    front: boolean;
    rear: boolean;
  };
};

export type FrictionClampInput = {
  FyFront: number;
  FyRear: number;
  params: VehicleParams;
  muOverride?: number;
};

export function clampLateralForces(input: FrictionClampInput): FrictionClampResult {
  const staticLoads = computeStaticLoads(input.params);
  const mu = input.muOverride ?? input.params.mu;
  const frontLimit = Math.abs(mu * staticLoads.front);
  const rearLimit = Math.abs(mu * staticLoads.rear);

  const clampedFront = clamp(input.FyFront, -frontLimit, frontLimit);
  const clampedRear = clamp(input.FyRear, -rearLimit, rearLimit);

  return {
    front: clampedFront,
    rear: clampedRear,
    limitFlags: {
      front: clampedFront !== input.FyFront,
      rear: clampedRear !== input.FyRear,
    },
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
