import { computeUndersteerGradient, steadyStateSteerAngle } from "@/lib/vehicle/understeer";
import type { VehicleParams } from "@/lib/vehicle/params";

export type SkidpadPrediction = {
  yawRate: number;
  lateralAcceleration: number;
  steadyStateSteer: number;
  understeerGradient: number;
};

export function predictSkidpad(speed: number, radius: number, params: VehicleParams): SkidpadPrediction {
  if (radius <= 0) {
    throw new Error("Radius must be positive for skidpad prediction");
  }
  const yawRate = radius === 0 ? 0 : speed / radius;
  const lateralAcceleration = speed * yawRate;
  const understeerGradient = computeUndersteerGradient(params);
  const steadyStateSteer = steadyStateSteerAngle(speed, radius, params);
  return {
    yawRate,
    lateralAcceleration,
    steadyStateSteer,
    understeerGradient,
  };
}
