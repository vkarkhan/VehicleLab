import { computeStaticLoads, type VehicleParams } from "./params";

export function computeUndersteerGradient(params: VehicleParams): number {
  const loads = computeStaticLoads(params);
  const frontTerm = loads.front / params.Cf;
  const rearTerm = loads.rear / params.Cr;
  return (frontTerm - rearTerm) / params.g;
}

export function steadyStateSteerAngle(
  speed: number,
  radius: number,
  params: VehicleParams
): number {
  if (radius <= 0) {
    throw new Error("Radius must be positive for steady-state steer calculation");
  }
  const U = computeUndersteerGradient(params);
  return params.L / radius + (U * speed * speed) / (radius * params.g);
}
