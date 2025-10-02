import { deriveLinearBicycleCoeffs, type LinearBicycleCoefficients, type VehicleParams } from "@/lib/vehicle/params";

export type Matrix2 = [
  [number, number],
  [number, number]
];

export type Vector2 = [number, number];

export type StateSpace = {
  A: Matrix2;
  B: Vector2;
  coeffs: LinearBicycleCoefficients;
};

export const identity2 = (): Matrix2 => [
  [1, 0],
  [0, 1],
];

export const subtractMatrices = (a: Matrix2, b: Matrix2): Matrix2 => [
  [a[0][0] - b[0][0], a[0][1] - b[0][1]],
  [a[1][0] - b[1][0], a[1][1] - b[1][1]],
];

export const addMatrices = (a: Matrix2, b: Matrix2): Matrix2 => [
  [a[0][0] + b[0][0], a[0][1] + b[0][1]],
  [a[1][0] + b[1][0], a[1][1] + b[1][1]],
];

export const scaleMatrix = (m: Matrix2, scalar: number): Matrix2 => [
  [m[0][0] * scalar, m[0][1] * scalar],
  [m[1][0] * scalar, m[1][1] * scalar],
];

export const multiplyMatrixVector = (m: Matrix2, v: Vector2): Vector2 => [
  m[0][0] * v[0] + m[0][1] * v[1],
  m[1][0] * v[0] + m[1][1] * v[1],
];

export const multiplyMatrices = (a: Matrix2, b: Matrix2): Matrix2 => [
  [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
  [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],
];

export const invert2x2 = (m: Matrix2): Matrix2 => {
  const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  if (Math.abs(det) < 1e-9) {
    throw new Error("Matrix is singular and cannot be inverted");
  }
  const invDet = 1 / det;
  return [
    [m[1][1] * invDet, -m[0][1] * invDet],
    [-m[1][0] * invDet, m[0][0] * invDet],
  ];
};

export const matrixExponential2 = (A: Matrix2, t: number): Matrix2 => {
  const halfTrace = (A[0][0] + A[1][1]) / 2;
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const deltaSquared = halfTrace * halfTrace - det;
  const I = identity2();
  const centered = subtractMatrices(A, scaleMatrix(I, halfTrace));
  if (Math.abs(deltaSquared) < 1e-9) {
    const expTerm = Math.exp(halfTrace * t);
    const correction = scaleMatrix(centered, t);
    return scaleMatrix(addMatrices(I, correction), expTerm);
  }
  if (deltaSquared > 0) {
    const delta = Math.sqrt(deltaSquared);
    const expTerm = Math.exp(halfTrace * t);
    const coshTerm = Math.cosh(delta * t);
    const sinhTerm = Math.sinh(delta * t) / delta;
    const second = scaleMatrix(centered, sinhTerm);
    return scaleMatrix(addMatrices(scaleMatrix(I, coshTerm), second), expTerm);
  }
  const delta = Math.sqrt(-deltaSquared);
  const expTerm = Math.exp(halfTrace * t);
  const cosTerm = Math.cos(delta * t);
  const sinTerm = Math.sin(delta * t) / delta;
  const second = scaleMatrix(centered, sinTerm);
  return scaleMatrix(addMatrices(scaleMatrix(I, cosTerm), second), expTerm);
};

export const buildStateSpace = (
  vehicle: VehicleParams,
  speed: number
): StateSpace => {
  const coeffs = deriveLinearBicycleCoeffs(vehicle, speed);
  const A: Matrix2 = [
    [coeffs.a11, coeffs.a12],
    [coeffs.a21, coeffs.a22],
  ];
  const B: Vector2 = [coeffs.b1, coeffs.b2];
  return { A, B, coeffs };
};
