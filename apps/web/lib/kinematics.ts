// Scene units are metres to match the physics model.
export interface PhysicsState {
  x: number;
  z: number;
  psi: number;
  phi: number;
  hRide: number;
  wheelbase: number;
  a: number;
  b: number;
  trackF: number;
  trackR: number;
  wheelRadius: number;
  steer: number;
  groundY: number;
}

export type WheelId = "frontLeft" | "frontRight" | "rearLeft" | "rearRight";

export type Vector3Tuple = [number, number, number];

export interface KinematicsResult {
  body: {
    position: Vector3Tuple;
    yaw: number;
    roll: number;
  };
  wheels: Record<WheelId, Vector3Tuple>;
  contactPatchY: number;
  steer: number;
  wheelRadius: number;
  groundY: number;
}

const CONTACT_PATCH_OFFSET = 0.001;

export function deriveKinematics(state: PhysicsState): KinematicsResult {
  const cosPsi = Math.cos(state.psi);
  const sinPsi = Math.sin(state.psi);
  const halfTrackFront = state.trackF * 0.5;
  const halfTrackRear = state.trackR * 0.5;

  const localWheelLayout: Record<WheelId, Vector3Tuple> = {
    frontLeft: [-halfTrackFront, state.wheelRadius, state.a],
    frontRight: [halfTrackFront, state.wheelRadius, state.a],
    rearLeft: [-halfTrackRear, state.wheelRadius, -state.b],
    rearRight: [halfTrackRear, state.wheelRadius, -state.b]
  };

  const toWorld = ([localX, localY, localZ]: Vector3Tuple): Vector3Tuple => {
    const worldX = state.x + localX * cosPsi - localZ * sinPsi;
    const worldZ = state.z + localX * sinPsi + localZ * cosPsi;
    const worldY = state.groundY + localY;
    return [worldX, worldY, worldZ];
  };

  const wheels: Record<WheelId, Vector3Tuple> = {
    frontLeft: toWorld(localWheelLayout.frontLeft),
    frontRight: toWorld(localWheelLayout.frontRight),
    rearLeft: toWorld(localWheelLayout.rearLeft),
    rearRight: toWorld(localWheelLayout.rearRight)
  };

  return {
    body: {
      position: [state.x, state.groundY + state.wheelRadius + state.hRide, state.z],
      yaw: state.psi,
      roll: state.phi
    },
    wheels,
    contactPatchY: state.groundY + CONTACT_PATCH_OFFSET,
    steer: state.steer,
    wheelRadius: state.wheelRadius,
    groundY: state.groundY
  };
}
