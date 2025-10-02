export type SlipAngles = {
  front: number;
  rear: number;
};

export type LateralForces = {
  front: number;
  rear: number;
};

export type SlipInputs = {
  vy: number;
  r: number;
  vx: number;
  a: number;
  b: number;
  steer: number;
  vxFloor?: number;
};

export function computeSlipAngles(inputs: SlipInputs): SlipAngles {
  const floorValue = inputs.vxFloor ?? 0.5;
  const vxSafe = Math.sign(inputs.vx || 1) * Math.max(Math.abs(inputs.vx), floorValue);
  const alphaFront = inputs.steer - (inputs.vy + inputs.a * inputs.r) / vxSafe;
  const alphaRear = -((inputs.vy - inputs.b * inputs.r) / vxSafe);
  return { front: alphaFront, rear: alphaRear };
}

export function computeLateralForces(
  angles: SlipAngles,
  stiffness: { Cf: number; Cr: number }
): LateralForces {
  const FyFront = -stiffness.Cf * angles.front;
  const FyRear = -stiffness.Cr * angles.rear;
  return { front: FyFront, rear: FyRear };
}

export function computeSlipAndForces(
  inputs: SlipInputs,
  stiffness: { Cf: number; Cr: number }
): { angles: SlipAngles; forces: LateralForces; vxEffective: number } {
  const floorValue = inputs.vxFloor ?? 0.5;
  const vxSafe = Math.sign(inputs.vx || 1) * Math.max(Math.abs(inputs.vx), floorValue);
  const angles = computeSlipAngles({ ...inputs, vx: vxSafe });
  const forces = computeLateralForces(angles, stiffness);
  return { angles, forces, vxEffective: vxSafe };
}
