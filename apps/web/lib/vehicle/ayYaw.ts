export function computeAy(vx: number, yawRate: number, lateralVelocityDot: number): number {
  return vx * yawRate + lateralVelocityDot;
}

export function finiteDifference(valueNext: number, valuePrev: number, dt: number): number {
  const dtSafe = Math.max(dt, 1e-6);
  return (valueNext - valuePrev) / dtSafe;
}

export function computeAyFromStates(
  previous: { vy: number; r: number },
  next: { vy: number; r: number },
  dt: number,
  vx: number
): number {
  const vyDot = finiteDifference(next.vy, previous.vy, dt);
  return computeAy(vx, next.r, vyDot);
}
