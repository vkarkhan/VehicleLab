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
  if (!Number.isFinite(radius) || Math.abs(radius) < 1e-6) {
    throw new Error("Radius must be finite and non-zero for steady-state steer calculation");
  }
  const U = computeUndersteerGradient(params);
  return params.L / radius + (U * speed * speed) / (radius * params.g);
}

export function safeSteadyStateSteerAngle(
  speed: number,
  radius: number,
  params: VehicleParams
): number | null {
  if (!Number.isFinite(speed) || !Number.isFinite(radius) || Math.abs(radius) < 1e-6) {
    return null;
  }
  return steadyStateSteerAngle(speed, radius, params);
}
