import { computeAy } from "@/lib/vehicle/ayYaw";
import type { VehicleParams } from "@/lib/vehicle/params";
import {
  buildStateSpace,
  identity2,
  invert2x2,
  matrixExponential2,
  multiplyMatrixVector,
  multiplyMatrices,
  scaleMatrix,
  subtractMatrices,
  type Matrix2,
  type Vector2,
} from "./utils";

export type StepSteerTheory = {
  gainRDelta: number;
  omegaN: number;
  zeta: number;
  stepCurves: (times: number[], delta: number) => {
    yawRate: number[];
    ay: number[];
    vy: number[];
  };
};

export function createStepSteerTheory(
  vehicle: VehicleParams,
  speed: number
): StepSteerTheory {
  const { A, B } = buildStateSpace(vehicle, speed);
  const Ainv = invert2x2(A);
  const steadyPerDelta = multiplyMatrixVector(scaleMatrix(Ainv, -1), B);
  const gainRDelta = steadyPerDelta[1];

  const trace = A[0][0] + A[1][1];
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const omegaN = det > 0 ? Math.sqrt(det) : 0;
  const zeta = omegaN > 0 ? -trace / (2 * omegaN) : 0;

  const stepCurves = (times: number[], delta: number) => {
    const responses = {
      yawRate: [] as number[],
      ay: [] as number[],
      vy: [] as number[],
    };
    const identity = identity2();
    const inputVector: Vector2 = [B[0] * delta, B[1] * delta];

    for (const t of times) {
      if (t < 0) {
        responses.yawRate.push(0);
        responses.ay.push(0);
        responses.vy.push(0);
        continue;
      }
      const expAt = matrixExponential2(A, t);
      const expMinusI = subtractMatrices(expAt, identity);
      const integral = multiplyMatrices(Ainv, expMinusI);
      const state = multiplyMatrixVector(integral, inputVector);
      const deriv = multiplyMatrixVector(A, state);
      const vyDot = deriv[0] + B[0] * delta;
      const yawRate = state[1];
      const ay = computeAy(speed, yawRate, vyDot);
      responses.yawRate.push(yawRate);
      responses.ay.push(ay);
      responses.vy.push(state[0]);
    }

    return responses;
  };

  return {
    gainRDelta,
    omegaN,
    zeta,
    stepCurves,
  };
}
