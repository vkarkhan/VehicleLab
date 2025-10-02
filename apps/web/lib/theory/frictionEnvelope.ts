import { computeUndersteerGradient } from "@/lib/vehicle/understeer";
import type { VehicleParams } from "@/lib/vehicle/params";

export type FrictionLimitPrediction = {
  ayMax: number;
  steerAtLimit: number;
};

export function predictLimit(
  speed: number,
  mu: number,
  params: VehicleParams
): FrictionLimitPrediction {
  const ayMax = mu * params.g;
  const understeer = computeUndersteerGradient(params);
  const denom = speed * speed;
  const steerAtLimit = denom > 0
    ? (params.L + (understeer * denom) / params.g) * (mu * params.g / denom)
    : 0;
  return {
    ayMax,
    steerAtLimit,
  };
}
